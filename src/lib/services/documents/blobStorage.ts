import {
  BlobServiceClient,
  StorageSharedKeyCredential,
  generateBlobSASQueryParameters,
  BlobSASPermissions,
} from '@azure/storage-blob';
import { logger } from '../../utils/logger';

const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;

// Container names - each document type has its own dedicated container
const engagementLettersContainerName = 'engagement-letters';
const dpaContainerName = 'dpa';
const acceptanceDocumentsContainerName = 'acceptance-documents';
const reviewNotesContainerName = 'review-notes';
const newsBulletinsContainerName = 'news-bulletins';
const documentVaultContainerName = 'document-vault';
const bugReportsContainerName = 'bug-reports';

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
 * Get Engagement Letters Container Client
 */
function getEngagementLettersContainerClient() {
  const blobServiceClient = getBlobServiceClient();
  return blobServiceClient.getContainerClient(engagementLettersContainerName);
}

/**
 * Get DPA Container Client
 */
function getDpaContainerClient() {
  const blobServiceClient = getBlobServiceClient();
  return blobServiceClient.getContainerClient(dpaContainerName);
}

/**
 * Get Acceptance Documents Container Client
 */
function getAcceptanceDocumentsContainerClient() {
  const blobServiceClient = getBlobServiceClient();
  return blobServiceClient.getContainerClient(acceptanceDocumentsContainerName);
}

/**
 * Get Review Notes Container Client
 */
function getReviewNotesContainerClient() {
  const blobServiceClient = getBlobServiceClient();
  return blobServiceClient.getContainerClient(reviewNotesContainerName);
}

/**
 * Get Container Client (legacy - for backward compatibility)
 * @deprecated Use purpose-specific container clients instead
 */
function getContainerClient() {
  const blobServiceClient = getBlobServiceClient();
  return blobServiceClient.getContainerClient(acceptanceDocumentsContainerName);
}

/**
 * Initialize engagement letters blob storage container
 * Creates container if it doesn't exist
 */
export async function initEngagementLettersStorage(): Promise<void> {
  try {
    const containerClient = getEngagementLettersContainerClient();
    const createResponse = await containerClient.createIfNotExists();
    
    if (createResponse.succeeded) {
      logger.info(`Created blob container: ${engagementLettersContainerName}`);
    } else {
      logger.debug(`Blob container already exists: ${engagementLettersContainerName}`);
    }
  } catch (error) {
    logger.error('Failed to initialize engagement letters blob storage:', error);
    throw error;
  }
}

/**
 * Initialize DPA blob storage container
 * Creates container if it doesn't exist
 */
export async function initDpaStorage(): Promise<void> {
  try {
    const containerClient = getDpaContainerClient();
    const createResponse = await containerClient.createIfNotExists();
    
    if (createResponse.succeeded) {
      logger.info(`Created blob container: ${dpaContainerName}`);
    } else {
      logger.debug(`Blob container already exists: ${dpaContainerName}`);
    }
  } catch (error) {
    logger.error('Failed to initialize DPA blob storage:', error);
    throw error;
  }
}

/**
 * Initialize acceptance documents blob storage container
 * Creates container if it doesn't exist
 */
export async function initAcceptanceDocumentsStorage(): Promise<void> {
  try {
    const containerClient = getAcceptanceDocumentsContainerClient();
    const createResponse = await containerClient.createIfNotExists();
    
    if (createResponse.succeeded) {
      logger.info(`Created blob container: ${acceptanceDocumentsContainerName}`);
    } else {
      logger.debug(`Blob container already exists: ${acceptanceDocumentsContainerName}`);
    }
  } catch (error) {
    logger.error('Failed to initialize acceptance documents blob storage:', error);
    throw error;
  }
}

/**
 * Initialize review notes blob storage container
 * Creates container if it doesn't exist
 */
export async function initReviewNotesStorage(): Promise<void> {
  try {
    const containerClient = getReviewNotesContainerClient();
    const createResponse = await containerClient.createIfNotExists();
    
    if (createResponse.succeeded) {
      logger.info(`Created blob container: ${reviewNotesContainerName}`);
    } else {
      logger.debug(`Blob container already exists: ${reviewNotesContainerName}`);
    }
  } catch (error) {
    logger.error('Failed to initialize review notes blob storage:', error);
    throw error;
  }
}

/**
 * Initialize blob storage container (legacy - for backward compatibility)
 * @deprecated Use purpose-specific init functions instead
 */
export async function initBlobStorage(): Promise<void> {
  try {
    const containerClient = getContainerClient();
    const createResponse = await containerClient.createIfNotExists();
    
    if (createResponse.succeeded) {
      logger.info(`Created blob container: ${acceptanceDocumentsContainerName}`);
    } else {
      logger.debug(`Blob container already exists: ${acceptanceDocumentsContainerName}`);
    }
  } catch (error) {
    logger.error('Failed to initialize blob storage:', error);
    throw error;
  }
}

/**
 * Upload file to Azure Blob Storage (A&C documents)
 * @param buffer - File buffer
 * @param fileName - File name
 * @param taskId - Task ID for folder organization
 * @returns Blob URL
 */
export async function uploadFile(
  buffer: Buffer,
  fileName: string,
  taskId: number
): Promise<string> {
  try {
    // Ensure container exists
    await initAcceptanceDocumentsStorage();
    
    const containerClient = getAcceptanceDocumentsContainerClient();
    const timestamp = Date.now();
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const blobName = `${taskId}/${timestamp}_${sanitizedFileName}`;

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
 * Download file from Azure Blob Storage (A&C documents)
 * @param blobName - Blob name/path
 * @returns File buffer
 */
export async function downloadFile(blobName: string): Promise<Buffer> {
  try {
    const containerClient = getAcceptanceDocumentsContainerClient();
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
 * Delete file from Azure Blob Storage (A&C documents)
 * @param blobName - Blob name/path
 */
export async function deleteFile(blobName: string): Promise<void> {
  try {
    const containerClient = getAcceptanceDocumentsContainerClient();
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    await blockBlobClient.delete();
    logger.info(`Deleted file from blob storage: ${blobName}`);
  } catch (error) {
    logger.error('Failed to delete file from blob storage:', error);
    throw error;
  }
}

/**
 * Generate a SAS token URL for secure file access (A&C documents)
 * @param blobName - Blob name/path
 * @param expiresInMinutes - Token expiration in minutes (default: 60)
 * @returns SAS URL
 */
export async function generateSasUrl(
  blobName: string,
  expiresInMinutes: number = 60
): Promise<string> {
  try {
    const containerClient = getAcceptanceDocumentsContainerClient();
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
        containerName: acceptanceDocumentsContainerName,
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
 * Check if file exists in blob storage (A&C documents)
 * @param blobName - Blob name/path
 * @returns True if exists
 */
export async function fileExists(blobName: string): Promise<boolean> {
  try {
    const containerClient = getAcceptanceDocumentsContainerClient();
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    return await blockBlobClient.exists();
  } catch (error) {
    logger.error('Failed to check file existence:', error);
    return false;
  }
}

/**
 * List all files in a task folder (A&C documents)
 * @param taskId - Task ID
 * @returns Array of blob names
 */
export async function listTaskFiles(taskId: number): Promise<string[]> {
  try {
    const containerClient = getAcceptanceDocumentsContainerClient();
    const prefix = `${taskId}/`;
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

/**
 * Get News Bulletins Container Client
 */
function getNewsBulletinsContainerClient() {
  const blobServiceClient = getBlobServiceClient();
  return blobServiceClient.getContainerClient(newsBulletinsContainerName);
}

/**
 * Initialize news bulletins blob storage container
 * Creates container if it doesn't exist
 */
export async function initNewsBulletinsStorage(): Promise<void> {
  try {
    const containerClient = getNewsBulletinsContainerClient();
    const createResponse = await containerClient.createIfNotExists();
    
    if (createResponse.succeeded) {
      logger.info(`Created blob container: ${newsBulletinsContainerName}`);
    } else {
      logger.debug(`Blob container already exists: ${newsBulletinsContainerName}`);
    }
  } catch (error) {
    logger.error('Failed to initialize news bulletins blob storage:', error);
    throw error;
  }
}

/**
 * Get Document Vault Container Client
 */
function getDocumentVaultContainerClient() {
  const blobServiceClient = getBlobServiceClient();
  return blobServiceClient.getContainerClient(documentVaultContainerName);
}

/**
 * Initialize document vault blob storage container
 * Creates container if it doesn't exist
 */
export async function initDocumentVaultStorage(): Promise<void> {
  try {
    const containerClient = getDocumentVaultContainerClient();
    const createResponse = await containerClient.createIfNotExists();
    
    if (createResponse.succeeded) {
      logger.info(`Created blob container: ${documentVaultContainerName}`);
    } else {
      logger.debug(`Blob container already exists: ${documentVaultContainerName}`);
    }
  } catch (error) {
    logger.error('Failed to initialize document vault blob storage:', error);
    throw error;
  }
}

/**
 * Upload news bulletin document to Azure Blob Storage
 * @param buffer - File buffer
 * @param fileName - File name
 * @param bulletinId - Bulletin ID for folder organization
 * @returns Blob URL
 */
export async function uploadNewsBulletinDocument(
  buffer: Buffer,
  fileName: string,
  bulletinId?: number
): Promise<string> {
  try {
    // Ensure container exists (create if needed)
    await initNewsBulletinsStorage();
    
    const containerClient = getNewsBulletinsContainerClient();
    const timestamp = Date.now();
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const blobName = bulletinId 
      ? `${bulletinId}/${timestamp}_${sanitizedFileName}`
      : `temp/${timestamp}_${sanitizedFileName}`;

    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    // Determine content type based on file extension
    const contentType = getContentType(fileName);

    await blockBlobClient.upload(buffer, buffer.length, {
      blobHTTPHeaders: {
        blobContentType: contentType,
      },
    });

    logger.info(`Uploaded news bulletin document to blob storage: ${blobName}`);
    return blobName;
  } catch (error) {
    logger.error('Failed to upload news bulletin document to blob storage:', error);
    throw error;
  }
}

/**
 * Download news bulletin document from Azure Blob Storage
 * @param blobName - Blob name/path
 * @returns File buffer
 */
export async function downloadNewsBulletinDocument(blobName: string): Promise<Buffer> {
  try {
    const containerClient = getNewsBulletinsContainerClient();
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    const downloadResponse = await blockBlobClient.download();
    const downloaded = await streamToBuffer(
      downloadResponse.readableStreamBody!
    );

    logger.info(`Downloaded news bulletin document from blob storage: ${blobName}`);
    return downloaded;
  } catch (error) {
    logger.error('Failed to download news bulletin document from blob storage:', error);
    throw error;
  }
}

/**
 * Delete news bulletin document from Azure Blob Storage
 * @param blobName - Blob name/path
 */
export async function deleteNewsBulletinDocument(blobName: string): Promise<void> {
  try {
    const containerClient = getNewsBulletinsContainerClient();
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    await blockBlobClient.delete();
    logger.info(`Deleted news bulletin document from blob storage: ${blobName}`);
  } catch (error) {
    logger.error('Failed to delete news bulletin document from blob storage:', error);
    throw error;
  }
}

/**
 * Generate a SAS token URL for secure news bulletin document access
 * @param blobName - Blob name/path
 * @param expiresInMinutes - Token expiration in minutes (default: 60)
 * @returns SAS URL
 */
export async function generateNewsBulletinDocumentSasUrl(
  blobName: string,
  expiresInMinutes: number = 60
): Promise<string> {
  try {
    const containerClient = getNewsBulletinsContainerClient();
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
        containerName: newsBulletinsContainerName,
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
    logger.error('Failed to generate SAS URL for news bulletin document:', error);
    throw error;
  }
}

/**
 * Upload review note attachment to Azure Blob Storage
 * @param buffer - File buffer
 * @param fileName - File name
 * @param reviewNoteId - Review note ID for folder organization
 * @returns Blob path
 */
export async function uploadReviewNoteAttachment(
  buffer: Buffer,
  fileName: string,
  reviewNoteId: number
): Promise<string> {
  try {
    // Ensure container exists
    await initReviewNotesStorage();
    
    const containerClient = getReviewNotesContainerClient();
    const timestamp = Date.now();
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const blobName = `${reviewNoteId}/${timestamp}_${sanitizedFileName}`;

    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    // Determine content type based on file extension
    const contentType = getContentType(fileName);

    await blockBlobClient.upload(buffer, buffer.length, {
      blobHTTPHeaders: {
        blobContentType: contentType,
      },
    });

    logger.info(`Uploaded review note attachment to blob storage: ${blobName}`);
    return blobName;
  } catch (error) {
    logger.error('Failed to upload review note attachment to blob storage:', error);
    throw error;
  }
}

/**
 * Download review note attachment from Azure Blob Storage
 * @param blobName - Blob name/path
 * @returns File buffer
 */
export async function downloadReviewNoteAttachment(blobName: string): Promise<Buffer> {
  try {
    const containerClient = getReviewNotesContainerClient();
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    const downloadResponse = await blockBlobClient.download();
    const downloaded = await streamToBuffer(
      downloadResponse.readableStreamBody!
    );

    logger.info(`Downloaded review note attachment from blob storage: ${blobName}`);
    return downloaded;
  } catch (error) {
    logger.error('Failed to download review note attachment from blob storage:', error);
    throw error;
  }
}

/**
 * Delete review note attachment from Azure Blob Storage
 * @param blobName - Blob name/path
 */
export async function deleteReviewNoteAttachment(blobName: string): Promise<void> {
  try {
    const containerClient = getReviewNotesContainerClient();
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    await blockBlobClient.delete();
    logger.info(`Deleted review note attachment from blob storage: ${blobName}`);
  } catch (error) {
    logger.error('Failed to delete review note attachment from blob storage:', error);
    throw error;
  }
}

/**
 * Check if review note attachment exists in blob storage
 * @param blobName - Blob name/path
 * @returns True if exists
 */
export async function reviewNoteAttachmentExists(blobName: string): Promise<boolean> {
  try {
    const containerClient = getReviewNotesContainerClient();
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    return await blockBlobClient.exists();
  } catch (error) {
    logger.error('Failed to check review note attachment existence:', error);
    return false;
  }
}

/**
 * Upload engagement letter to Azure Blob Storage
 * @param buffer - File buffer
 * @param fileName - File name
 * @param taskId - Task ID for folder organization
 * @returns Blob path
 */
export async function uploadEngagementLetter(
  buffer: Buffer,
  fileName: string,
  taskId: number
): Promise<string> {
  try {
    // Ensure container exists
    await initEngagementLettersStorage();
    
    const containerClient = getEngagementLettersContainerClient();
    const timestamp = Date.now();
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const blobName = `${taskId}/${timestamp}_${sanitizedFileName}`;

    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    // Determine content type based on file extension
    const contentType = getContentType(fileName);

    await blockBlobClient.upload(buffer, buffer.length, {
      blobHTTPHeaders: {
        blobContentType: contentType,
      },
    });

    logger.info(`Uploaded engagement letter to blob storage: ${blobName}`);
    return blobName;
  } catch (error) {
    logger.error('Failed to upload engagement letter to blob storage:', error);
    throw error;
  }
}/**
 * Download engagement letter from Azure Blob Storage
 * @param blobName - Blob name/path
 * @returns File buffer
 */
export async function downloadEngagementLetter(blobName: string): Promise<Buffer> {
  try {
    const containerClient = getEngagementLettersContainerClient();
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);    const downloadResponse = await blockBlobClient.download();
    const downloaded = await streamToBuffer(
      downloadResponse.readableStreamBody!
    );

    logger.info(`Downloaded engagement letter from blob storage: ${blobName}`);
    return downloaded;
  } catch (error) {
    logger.error('Failed to download engagement letter from blob storage:', error);
    throw error;
  }
}

/**
 * Delete engagement letter from Azure Blob Storage
 * @param blobName - Blob name/path
 */
export async function deleteEngagementLetter(blobName: string): Promise<void> {
  try {
    const containerClient = getEngagementLettersContainerClient();
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    await blockBlobClient.delete();
    logger.info(`Deleted engagement letter from blob storage: ${blobName}`);
  } catch (error) {
    logger.error('Failed to delete engagement letter from blob storage:', error);
    throw error;
  }
}

/**
 * Generate a SAS token URL for secure engagement letter access
 * @param blobName - Blob name/path
 * @param expiresInMinutes - Token expiration in minutes (default: 60)
 * @returns SAS URL
 */
export async function generateEngagementLetterSasUrl(
  blobName: string,
  expiresInMinutes: number = 60
): Promise<string> {
  try {
    const containerClient = getEngagementLettersContainerClient();
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
        containerName: engagementLettersContainerName,
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
    logger.error('Failed to generate SAS URL for engagement letter:', error);
    throw error;
  }
}

/**
 * Upload DPA (Data Processing Agreement) to Azure Blob Storage
 * @param buffer - File buffer
 * @param fileName - File name
 * @param taskId - Task ID for folder organization
 * @returns Blob path
 */
export async function uploadDpa(
  buffer: Buffer,
  fileName: string,
  taskId: number
): Promise<string> {
  try {
    // Ensure container exists
    await initDpaStorage();
    
    const containerClient = getDpaContainerClient();
    const timestamp = Date.now();
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const blobName = `${taskId}/${timestamp}_${sanitizedFileName}`;

    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    // Determine content type based on file extension
    const contentType = getContentType(fileName);

    await blockBlobClient.upload(buffer, buffer.length, {
      blobHTTPHeaders: {
        blobContentType: contentType,
      },
    });

    logger.info(`Uploaded DPA to blob storage: ${blobName}`);
    return blobName;
  } catch (error) {
    logger.error('Failed to upload DPA to blob storage:', error);
    throw error;
  }
}

/**
 * Download DPA from Azure Blob Storage
 * @param blobName - Blob name/path
 * @returns File buffer
 */
export async function downloadDpa(blobName: string): Promise<Buffer> {
  try {
    const containerClient = getDpaContainerClient();
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    const downloadResponse = await blockBlobClient.download();
    const downloaded = await streamToBuffer(
      downloadResponse.readableStreamBody!
    );

    logger.info(`Downloaded DPA from blob storage: ${blobName}`);
    return downloaded;
  } catch (error) {
    logger.error('Failed to download DPA from blob storage:', error);
    throw error;
  }
}

/**
 * Delete DPA from Azure Blob Storage
 * @param blobName - Blob name/path
 */
export async function deleteDpa(blobName: string): Promise<void> {
  try {
    const containerClient = getDpaContainerClient();
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    await blockBlobClient.delete();
    logger.info(`Deleted DPA from blob storage: ${blobName}`);
  } catch (error) {
    logger.error('Failed to delete DPA from blob storage:', error);
    throw error;
  }
}

/**
 * Generate a SAS token URL for secure DPA access
 * @param blobName - Blob name/path
 * @param expiresInMinutes - Token expiration in minutes (default: 60)
 * @returns SAS URL
 */
export async function generateDpaSasUrl(
  blobName: string,
  expiresInMinutes: number = 60
): Promise<string> {
  try {
    const containerClient = getDpaContainerClient();
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
        containerName: dpaContainerName,
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
    logger.error('Failed to generate SAS URL for DPA:', error);
    throw error;
  }
}

// =====================================================
// Document Vault Functions
// =====================================================

/**
 * Upload vault document to Azure Blob Storage
 * @param buffer - File buffer
 * @param fileName - Original file name
 * @param documentId - Document ID
 * @param version - Document version
 * @returns Blob path
 */
export async function uploadVaultDocument(
  buffer: Buffer,
  fileName: string,
  documentId: number,
  version: number,
  scope: string,
  documentType: string,
  categoryName: string
): Promise<string> {
  try {
    const containerClient = getDocumentVaultContainerClient();
    
    // Sanitize components for path
    const sanitizedCategory = categoryName.replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-');
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const scopePath = scope === 'GLOBAL' ? 'global' : scope;
    const timestamp = Date.now();
    
    // Build hierarchical path: vault/{scope}/{documentType}/{category}/{documentId}/v{version}_{timestamp}_{filename}
    const blobName = `vault/${scopePath}/${documentType}/${sanitizedCategory}/${documentId}/v${version}_${timestamp}_${sanitizedFileName}`;
    
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    // Upload file
    await blockBlobClient.uploadData(buffer, {
      blobHTTPHeaders: {
        blobContentType: getContentType(fileName),
      },
      metadata: {
        documentId: documentId.toString(),
        version: version.toString(),
        scope,
        documentType,
        categoryName,
      },
    });

    logger.info(`Uploaded vault document to blob storage: ${blobName}`);
    return blobName;
  } catch (error) {
    logger.error('Failed to upload vault document to blob storage:', error);
    throw error;
  }
}

/**
 * Upload vault document to temporary location for preview/extraction
 * Used during AI extraction workflow before final submission
 * @param buffer - File buffer
 * @param fileName - Original filename
 * @param userId - User ID for organizing temp files
 * @returns Temporary blob path
 */
export async function uploadVaultDocumentTemp(
  buffer: Buffer,
  fileName: string,
  userId: string
): Promise<string> {
  try {
    const containerClient = getDocumentVaultContainerClient();
    
    // Sanitize filename
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const timestamp = Date.now();
    
    // Use vault/temp prefix for consistency
    const blobName = `vault/temp/${userId}/${timestamp}_${sanitizedFileName}`;
    
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    // Upload file
    await blockBlobClient.uploadData(buffer, {
      blobHTTPHeaders: {
        blobContentType: getContentType(fileName),
      },
      metadata: {
        tempUpload: 'true',
        uploadedAt: new Date().toISOString(),
        userId,
      },
    });

    logger.info(`Uploaded vault document to temp storage: ${blobName}`);
    return blobName;
  } catch (error) {
    logger.error('Failed to upload vault document to temp storage:', error);
    throw error;
  }
}

/**
 * Move vault document from temporary location to permanent location
 * Used after user submits form with AI-extracted data
 * @param tempBlobName - Temporary blob path
 * @param documentId - Document ID for permanent location
 * @param version - Document version
 * @param scope - Document scope (GLOBAL or service line code)
 * @param documentType - Document type code
 * @param categoryName - Category name
 * @returns Permanent blob path
 */
export async function moveVaultDocumentFromTemp(
  tempBlobName: string,
  documentId: number,
  version: number,
  scope: string,
  documentType: string,
  categoryName: string
): Promise<string> {
  try {
    const containerClient = getDocumentVaultContainerClient();
    
    // Extract original filename from temp path
    const tempParts = tempBlobName.split('/');
    const tempFileName = tempParts[tempParts.length - 1];
    if (!tempFileName) {
      throw new Error('Invalid temp blob name: could not extract filename');
    }
    // Remove timestamp prefix from filename
    const fileName = tempFileName.substring(tempFileName.indexOf('_') + 1);
    
    // Sanitize components
    const sanitizedCategory = categoryName.replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-');
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const scopePath = scope === 'GLOBAL' ? 'global' : scope;
    const timestamp = Date.now();
    
    // Build hierarchical permanent path
    const permanentBlobName = `vault/${scopePath}/${documentType}/${sanitizedCategory}/${documentId}/v${version}_${timestamp}_${sanitizedFileName}`;
    
    const sourceClient = containerClient.getBlockBlobClient(tempBlobName);
    const destClient = containerClient.getBlockBlobClient(permanentBlobName);
    
    // Copy blob to permanent location
    const copyPoller = await destClient.beginCopyFromURL(sourceClient.url);
    await copyPoller.pollUntilDone();
    
    // Add metadata to permanent blob
    await destClient.setMetadata({
      documentId: documentId.toString(),
      version: version.toString(),
      scope,
      documentType,
      categoryName,
    });
    
    // Delete temporary blob
    await sourceClient.delete();
    
    logger.info(`Moved vault document from temp to permanent: ${tempBlobName} -> ${permanentBlobName}`);
    return permanentBlobName;
  } catch (error) {
    logger.error('Failed to move vault document from temp storage:', error);
    throw error;
  }
}

/**
 * Delete temporary vault document
 * Used for cleanup when user cancels upload or extraction fails
 * @param tempBlobName - Temporary blob path
 */
export async function deleteVaultDocumentTemp(tempBlobName: string): Promise<void> {
  try {
    const containerClient = getDocumentVaultContainerClient();
    const blockBlobClient = containerClient.getBlockBlobClient(tempBlobName);
    
    await blockBlobClient.delete();
    logger.info(`Deleted temp vault document: ${tempBlobName}`);
  } catch (error) {
    logger.error('Failed to delete temp vault document:', error);
    // Don't throw - temp file cleanup failure shouldn't block operations
  }
}

/**
 * Download vault document from Azure Blob Storage
 * @param blobName - Blob name/path
 * @returns File buffer
 */
export async function downloadVaultDocument(blobName: string): Promise<Buffer> {
  try {
    const containerClient = getDocumentVaultContainerClient();
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    const downloadResponse = await blockBlobClient.download();
    const downloaded = await streamToBuffer(
      downloadResponse.readableStreamBody!
    );

    logger.info(`Downloaded vault document from blob storage: ${blobName}`);
    return downloaded;
  } catch (error) {
    logger.error('Failed to download vault document from blob storage:', error);
    throw error;
  }
}

/**
 * Generate a SAS token URL for secure vault document access
 * @param blobName - Blob name/path
 * @param expiresInMinutes - Token expiration in minutes (default: 60)
 * @returns SAS URL
 */
export async function generateVaultDocumentSasUrl(
  blobName: string,
  expiresInMinutes: number = 60
): Promise<string> {
  try {
    const containerClient = getDocumentVaultContainerClient();
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
        containerName: documentVaultContainerName,
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
    logger.error('Failed to generate SAS URL for vault document:', error);
    throw error;
  }
}

/**
 * Delete vault document from Azure Blob Storage
 * @param blobName - Blob name/path
 */
export async function deleteVaultDocument(blobName: string): Promise<void> {
  try {
    const containerClient = getDocumentVaultContainerClient();
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    await blockBlobClient.delete();
    logger.info(`Deleted vault document from blob storage: ${blobName}`);
  } catch (error) {
    logger.error('Failed to delete vault document from blob storage:', error);
    throw error;
  }
}

// =====================================================
// Template Storage Functions
// =====================================================

const templatesContainerName = 'templates';

/**
 * Get Templates Container Client
 */
function getTemplatesContainerClient() {
  const blobServiceClient = getBlobServiceClient();
  return blobServiceClient.getContainerClient(templatesContainerName);
}

/**
 * Initialize templates blob storage container
 * Creates container if it doesn't exist
 */
export async function initTemplatesStorage(): Promise<void> {
  try {
    const containerClient = getTemplatesContainerClient();
    const createResponse = await containerClient.createIfNotExists();
    
    if (createResponse.succeeded) {
      logger.info(`Created blob container: ${templatesContainerName}`);
    } else {
      logger.debug(`Blob container already exists: ${templatesContainerName}`);
    }
  } catch (error) {
    logger.error('Failed to initialize templates blob storage:', error);
    throw error;
  }
}

/**
 * Upload template source document to temporary storage for AI extraction
 * Used during template creation workflow before user confirms
 * @param buffer - File buffer
 * @param fileName - Original filename
 * @param userId - User ID for isolation
 * @returns Temporary blob path
 */
export async function uploadTemplateTemp(
  buffer: Buffer,
  fileName: string,
  userId: string
): Promise<string> {
  try {
    const containerClient = getTemplatesContainerClient();
    
    // Sanitize filename
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const timestamp = Date.now();
    
    // Use temp prefix for temporary uploads
    const blobName = `temp/${userId}/${timestamp}_${sanitizedFileName}`;
    
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    // Upload file
    await blockBlobClient.uploadData(buffer, {
      blobHTTPHeaders: {
        blobContentType: getContentType(fileName),
      },
      metadata: {
        tempUpload: 'true',
        uploadedAt: new Date().toISOString(),
        userId,
      },
    });

    logger.info(`Uploaded template to temp storage: ${blobName}`);
    return blobName;
  } catch (error) {
    logger.error('Failed to upload template to temp storage:', error);
    throw error;
  }
}

/**
 * Move template from temporary location to permanent location
 * Used after user confirms template creation
 * @param tempBlobName - Temporary blob path
 * @param templateId - Template ID for permanent location
 * @returns Permanent blob path
 */
export async function moveTemplateFromTemp(
  tempBlobName: string,
  templateId: number
): Promise<string> {
  try {
    const containerClient = getTemplatesContainerClient();
    
    // Extract original filename from temp path
    const tempParts = tempBlobName.split('/');
    const tempFileName = tempParts[tempParts.length - 1];
    if (!tempFileName) {
      throw new Error('Invalid temp blob name: could not extract filename');
    }
    // Remove timestamp prefix from filename
    const fileName = tempFileName.substring(tempFileName.indexOf('_') + 1);
    
    // Sanitize filename
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const timestamp = Date.now();
    
    // Build permanent path: templates/{templateId}/original_{timestamp}_{filename}
    const permanentBlobName = `templates/${templateId}/original_${timestamp}_${sanitizedFileName}`;
    
    const sourceClient = containerClient.getBlockBlobClient(tempBlobName);
    const destClient = containerClient.getBlockBlobClient(permanentBlobName);
    
    // Copy blob to permanent location
    const copyPoller = await destClient.beginCopyFromURL(sourceClient.url);
    await copyPoller.pollUntilDone();
    
    // Add metadata to permanent blob
    await destClient.setMetadata({
      templateId: templateId.toString(),
      storedAt: new Date().toISOString(),
    });
    
    // Delete temporary blob
    await sourceClient.delete();
    
    logger.info(`Moved template from temp to permanent: ${tempBlobName} -> ${permanentBlobName}`);
    return permanentBlobName;
  } catch (error) {
    logger.error('Failed to move template from temp storage:', error);
    throw error;
  }
}

/**
 * Delete temporary template document
 * Used for cleanup when user cancels upload or extraction fails
 * @param tempBlobName - Temporary blob path
 */
export async function deleteTemplateTemp(tempBlobName: string): Promise<void> {
  try {
    const containerClient = getTemplatesContainerClient();
    const blockBlobClient = containerClient.getBlockBlobClient(tempBlobName);
    
    await blockBlobClient.delete();
    logger.info(`Deleted temp template: ${tempBlobName}`);
  } catch (error) {
    logger.error('Failed to delete temp template:', error);
    // Don't throw - temp file cleanup failure shouldn't block operations
  }
}

/**
 * Download template source document from Azure Blob Storage
 * @param blobName - Blob name/path
 * @returns File buffer
 */
export async function downloadTemplate(blobName: string): Promise<Buffer> {
  try {
    const containerClient = getTemplatesContainerClient();
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    const downloadResponse = await blockBlobClient.download();
    const downloaded = await streamToBuffer(
      downloadResponse.readableStreamBody!
    );

    logger.info(`Downloaded template from blob storage: ${blobName}`);
    return downloaded;
  } catch (error) {
    logger.error('Failed to download template from blob storage:', error);
    throw error;
  }
}

// =====================================================
// Bug Reports Functions
// =====================================================

/**
 * Get Bug Reports Container Client
 */
function getBugReportsContainerClient() {
  const blobServiceClient = getBlobServiceClient();
  return blobServiceClient.getContainerClient(bugReportsContainerName);
}

/**
 * Initialize bug reports blob storage container
 * Creates container if it doesn't exist
 */
export async function initBugReportsStorage(): Promise<void> {
  try {
    const containerClient = getBugReportsContainerClient();
    const createResponse = await containerClient.createIfNotExists();
    
    if (createResponse.succeeded) {
      logger.info(`Created blob container: ${bugReportsContainerName}`);
    } else {
      logger.debug(`Blob container already exists: ${bugReportsContainerName}`);
    }
  } catch (error) {
    logger.error('Failed to initialize bug reports blob storage:', error);
    throw error;
  }
}

/**
 * Upload bug report screenshot to Azure Blob Storage
 * @param buffer - File buffer
 * @param fileName - Original file name
 * @param userId - User ID for folder organization
 * @returns Blob path
 */
export async function uploadBugReportScreenshot(
  buffer: Buffer,
  fileName: string,
  userId: string
): Promise<string> {
  try {
    // Ensure container exists
    await initBugReportsStorage();
    
    const containerClient = getBugReportsContainerClient();
    const timestamp = Date.now();
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const blobName = `${userId}/${timestamp}_${sanitizedFileName}`;

    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    // Determine content type based on file extension
    const contentType = getContentType(fileName);

    await blockBlobClient.upload(buffer, buffer.length, {
      blobHTTPHeaders: {
        blobContentType: contentType,
      },
    });

    logger.info(`Uploaded bug report screenshot to blob storage: ${blobName}`);
    return blobName;
  } catch (error) {
    logger.error('Failed to upload bug report screenshot to blob storage:', error);
    throw error;
  }
}

/**
 * Download bug report screenshot from Azure Blob Storage
 * @param blobName - Blob name/path
 * @returns File buffer
 */
export async function downloadBugReportScreenshot(blobName: string): Promise<Buffer> {
  try {
    const containerClient = getBugReportsContainerClient();
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    const downloadResponse = await blockBlobClient.download();
    const downloaded = await streamToBuffer(
      downloadResponse.readableStreamBody!
    );

    logger.info(`Downloaded bug report screenshot from blob storage: ${blobName}`);
    return downloaded;
  } catch (error) {
    logger.error('Failed to download bug report screenshot from blob storage:', error);
    throw error;
  }
}

/**
 * Delete bug report screenshot from Azure Blob Storage
 * @param blobName - Blob name/path
 */
export async function deleteBugReportScreenshot(blobName: string): Promise<void> {
  try {
    const containerClient = getBugReportsContainerClient();
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    await blockBlobClient.delete();
    logger.info(`Deleted bug report screenshot from blob storage: ${blobName}`);
  } catch (error) {
    logger.error('Failed to delete bug report screenshot from blob storage:', error);
    throw error;
  }
}

/**
 * Generate a SAS token URL for secure bug report screenshot access
 * @param blobName - Blob name/path
 * @param expiresInMinutes - Token expiration in minutes (default: 60)
 * @returns SAS URL
 */
export async function generateBugReportScreenshotSasUrl(
  blobName: string,
  expiresInMinutes: number = 60
): Promise<string> {
  try {
    const containerClient = getBugReportsContainerClient();
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
        containerName: bugReportsContainerName,
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
    logger.error('Failed to generate SAS URL for bug report screenshot:', error);
    throw error;
  }
}