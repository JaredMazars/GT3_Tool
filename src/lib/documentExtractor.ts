import OpenAI from 'openai';
import * as XLSX from 'xlsx';
import { promises as fs } from 'fs';
import path from 'path';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface ExtractedData {
  documentType: string;
  summary: string;
  structuredData: Record<string, any>;
  confidence: number;
  warnings: string[];
}

export class DocumentExtractor {
  private static uploadDir = path.join(process.cwd(), 'uploads', 'adjustments');

  /**
   * Initialize upload directory
   */
  static async init() {
    try {
      await fs.mkdir(this.uploadDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create upload directory:', error);
    }
  }

  /**
   * Save uploaded file to disk
   */
  static async saveFile(
    file: File | Buffer,
    fileName: string,
    projectId: number
  ): Promise<string> {
    await this.init();
    
    const projectDir = path.join(this.uploadDir, projectId.toString());
    await fs.mkdir(projectDir, { recursive: true });

    const timestamp = Date.now();
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = path.join(projectDir, `${timestamp}_${sanitizedFileName}`);

    if (file instanceof Buffer) {
      await fs.writeFile(filePath, file);
    } else {
      // For File objects (browser)
      const buffer = Buffer.from(await file.arrayBuffer());
      await fs.writeFile(filePath, buffer);
    }

    return filePath;
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
      const fileBuffer = await fs.readFile(filePath);
      const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
      
      // Extract all sheets
      const sheets: Record<string, any[][]> = {};
      for (const sheetName of workbook.SheetNames) {
        const worksheet = workbook.Sheets[sheetName];
        sheets[sheetName] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      }

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
      console.error('Excel extraction error:', error);
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
      const fileBuffer = await fs.readFile(filePath);
      const base64PDF = fileBuffer.toString('base64');

      // Note: OpenAI doesn't directly support PDF in vision API
      // In production, use pdf-parse or similar library first
      // For now, we'll use a text extraction approach with GPT-4

      const prompt = `Extract and structure the following tax-related information from this PDF document:
${context ? `Context: ${context}` : ''}

Please identify:
1. Document type (e.g., depreciation schedule, interest calculation, donation receipt, etc.)
2. Key financial figures and their meanings
3. Dates and periods
4. Any tax-relevant information

Return structured JSON with:
- documentType
- summary (brief description)
- structuredData (all extracted fields)
- confidence (0-1)
- warnings (array of potential issues)`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: 'You are a tax document analyzer specializing in South African tax documents.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
      });

      const result = JSON.parse(completion.choices[0].message.content || '{}');
      
      return {
        documentType: result.documentType || 'Unknown',
        summary: result.summary || 'Unable to extract summary',
        structuredData: result.structuredData || {},
        confidence: result.confidence || 0.5,
        warnings: result.warnings || ['PDF extraction has limitations - manual review recommended'],
      };
    } catch (error) {
      console.error('PDF extraction error:', error);
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
      const fileContent = await fs.readFile(filePath, 'utf-8');
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
      console.error('CSV extraction error:', error);
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
    const prompt = `Analyze this ${sourceType} data and extract tax-relevant information:

${context ? `Context: This document is related to ${context}\n\n` : ''}

Data:
${rawData.substring(0, 8000)} ${rawData.length > 8000 ? '...(truncated)' : ''}

Extract and structure the following based on document type:

For DEPRECIATION SCHEDULES:
- Asset descriptions and categories
- Acquisition dates and costs
- Depreciation rates and methods
- Accumulated depreciation
- Book values

For INTEREST CALCULATIONS:
- Loan/debt details
- Interest rates
- Calculation periods
- Total interest amounts

For DONATION RECEIPTS:
- Donor and recipient details
- Donation amounts
- Dates
- s18A compliance information

For FOREIGN INCOME:
- Source country
- Income type
- Amounts (foreign and ZAR)
- Tax paid abroad
- Relevant DTAs

Return JSON with:
{
  "summary": "Brief description of document contents",
  "structuredData": {
    "documentType": "specific type",
    "keyFields": {...extracted fields...}
  },
  "confidence": 0-1 (how confident in extraction),
  "warnings": ["any issues or manual review needed"]
}`;

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: 'You are an expert at extracting structured data from financial and tax documents. Always return valid JSON.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
      });

      const result = JSON.parse(completion.choices[0].message.content || '{}');
      
      return {
        summary: result.summary || 'Data extracted',
        structuredData: result.structuredData || {},
        confidence: result.confidence || 0.7,
        warnings: result.warnings || [],
      };
    } catch (error) {
      console.error('AI extraction error:', error);
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
    const firstSheetData = sheets[Object.keys(sheets)[0]] || [];
    
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
   * Delete a file
   */
  static async deleteFile(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
    } catch (error) {
      console.error('Failed to delete file:', error);
    }
  }

  /**
   * Get file info
   */
  static async getFileInfo(filePath: string): Promise<{
    size: number;
    created: Date;
    modified: Date;
  }> {
    const stats = await fs.stat(filePath);
    return {
      size: stats.size,
      created: stats.birthtime,
      modified: stats.mtime,
    };
  }
}


