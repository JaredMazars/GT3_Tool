import {
  BlobServiceClient,
  StorageSharedKeyCredential,
  generateBlobSASQueryParameters,
  BlobSASPermissions,
} from '@azure/storage-blob';
import { logger } from '../../utils/logger';

const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
const containerName =
  process.env.AZURE_STORAGE_CONTAINER_NAME || 'adjustment-documents';

/**
 * Get Blob Service Client
 */
function getBlobServiceClient(): BlobServiceClient {
  if (!connectionString) {
    throw new Error('AZURE_STORAGE_CONNECTION_STRING is not configured');
  }

  return BlobServiceClient.fromConnectionString(connectionString);
}

/**
 * Get Container Client
 */
function getContainerClient() {
  const blobServiceClient = getBlobServiceClient();
  return blobServiceClient.getContainerClient(containerName);
}

/**
 * Initialize blob storage container
 * Creates container if it doesn't exist
 */
export async function initBlobStorage(): Promise<void> {
  try {
    const containerClient = getContainerClient();
    const exists = await containerClient.exists();

    if (!exists) {
      await containerClient.create();
      logger.info(`Created blob container: ${containerName}`);
    }
  } catch (error) {
    logger.error('Failed to initialize blob storage:', error);
    throw error;
  }
}

/**
 * Upload file to Azure Blob Storage
 * @param buffer - File buffer
 * @param fileName - File name
 * @param projectId - Project ID for folder organization
 * @returns Blob URL
 */
export async function uploadFile(
  buffer: Buffer,
  fileName: string,
  projectId: number
): Promise<string> {
  try {
    const containerClient = getContainerClient();
    const timestamp = Date.now();
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const blobName = `${projectId}/${timestamp}_${sanitizedFileName}`;

    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    // Determine content type based on file extension
    const contentType = getContentType(fileName);

    await blockBlobClient.upload(buffer, buffer.length, {
      blobHTTPHeaders: {
        blobContentType: contentType,
      },
    });

    logger.info(`Uploaded file to blob storage: ${blobName}`);
    return blobName;
  } catch (error) {
    logger.error('Failed to upload file to blob storage:', error);
    throw error;
  }
}

/**
 * Download file from Azure Blob Storage
 * @param blobName - Blob name/path
 * @returns File buffer
 */
export async function downloadFile(blobName: string): Promise<Buffer> {
  try {
    const containerClient = getContainerClient();
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    const downloadResponse = await blockBlobClient.download();
    const downloaded = await streamToBuffer(
      downloadResponse.readableStreamBody!
    );

    logger.info(`Downloaded file from blob storage: ${blobName}`);
    return downloaded;
  } catch (error) {
    logger.error('Failed to download file from blob storage:', error);
    throw error;
  }
}

/**
 * Delete file from Azure Blob Storage
 * @param blobName - Blob name/path
 */
export async function deleteFile(blobName: string): Promise<void> {
  try {
    const containerClient = getContainerClient();
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    await blockBlobClient.delete();
    logger.info(`Deleted file from blob storage: ${blobName}`);
  } catch (error) {
    logger.error('Failed to delete file from blob storage:', error);
    throw error;
  }
}

/**
 * Generate a SAS token URL for secure file access
 * @param blobName - Blob name/path
 * @param expiresInMinutes - Token expiration in minutes (default: 60)
 * @returns SAS URL
 */
export async function generateSasUrl(
  blobName: string,
  expiresInMinutes: number = 60
): Promise<string> {
  try {
    const containerClient = getContainerClient();
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    // Parse connection string to get account name and key
    const parts = connectionString!.split(';');
    const accountName = parts
      .find((p) => p.startsWith('AccountName='))
      ?.split('=')[1];
    const accountKey = parts
      .find((p) => p.startsWith('AccountKey='))
      ?.split('=')[1];

    if (!accountName || !accountKey) {
      throw new Error('Invalid connection string format');
    }

    const sharedKeyCredential = new StorageSharedKeyCredential(
      accountName,
      accountKey
    );

    const startsOn = new Date();
    const expiresOn = new Date(startsOn.getTime() + expiresInMinutes * 60000);

    const sasToken = generateBlobSASQueryParameters(
      {
        containerName,
        blobName,
        permissions: BlobSASPermissions.parse('r'), // Read permission
        startsOn,
        expiresOn,
      },
      sharedKeyCredential
    ).toString();

    const sasUrl = `${blockBlobClient.url}?${sasToken}`;
    return sasUrl;
  } catch (error) {
    logger.error('Failed to generate SAS URL:', error);
    throw error;
  }
}

/**
 * Check if file exists in blob storage
 * @param blobName - Blob name/path
 * @returns True if exists
 */
export async function fileExists(blobName: string): Promise<boolean> {
  try {
    const containerClient = getContainerClient();
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    return await blockBlobClient.exists();
  } catch (error) {
    logger.error('Failed to check file existence:', error);
    return false;
  }
}

/**
 * List all files in a project folder
 * @param projectId - Project ID
 * @returns Array of blob names
 */
export async function listProjectFiles(projectId: number): Promise<string[]> {
  try {
    const containerClient = getContainerClient();
    const prefix = `${projectId}/`;
    const files: string[] = [];

    for await (const blob of containerClient.listBlobsFlat({ prefix })) {
      files.push(blob.name);
    }

    return files;
  } catch (error) {
    logger.error('Failed to list project files:', error);
    throw error;
  }
}

/**
 * Helper: Convert stream to buffer
 */
async function streamToBuffer(
  readableStream: NodeJS.ReadableStream
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    readableStream.on('data', (data: Buffer) => {
      chunks.push(data);
    });
    readableStream.on('end', () => {
      resolve(Buffer.concat(chunks));
    });
    readableStream.on('error', reject);
  });
}

/**
 * Helper: Get content type based on file extension
 */
function getContentType(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase();

  const contentTypes: Record<string, string> = {
    pdf: 'application/pdf',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    xls: 'application/vnd.ms-excel',
    csv: 'text/csv',
    txt: 'text/plain',
    json: 'application/json',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
  };

  return contentTypes[ext || ''] || 'application/octet-stream';
}

/**
 * Check if Azure Blob Storage is configured
 */
export function isBlobStorageConfigured(): boolean {
  return !!connectionString;
}



