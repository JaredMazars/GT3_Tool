import { createReadStream } from 'fs';
import { AppError, ErrorCodes } from './errorHandler';
import type { FileValidationResult } from '@/types/api';

/**
 * Maximum file size in bytes (10MB)
 */
const MAX_FILE_SIZE = Number.parseInt(process.env.MAX_FILE_UPLOAD_SIZE || '10485760', 10);

/**
 * Allowed file types with their magic bytes
 * Magic bytes are the first few bytes of a file that identify its type
 */
const ALLOWED_FILE_TYPES = {
  // Excel files
  'xlsx': {
    mimeTypes: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
    extensions: ['.xlsx'],
    magicBytes: [[0x50, 0x4B, 0x03, 0x04]], // PK.. (ZIP format)
  },
  'xls': {
    mimeTypes: ['application/vnd.ms-excel'],
    extensions: ['.xls'],
    magicBytes: [[0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1]], // OLE2 format
  },
  // PDF files
  'pdf': {
    mimeTypes: ['application/pdf'],
    extensions: ['.pdf'],
    magicBytes: [[0x25, 0x50, 0x44, 0x46]], // %PDF
  },
  // CSV files (text-based, harder to verify by magic bytes)
  'csv': {
    mimeTypes: ['text/csv', 'application/csv'],
    extensions: ['.csv'],
    magicBytes: [], // CSV doesn't have magic bytes
  },
} as const;

/**
 * Validate file extension
 * @param fileName - Name of the file
 * @returns True if extension is allowed
 */
function validateExtension(fileName: string): boolean {
  const extension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
  
  for (const fileType of Object.values(ALLOWED_FILE_TYPES)) {
    if ((fileType.extensions as readonly string[]).includes(extension)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Check magic bytes of a file to verify its actual type
 * @param filePath - Path to the file
 * @returns Detected file type or null
 */
async function checkMagicBytes(filePath: string): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const stream = createReadStream(filePath, { start: 0, end: 7 });
    const chunks: Buffer[] = [];
    
    stream.on('data', (chunk: string | Buffer) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    
    stream.on('end', () => {
      const buffer = Buffer.concat(chunks);
      
      // Check against known magic bytes
      for (const [fileType, config] of Object.entries(ALLOWED_FILE_TYPES)) {
        for (const magicBytes of config.magicBytes) {
          let matches = true;
          for (let i = 0; i < magicBytes.length; i++) {
            if (buffer[i] !== magicBytes[i]) {
              matches = false;
              break;
            }
          }
          if (matches) {
            resolve(fileType);
            return;
          }
        }
      }
      
      // CSV files don't have magic bytes, check if it looks like text
      const text = buffer.toString('utf8', 0, Math.min(buffer.length, 100));
      // Use a safer regex with length limit to prevent ReDoS
      if (text.length <= 100 && /^[\x20-\x7E\r\n\t,]{0,100}$/.test(text)) {
        resolve('csv');
        return;
      }
      
      resolve(null);
    });
    
    stream.on('error', reject);
  });
}

/**
 * Validate file upload
 * @param file - File object from upload
 * @param filePath - Path where file is stored (for magic byte checking)
 * @returns Validation result
 */
export async function validateFile(
  file: { name: string; size: number; type: string },
  filePath?: string
): Promise<FileValidationResult> {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size exceeds maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024}MB`,
    };
  }
  
  if (file.size === 0) {
    return {
      valid: false,
      error: 'File is empty',
    };
  }
  
  // Check file extension
  if (!validateExtension(file.name)) {
    const allowedExtensions = Object.values(ALLOWED_FILE_TYPES)
      .flatMap(t => t.extensions)
      .join(', ');
    return {
      valid: false,
      error: `File type not allowed. Allowed types: ${allowedExtensions}`,
    };
  }
  
  // If file path is provided, check magic bytes
  if (filePath) {
    try {
      const detectedType = await checkMagicBytes(filePath);
      
      if (!detectedType) {
        return {
          valid: false,
          error: 'File type could not be verified. The file may be corrupted or of an unsupported type.',
        };
      }
      
      // Get the expected type from extension
      const extension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
      let expectedType: string | null = null;
      
      for (const [type, config] of Object.entries(ALLOWED_FILE_TYPES)) {
        if ((config.extensions as readonly string[]).includes(extension)) {
          expectedType = type;
          break;
        }
      }
      
      // For non-CSV files, verify magic bytes match extension
      if (expectedType && expectedType !== 'csv' && detectedType !== expectedType) {
        return {
          valid: false,
          error: 'File extension does not match file content. This could indicate a security risk.',
        };
      }
    } catch (error) {
      // Continue anyway - this is an extra security check
    }
  }
  
  return {
    valid: true,
    mimeType: file.type,
    size: file.size,
  };
}

/**
 * Sanitize filename to prevent path traversal attacks
 * @param fileName - Original filename
 * @returns Sanitized filename
 */
export function sanitizeFileName(fileName: string): string {
  // Remove any path components
  const baseName = fileName.replace(/^.*[\\/]/, '');
  
  // Remove or replace dangerous characters
  const sanitized = baseName
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/\.{2,}/g, '_') // Replace multiple dots
    .substring(0, 255); // Limit length
  
  // Ensure filename is not empty after sanitization
  if (!sanitized || sanitized === '.' || sanitized === '..') {
    return 'unnamed_file';
  }
  
  return sanitized;
}

/**
 * Generate a unique filename to prevent conflicts and path traversal
 * @param originalFileName - Original filename
 * @returns Unique filename with timestamp and cryptographically secure random component
 */
export function generateUniqueFileName(originalFileName: string): string {
  const sanitized = sanitizeFileName(originalFileName);
  const timestamp = Date.now();
  // Use first 8 chars of UUID for shorter but still secure random component
  const random = crypto.randomUUID().substring(0, 8);
  const extension = sanitized.substring(sanitized.lastIndexOf('.'));
  const nameWithoutExt = sanitized.substring(0, sanitized.lastIndexOf('.'));
  
  return `${timestamp}_${random}_${nameWithoutExt}${extension}`;
}

/**
 * Validate and throw error if file is invalid
 * @param file - File object
 * @param filePath - Optional file path for magic byte checking
 * @throws AppError if file is invalid
 */
export async function validateFileOrThrow(
  file: { name: string; size: number; type: string },
  filePath?: string
): Promise<void> {
  const result = await validateFile(file, filePath);
  
  if (!result.valid) {
    throw new AppError(
      400,
      result.error || 'File validation failed',
      ErrorCodes.FILE_UPLOAD_ERROR
    );
  }
}

/**
 * Get allowed file extensions as a string for display
 * @returns Comma-separated list of allowed extensions
 */
export function getAllowedExtensions(): string {
  return Object.values(ALLOWED_FILE_TYPES)
    .flatMap(t => t.extensions)
    .join(', ');
}

/**
 * Get max file size in a human-readable format
 * @returns Max file size string (e.g., "10MB")
 */
export function getMaxFileSizeDisplay(): string {
  const mb = MAX_FILE_SIZE / 1024 / 1024;
  return `${mb}MB`;
}



