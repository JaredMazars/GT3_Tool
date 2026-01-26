import { Client } from '@microsoft/microsoft-graph-client';
import { ClientSecretCredential } from '@azure/identity';
import { TokenCredentialAuthenticationProvider } from '@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials';
import { logger } from '@/lib/utils/logger';

/**
 * Microsoft Graph Service for Workspace File Operations
 * Handles OneDrive for Business and SharePoint integration
 */

interface DriveItem {
  id: string;
  name: string;
  size: number;
  webUrl: string;
  createdDateTime: string;
  lastModifiedDateTime: string;
  createdBy?: {
    user?: {
      displayName: string;
      email: string;
    };
  };
  lastModifiedBy?: {
    user?: {
      displayName: string;
      email: string;
    };
  };
  file?: {
    mimeType: string;
  };
  folder?: {
    childCount: number;
  };
  '@microsoft.graph.downloadUrl'?: string;
}

interface UploadResult {
  driveId: string;
  itemId: string;
  webUrl: string;
  name: string;
  size: number;
}

interface ShareLinkResult {
  link: string;
  embedUrl?: string;
}

/**
 * Create Microsoft Graph client with app credentials
 */
function createGraphClient(): Client {
  const clientId = process.env.AZURE_AD_CLIENT_ID;
  const clientSecret = process.env.AZURE_AD_CLIENT_SECRET;
  const tenantId = process.env.AZURE_AD_TENANT_ID;

  if (!clientId || !clientSecret || !tenantId) {
    const missing = [
      !clientId && 'AZURE_AD_CLIENT_ID',
      !clientSecret && 'AZURE_AD_CLIENT_SECRET',
      !tenantId && 'AZURE_AD_TENANT_ID',
    ].filter(Boolean);
    
    throw new Error(
      `Azure AD credentials not configured. Missing: ${missing.join(', ')}. ` +
      'Please set these environment variables in your .env file.'
    );
  }

  // Check if values are not just empty strings
  if (clientId.trim() === '' || clientSecret.trim() === '' || tenantId.trim() === '') {
    throw new Error(
      'Azure AD credentials are set but empty. Please provide valid values in your .env file.'
    );
  }

  try {
    const credential = new ClientSecretCredential(
      tenantId,
      clientId,
      clientSecret
    );

    const authProvider = new TokenCredentialAuthenticationProvider(credential, {
      scopes: ['https://graph.microsoft.com/.default'],
    });

    return Client.initWithMiddleware({ authProvider });
  } catch (error: any) {
    logger.error('Failed to create Graph client', {
      error: error?.message || String(error),
      hasClientId: !!clientId,
      hasClientSecret: !!clientSecret,
      hasTenantId: !!tenantId,
    });
    throw new Error(
      'Failed to initialize Microsoft Graph client. ' +
      'Please verify your Azure AD credentials and ensure the app has the required permissions: ' +
      'Sites.ReadWrite.All or Files.ReadWrite.All'
    );
  }
}

/**
 * Get or create the application's root folder in SharePoint
 * This will be the workspace root for all files
 */
export async function getOrCreateWorkspaceRoot(): Promise<{ driveId: string; itemId: string }> {
  const client = createGraphClient();

  try {
    // Get the default SharePoint site
    const site = await client.api('/sites/root').get();
    
    // Get the default document library (drive) for the site
    const drives = await client.api(`/sites/${site.id}/drives`).get();
    
    if (!drives.value || drives.value.length === 0) {
      throw new Error('No document library found for the site');
    }
    
    // Use the first drive (usually the default document library)
    const driveId = drives.value[0].id;
    const rootItemId = drives.value[0].root?.id;

    if (!rootItemId) {
      throw new Error('Could not get root folder ID for the drive');
    }

    // Try to get existing workspace folder
    try {
      const folder = await client
        .api(`/drives/${driveId}/root:/Workspace`)
        .get();
      
      logger.info('Found existing workspace root folder', { driveId, folderId: folder.id });
      
      return {
        driveId,
        itemId: folder.id,
      };
    } catch (getError: any) {
      // Folder doesn't exist (404 is expected), create it
      // If it's not a 404, log the error but still try to create
      if (getError?.statusCode && getError.statusCode !== 404) {
        logger.warn('Unexpected error getting workspace folder, will attempt to create', {
          statusCode: getError.statusCode,
          message: getError.message,
        });
      }

      try {
        const newFolder = await client
          .api(`/drives/${driveId}/items/${rootItemId}/children`)
          .post({
            name: 'Workspace',
            folder: {},
            '@microsoft.graph.conflictBehavior': 'rename',
          });

        logger.info('Created workspace root folder', { driveId, folderId: newFolder.id });

        return {
          driveId,
          itemId: newFolder.id,
        };
      } catch (createError: any) {
        // If creation fails, log detailed error
        const createErrorDetails: Record<string, unknown> = {
          driveId,
          rootItemId,
          statusCode: createError?.statusCode,
          code: createError?.code,
          message: createError?.message,
        };
        
        if (createError?.body) {
          try {
            createErrorDetails.body = typeof createError.body === 'string' 
              ? JSON.parse(createError.body) 
              : createError.body;
          } catch {
            createErrorDetails.body = createError.body;
          }
        }
        
        logger.error('Failed to create workspace root folder', createErrorDetails);
        throw createError;
      }
    }
  } catch (error: any) {
    // Extract detailed error information
    const errorDetails: Record<string, unknown> = {};

    if (error) {
      if (error.statusCode) {
        errorDetails.statusCode = error.statusCode;
      }
      if (error.code) {
        errorDetails.code = error.code;
      }
      if (error.message) {
        errorDetails.message = error.message;
      }
      if (error.body) {
        try {
          errorDetails.body = typeof error.body === 'string' ? JSON.parse(error.body) : error.body;
        } catch {
          errorDetails.body = error.body;
        }
      }
      if (error.requestId) {
        errorDetails.requestId = error.requestId;
      }
      if (error.stack) {
        errorDetails.stack = error.stack;
      }
    }

    logger.error('Failed to get or create workspace root', errorDetails);
    
    const errorMessage = error?.message || error?.body?.message || 'Failed to initialize workspace storage';
    throw new Error(errorMessage);
  }
}

/**
 * Create a folder in OneDrive/SharePoint
 */
export async function createFolder(
  parentDriveId: string,
  parentItemId: string,
  folderName: string
): Promise<{ driveId: string; itemId: string; webUrl: string }> {
  const client = createGraphClient();

  try {
    const folder = await client
      .api(`/drives/${parentDriveId}/items/${parentItemId}/children`)
      .post({
        name: folderName,
        folder: {},
        '@microsoft.graph.conflictBehavior': 'rename',
      });

    logger.info('Created folder in OneDrive', { 
      driveId: parentDriveId, 
      folderId: folder.id,
      folderName 
    });

    return {
      driveId: parentDriveId,
      itemId: folder.id,
      webUrl: folder.webUrl,
    };
  } catch (error: any) {
    // Extract detailed error information from Microsoft Graph API
    const errorDetails: Record<string, unknown> = {
      parentDriveId,
      parentItemId,
      folderName,
    };

    if (error) {
      // Handle Graph API error structure
      if (error.statusCode) {
        errorDetails.statusCode = error.statusCode;
      }
      if (error.code) {
        errorDetails.code = error.code;
      }
      if (error.message) {
        errorDetails.message = error.message;
      }
      if (error.body) {
        try {
          errorDetails.body = typeof error.body === 'string' ? JSON.parse(error.body) : error.body;
        } catch {
          errorDetails.body = error.body;
        }
      }
      if (error.requestId) {
        errorDetails.requestId = error.requestId;
      }
      if (error.stack) {
        errorDetails.stack = error.stack;
      }
      // Include full error if it's serializable
      try {
        errorDetails.fullError = JSON.parse(JSON.stringify(error, Object.getOwnPropertyNames(error)));
      } catch {
        errorDetails.fullError = String(error);
      }
    }

    logger.error('Failed to create folder in OneDrive', errorDetails);
    
    // Provide more specific error message
    const errorMessage = error?.message || error?.body?.message || 'Failed to create folder in OneDrive';
    throw new Error(errorMessage);
  }
}

/**
 * Upload a file to OneDrive/SharePoint
 * For small files (<4MB), uses simple upload
 * For larger files, should use upload session (not implemented here for brevity)
 */
export async function uploadToOneDrive(
  buffer: Buffer,
  fileName: string,
  parentDriveId: string,
  parentItemId: string
): Promise<UploadResult> {
  const client = createGraphClient();

  try {
    // For files < 4MB, use simple upload
    if (buffer.length < 4 * 1024 * 1024) {
      const uploadedFile = await client
        .api(`/drives/${parentDriveId}/items/${parentItemId}:/${fileName}:/content`)
        .put(buffer);

      logger.info('Uploaded file to OneDrive', {
        driveId: parentDriveId,
        itemId: uploadedFile.id,
        fileName,
        size: buffer.length,
      });

      return {
        driveId: parentDriveId,
        itemId: uploadedFile.id,
        webUrl: uploadedFile.webUrl,
        name: uploadedFile.name,
        size: uploadedFile.size,
      };
    } else {
      // For larger files, use upload session
      // Create upload session
      const uploadSession = await client
        .api(`/drives/${parentDriveId}/items/${parentItemId}:/${fileName}:/createUploadSession`)
        .post({
          item: {
            '@microsoft.graph.conflictBehavior': 'rename',
          },
        });

      // Upload file in chunks (simplified - production should handle this better)
      const uploadUrl = uploadSession.uploadUrl;
      const chunkSize = 327680; // 320KB chunks
      let uploadedBytes = 0;

      while (uploadedBytes < buffer.length) {
        const chunk = buffer.slice(uploadedBytes, Math.min(uploadedBytes + chunkSize, buffer.length));
        const contentRange = `bytes ${uploadedBytes}-${uploadedBytes + chunk.length - 1}/${buffer.length}`;

        const response = await fetch(uploadUrl, {
          method: 'PUT',
          headers: {
            'Content-Length': chunk.length.toString(),
            'Content-Range': contentRange,
          },
          body: chunk,
        });

        if (response.ok) {
          const result = await response.json();
          if (result.id) {
            // Upload complete
            logger.info('Uploaded large file to OneDrive', {
              driveId: parentDriveId,
              itemId: result.id,
              fileName,
              size: buffer.length,
            });

            return {
              driveId: parentDriveId,
              itemId: result.id,
              webUrl: result.webUrl,
              name: result.name,
              size: result.size,
            };
          }
        }

        uploadedBytes += chunk.length;
      }

      throw new Error('Upload session completed but no file ID returned');
    }
  } catch (error) {
    logger.error('Failed to upload file to OneDrive', { error, fileName });
    throw new Error('Failed to upload file to OneDrive');
  }
}

/**
 * Get Office Online embed URL for a file
 * This URL can be used in an iframe for collaborative editing
 */
export async function getOfficeOnlineUrl(
  driveId: string,
  itemId: string
): Promise<string> {
  const client = createGraphClient();

  try {
    // Get the file item
    const item = await client
      .api(`/drives/${driveId}/items/${itemId}`)
      .get();

    // Check if it's an Office file
    const mimeType = item.file?.mimeType || '';
    const isOfficeFile = 
      mimeType.includes('officedocument') || 
      mimeType.includes('ms-excel') ||
      mimeType.includes('ms-word') ||
      mimeType.includes('ms-powerpoint');

    if (!isOfficeFile) {
      // For non-Office files, return the web URL
      return item.webUrl;
    }

    // Create a sharing link that allows editing
    const permission = await client
      .api(`/drives/${driveId}/items/${itemId}/createLink`)
      .post({
        type: 'edit',
        scope: 'organization',
      });

    // The webUrl from the permission contains the Office Online URL
    return permission.link.webUrl;
  } catch (error) {
    logger.error('Failed to get Office Online URL', { error, driveId, itemId });
    throw new Error('Failed to get file editing URL');
  }
}

/**
 * Create a shareable link for a file
 */
export async function createShareableLink(
  driveId: string,
  itemId: string,
  permissions: 'view' | 'edit' = 'view'
): Promise<ShareLinkResult> {
  const client = createGraphClient();

  try {
    const permission = await client
      .api(`/drives/${driveId}/items/${itemId}/createLink`)
      .post({
        type: permissions,
        scope: 'organization',
      });

    return {
      link: permission.link.webUrl,
      embedUrl: permission.link.webUrl,
    };
  } catch (error) {
    logger.error('Failed to create shareable link', { error, driveId, itemId });
    throw new Error('Failed to create sharing link');
  }
}

/**
 * Download a file from OneDrive
 */
export async function downloadFromOneDrive(
  driveId: string,
  itemId: string
): Promise<Buffer> {
  const client = createGraphClient();

  try {
    // Get the download URL
    const item = await client
      .api(`/drives/${driveId}/items/${itemId}`)
      .select('id,name,@microsoft.graph.downloadUrl')
      .get();

    const downloadUrl = item['@microsoft.graph.downloadUrl'];
    
    if (!downloadUrl) {
      throw new Error('No download URL available for this file');
    }

    // Download the file
    const response = await fetch(downloadUrl);
    if (!response.ok) {
      throw new Error('Failed to download file');
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    logger.error('Failed to download file from OneDrive', { error, driveId, itemId });
    throw new Error('Failed to download file');
  }
}

/**
 * Delete a file or folder from OneDrive
 */
export async function deleteFromOneDrive(
  driveId: string,
  itemId: string
): Promise<void> {
  const client = createGraphClient();

  try {
    await client
      .api(`/drives/${driveId}/items/${itemId}`)
      .delete();

    logger.info('Deleted item from OneDrive', { driveId, itemId });
  } catch (error) {
    logger.error('Failed to delete item from OneDrive', { error, driveId, itemId });
    throw new Error('Failed to delete item from OneDrive');
  }
}

/**
 * List files in a folder
 */
export async function listFolderContents(
  driveId: string,
  folderId: string
): Promise<DriveItem[]> {
  const client = createGraphClient();

  try {
    const response = await client
      .api(`/drives/${driveId}/items/${folderId}/children`)
      .select('id,name,size,webUrl,createdDateTime,lastModifiedDateTime,file,folder,createdBy,lastModifiedBy')
      .get();

    return response.value || [];
  } catch (error) {
    logger.error('Failed to list folder contents', { error, driveId, folderId });
    throw new Error('Failed to list folder contents');
  }
}

/**
 * Sync file metadata from OneDrive
 * Gets updated information about a file
 */
export async function syncFileMetadata(
  driveId: string,
  itemId: string
): Promise<{
  name: string;
  size: number;
  lastModifiedAt: Date;
  lastModifiedBy: string | null;
  version: number;
}> {
  const client = createGraphClient();

  try {
    const item = await client
      .api(`/drives/${driveId}/items/${itemId}`)
      .select('id,name,size,lastModifiedDateTime,lastModifiedBy,versions')
      .expand('versions')
      .get();

    return {
      name: item.name,
      size: item.size,
      lastModifiedAt: new Date(item.lastModifiedDateTime),
      lastModifiedBy: item.lastModifiedBy?.user?.email || item.lastModifiedBy?.user?.displayName || null,
      version: item.versions?.value?.length || 1,
    };
  } catch (error) {
    logger.error('Failed to sync file metadata', { error, driveId, itemId });
    throw new Error('Failed to sync file metadata');
  }
}

/**
 * Get file thumbnail URL
 */
export async function getThumbnailUrl(
  driveId: string,
  itemId: string,
  size: 'small' | 'medium' | 'large' = 'medium'
): Promise<string | null> {
  const client = createGraphClient();

  try {
    const thumbnails = await client
      .api(`/drives/${driveId}/items/${itemId}/thumbnails`)
      .get();

    if (thumbnails.value && thumbnails.value.length > 0) {
      const thumbnail = thumbnails.value[0];
      return thumbnail[size]?.url || null;
    }

    return null;
  } catch (error) {
    logger.warn('Failed to get thumbnail', { error, driveId, itemId });
    return null;
  }
}

