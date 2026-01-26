import { generateObject } from 'ai';
import { models } from '../../ai/config';
import { AIExtractionSchema, PDFExtractionSchema } from '../../ai/schemas';
import ExcelJS from 'exceljs';
import { promises as fs } from 'fs';
import path from 'path';
import { logger } from '../../utils/logger';
import {
  uploadFile as uploadToBlob,
  downloadFile as downloadFromBlob,
  deleteFile as deleteFromBlob,
  isBlobStorageConfigured,
} from './blobStorage';

export interface ExtractedData {
  documentType: string;
  summary: string;
  structuredData: Record<string, any>;
  confidence: number;
  warnings: string[];
}

export class DocumentExtractor {
  private static uploadDir = path.join(process.cwd(), 'uploads', 'adjustments');
  private static useBlobStorage = isBlobStorageConfigured();

  /**
   * Initialize upload directory (fallback for local storage)
   */
  static async init() {
    if (!this.useBlobStorage) {
      try {
        await fs.mkdir(this.uploadDir, { recursive: true });
      } catch (error) {
        logger.error('Failed to create upload directory', error);
      }
    }
  }

  /**
   * Save uploaded file (to blob storage or local disk)
   */
  static async saveFile(
    file: File | Buffer,
    fileName: string,
    taskId: number
  ): Promise<string> {
    const buffer =
      file instanceof Buffer
        ? file
        : Buffer.from(await (file as File).arrayBuffer());

    if (this.useBlobStorage) {
      // Upload to Azure Blob Storage
      return await uploadToBlob(buffer, fileName, taskId);
    } else {
      // Fallback to local file system
      await this.init();
      const taskDir = path.join(this.uploadDir, taskId.toString());
      await fs.mkdir(taskDir, { recursive: true });

      const timestamp = Date.now();
      const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = path.join(
        taskDir,
        `${timestamp}_${sanitizedFileName}`
      );

      await fs.writeFile(filePath, buffer);
      return filePath;
    }
  }

  /**
   * Get file buffer (from blob storage or local disk)
   */
  private static async getFileBuffer(filePath: string): Promise<Buffer> {
    if (this.useBlobStorage) {
      return await downloadFromBlob(filePath);
    } else {
      return await fs.readFile(filePath);
    }
  }

  /**
   * Extract data from uploaded document
   */
  static async extractFromDocument(
    filePath: string,
    fileType: string,
    context?: string
  ): Promise<ExtractedData> {
    const extension = fileType.toLowerCase();

    switch (extension) {
      case 'xlsx':
      case 'xls':
      case 'excel':
        return await this.extractFromExcel(filePath, context);

      case 'pdf':
        return await this.extractFromPDF(filePath, context);

      case 'csv':
        return await this.extractFromCSV(filePath, context);

      default:
        throw new Error(`Unsupported file type: ${fileType}`);
    }
  }

  /**
   * Extract data from Excel file
   */
  private static async extractFromExcel(
    filePath: string,
    context?: string
  ): Promise<ExtractedData> {
    try {
      const fileBuffer = await this.getFileBuffer(filePath);
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(fileBuffer as any);

      // Extract all sheets
      const sheets: Record<string, any[][]> = {};
      workbook.eachSheet((worksheet) => {
        const sheetData: any[][] = [];
        worksheet.eachRow({ includeEmpty: false }, (row) => {
          // row.values is [empty, cell1, cell2, ...] because exceljs is 1-indexed
          // we need to slice(1) or map properly. row.values can be an object if columns are defined, but here likely array-like
          if (Array.isArray(row.values)) {
            // ExcelJS row.values[0] is undefined/empty, actual data starts at index 1
            // But we want 0-indexed array for consistency with previous implementation
            // Filter out empty/undefined items if needed, or just slice(1)
            const values = row.values.slice(1);
            sheetData.push(values);
          } else if (typeof row.values === 'object') {
            // If it's an object (rare without columns def), convert to array
            sheetData.push(Object.values(row.values));
          }
        });
        sheets[worksheet.name] = sheetData;
      });

      // Use AI to interpret the Excel data
      const aiExtraction = await this.extractWithAI(
        JSON.stringify(sheets, null, 2),
        'excel',
        context
      );

      return {
        documentType: this.inferDocumentType(sheets),
        summary: aiExtraction.summary,
        structuredData: {
          rawSheets: sheets,
          ...aiExtraction.structuredData,
        },
        confidence: aiExtraction.confidence,
        warnings: aiExtraction.warnings,
      };
    } catch (error) {
      logger.error('Excel extraction error', error);
      throw new Error(`Failed to extract data from Excel: ${error}`);
    }
  }

  /**
   * Extract data from PDF file
   */
  private static async extractFromPDF(
    filePath: string,
    context?: string
  ): Promise<ExtractedData> {
    try {
      // Read PDF as buffer and convert to base64 for OpenAI Vision
      const fileBuffer = await this.getFileBuffer(filePath);
      const base64PDF = fileBuffer.toString('base64');

      // Note: OpenAI doesn't directly support PDF in vision API
      // In production, use pdf-parse or similar library first
      // For now, we'll use a text extraction approach with GPT-4

      const prompt = `<task>
Extract and structure tax-related information from this PDF document for South African tax compliance.
</task>

${context ? `<context>\n${context}\n</context>\n` : ''}

<extraction_requirements>
1. Document type (e.g., depreciation schedule, interest calculation, donation receipt, etc.)
2. Key financial figures and their meanings
3. Dates and periods
4. Any tax-relevant information
</extraction_requirements>

<output_format>
Return a JSON object with the following structure:
{
  "documentType": "string - specific type of document",
  "summary": "string - brief description of document contents",
  "structuredData": {
    "all": "extracted fields as key-value pairs"
  },
  "confidence": 0.0 to 1.0,
  "warnings": ["array", "of", "potential issues or manual review needs"]
}
</output_format>`;

      const { object } = await generateObject({
        model: models.nano,
        schema: PDFExtractionSchema,
        system: `You are an expert tax document analyzer specializing in South African tax documents.

<instructions>
- Extract all relevant financial and tax information accurately
- Identify document types based on content and structure
- Flag any ambiguities or areas requiring manual review
- Provide confidence scores based on data clarity
- Always return valid JSON in the specified format
</instructions>`,
        prompt,
      });

      return object;
    } catch (error) {
      logger.error('PDF extraction error', error);
      throw new Error(`Failed to extract data from PDF: ${error}`);
    }
  }

  /**
   * Extract data from CSV file
   */
  private static async extractFromCSV(
    filePath: string,
    context?: string
  ): Promise<ExtractedData> {
    try {
      const fileBuffer = await this.getFileBuffer(filePath);
      const fileContent = fileBuffer.toString('utf-8');
      const lines = fileContent.split('\n');

      // Parse CSV (simple implementation)
      const rows = lines.map(line => line.split(','));

      const aiExtraction = await this.extractWithAI(
        JSON.stringify(rows, null, 2),
        'csv',
        context
      );

      return {
        documentType: 'CSV Data',
        summary: aiExtraction.summary,
        structuredData: {
          rawData: rows,
          ...aiExtraction.structuredData,
        },
        confidence: aiExtraction.confidence,
        warnings: aiExtraction.warnings,
      };
    } catch (error) {
      logger.error('CSV extraction error', error);
      throw new Error(`Failed to extract data from CSV: ${error}`);
    }
  }

  /**
   * Use AI to extract structured data
   */
  private static async extractWithAI(
    rawData: string,
    sourceType: string,
    context?: string
  ): Promise<{
    summary: string;
    structuredData: Record<string, any>;
    confidence: number;
    warnings: string[];
  }> {
    const prompt = `<task>
Analyze this ${sourceType} data and extract tax-relevant information for South African tax compliance.
</task>

${context ? `<context>\nThis document is related to ${context}\n</context>\n\n` : ''}

<source_data>
${rawData.substring(0, 8000)} ${rawData.length > 8000 ? '...(truncated)' : ''}
</source_data>

<extraction_requirements>
Based on document type, extract the following:

DEPRECIATION SCHEDULES:
- Asset descriptions and categories
- Acquisition dates and costs
- Depreciation rates and methods
- Accumulated depreciation
- Book values

INTEREST CALCULATIONS:
- Loan/debt details
- Interest rates
- Calculation periods
- Total interest amounts

DONATION RECEIPTS:
- Donor and recipient details
- Donation amounts
- Dates
- s18A compliance information

FOREIGN INCOME:
- Source country
- Income type
- Amounts (foreign and ZAR)
- Tax paid abroad
- Relevant DTAs
</extraction_requirements>

<output_format>
Return JSON with:
{
  "summary": "Brief description of document contents",
  "structuredData": {
    "documentType": "specific type",
    "keyFields": {...extracted fields...}
  },
  "confidence": 0.0 to 1.0 (how confident in extraction),
  "warnings": ["any issues or manual review needed"]
}
</output_format>`;

    try {
      const { object } = await generateObject({
        model: models.nano,
        schema: AIExtractionSchema,
        system: `You are an expert at extracting structured data from financial and tax documents.

<instructions>
- Identify the document type accurately
- Extract all relevant fields based on document type
- Preserve numerical accuracy
- Flag any ambiguities or missing information
- Always return valid JSON in the specified format
- Never include explanatory text outside the JSON structure
</instructions>`,
        prompt,
      });

      return object;
    } catch (error) {
      logger.error('AI extraction error', error);
      return {
        summary: 'Extraction failed',
        structuredData: {},
        confidence: 0,
        warnings: ['AI extraction failed - manual review required'],
      };
    }
  }

  /**
   * Infer document type from Excel structure
   */
  private static inferDocumentType(sheets: Record<string, any[][]>): string {
    const sheetNames = Object.keys(sheets).map(s => s.toLowerCase());
    const firstSheetKey = Object.keys(sheets)[0];
    const firstSheetData = firstSheetKey ? sheets[firstSheetKey] || [] : [];

    // Check for common patterns
    if (sheetNames.some(name => name.includes('depreciation') || name.includes('asset'))) {
      return 'Depreciation Schedule';
    }

    if (sheetNames.some(name => name.includes('interest') || name.includes('loan'))) {
      return 'Interest Calculation';
    }

    if (sheetNames.some(name => name.includes('donation'))) {
      return 'Donation Documentation';
    }

    // Check first sheet content
    const contentStr = JSON.stringify(firstSheetData).toLowerCase();
    if (contentStr.includes('asset') && contentStr.includes('depreciation')) {
      return 'Depreciation Schedule';
    }

    return 'Financial Document';
  }

  /**
   * Delete a file (from blob storage or local disk)
   */
  static async deleteFile(filePath: string): Promise<void> {
    try {
      if (this.useBlobStorage) {
        await deleteFromBlob(filePath);
      } else {
        await fs.unlink(filePath);
      }
    } catch (error) {
      logger.error('Failed to delete file', error);
    }
  }

  /**
   * Get file info (local storage only)
   */
  static async getFileInfo(filePath: string): Promise<{
    size: number;
    created: Date;
    modified: Date;
  }> {
    if (this.useBlobStorage) {
      throw new Error(
        'File info not available for blob storage. Use blob metadata instead.'
      );
    }
    const stats = await fs.stat(filePath);
    return {
      size: stats.size,
      created: stats.birthtime,
      modified: stats.mtime,
    };
  }
}

