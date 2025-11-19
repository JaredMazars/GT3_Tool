import { NextRequest, NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import { generateObject } from 'ai';
import { models } from '@/lib/ai/config';
import { AccountMappingSchema } from '@/lib/ai/schemas';
import { mappingGuide } from '@/lib/services/projects/mappingGuide';
import { prisma } from '@/lib/db/prisma';
import { logInfo, logError } from '@/lib/utils/logger';
import { determineSectionAndSubsection } from '@/lib/services/opinions/sectionMapper';

// Helper to convert worksheet to JSON
function sheetToJson(worksheet: ExcelJS.Worksheet): any[] {
  const data: any[] = [];
  const headers: string[] = [];

  worksheet.getRow(1).eachCell((cell, colNumber) => {
    headers[colNumber] = cell.text;
  });

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const rowData: Record<string, any> = {};
    row.eachCell((cell, colNumber) => {
      const header = headers[colNumber];
      if (header) {
        // Handle rich text or other cell types if necessary, but .value usually works
        // For simple values, .value is fine. For formulas, .result might be needed but usually .value contains the result if cached
        // Or .text for string representation
        rowData[header] = cell.value;
      }
    });
    data.push(rowData);
  });
  return data;
}

async function handleStreamingRequest(trialBalanceFile: File, projectId: number) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Helper function to send progress updates
        const sendProgress = (stage: number, status: 'in-progress' | 'complete', message: string) => {
          const data = JSON.stringify({ stage, status, message });
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        };

        // Stage 1: Parse Trial Balance
        sendProgress(1, 'in-progress', 'Parsing trial balance file...');
        const trialBalanceBuffer = await trialBalanceFile.arrayBuffer();
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(trialBalanceBuffer);

        const worksheet = workbook.worksheets[0];
        if (!worksheet) {
          throw new Error('No sheets found in the trial balance file');
        }

        const trialBalanceData = sheetToJson(worksheet);

        // Split trial balance data
        const incomeStatementData = trialBalanceData.filter(
          (row: any) => {
            return row['Section']?.toString().toLowerCase() === 'income statement';
          }
        );
        const balanceSheetData = trialBalanceData.filter(
          (row: any) => {
            return row['Section']?.toString().toLowerCase() === 'balance sheet';
          }
        );
        sendProgress(1, 'complete', 'Trial balance parsed successfully');

        // Stage 2: Map Income Statement
        sendProgress(2, 'in-progress', 'Mapping Income Statement accounts with AI...');
        const incomeStatementPrompt = generatePrompt(incomeStatementData, mappingGuide.incomeStatement, 'Income Statement');
        const { object: incomeStatementResult } = await generateObject({
          model: models.mini,
          schema: AccountMappingSchema,
          system: `You are an expert accounting assistant specializing in mapping trial balance accounts to SARS tax categories.

<task>
Your task is to analyze trial balance data and map each account to the appropriate SARS category (sarsItem) based on the provided mapping guide.
</task>

<output_format>
Return a valid JSON array where each object contains:
- accountCode: string
- accountName: string
- balance: number (not string)
- priorYearBalance: number (not string, defaults to 0 if missing)
- sarsItem: string

Do not include any explanation, commentary, or text outside the JSON array.
</output_format>

<instructions>
- Match accounts to the most appropriate sarsItem based on account name and current year balance
- CRITICAL: You MUST use ONLY the exact sarsItem values provided in the mapping guide - do not create new categories
- If no perfect match exists, use the most appropriate "Other" category from the mapping guide
- Preserve original account details exactly as provided, including both Balance and Prior Year Balance
- Ensure all balance values are numbers, not strings
- If Prior Year Balance column is missing, set priorYearBalance to 0
</instructions>`,
          prompt: incomeStatementPrompt,
        });
        const incomeStatementMapped = incomeStatementResult.accounts;
        sendProgress(2, 'complete', 'Income Statement mapped successfully');

        // Stage 3: Map Balance Sheet
        sendProgress(3, 'in-progress', 'Mapping Balance Sheet accounts with AI...');
        const balanceSheetPrompt = generatePrompt(balanceSheetData, mappingGuide.balanceSheet, 'Balance Sheet');
        const { object: balanceSheetResult } = await generateObject({
          model: models.mini,
          schema: AccountMappingSchema,
          system: `You are an expert accounting assistant specializing in mapping trial balance accounts to SARS tax categories.

<task>
Your task is to analyze trial balance data and map each account to the appropriate SARS category (sarsItem) based on the provided mapping guide.
</task>

<output_format>
Return a valid JSON array where each object contains:
- accountCode: string
- accountName: string
- balance: number (not string)
- priorYearBalance: number (not string, defaults to 0 if missing)
- sarsItem: string

Do not include any explanation, commentary, or text outside the JSON array.
</output_format>

<instructions>
- Match accounts to the most appropriate sarsItem based on account name and mapping guide
- CRITICAL: You MUST use ONLY the exact sarsItem values provided in the mapping guide - do not create new categories
- If no perfect match exists, use the most appropriate "Other" category from the mapping guide
- Preserve original account details exactly as provided, including both Balance and Prior Year Balance
- Ensure all balance values are numbers, not strings
- If Prior Year Balance column is missing, set priorYearBalance to 0
</instructions>`,
          prompt: balanceSheetPrompt,
        });
        const balanceSheetMapped = balanceSheetResult.accounts;
        sendProgress(3, 'complete', 'Balance Sheet mapped successfully');

        // Stage 4: Save to database
        sendProgress(4, 'in-progress', 'Saving mapped accounts to database...');
        const combinedResults = [...incomeStatementMapped, ...balanceSheetMapped];

        // Add section and subsection programmatically
        const enrichedResults = combinedResults.map(item => {
          const { section, subsection } = determineSectionAndSubsection(item.sarsItem, item.balance);
          return {
            ...item,
            section,
            subsection
          };
        });

        await prisma.$transaction(async (tx) => {
          // Delete existing mapped accounts for this project
          await tx.mappedAccount.deleteMany({
            where: { projectId }
          });

          // Use createMany for better performance and to avoid transaction timeout
          if (enrichedResults.length > 0) {
            await tx.mappedAccount.createMany({
              data: enrichedResults.map(item => ({
                projectId,
                accountCode: item.accountCode.toString(),
                accountName: item.accountName,
                section: item.section,
                subsection: item.subsection,
                balance: item.balance,
                priorYearBalance: item.priorYearBalance || 0,
                sarsItem: item.sarsItem
              }))
            });
          }
        }, {
          maxWait: 10000, // Maximum wait time to acquire a connection (10 seconds)
          timeout: 30000, // Maximum time for the transaction to complete (30 seconds)
        });
        sendProgress(4, 'complete', 'All accounts saved successfully');

        // Send final result
        const resultData = JSON.stringify({ type: 'complete', data: enrichedResults });
        controller.enqueue(encoder.encode(`data: ${resultData}\n\n`));

        controller.close();
      } catch (error) {
        const errorData = JSON.stringify({
          type: 'error',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
        controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    logInfo('Starting POST /api/map');
    const formData = await request.formData();
    const trialBalanceFile = formData.get('trialBalance') as File;
    const projectIdStr = formData.get('projectId') as string;
    const streamProgress = formData.get('stream') === 'true';
    logInfo('Processing mapping request', { projectId: projectIdStr, stream: streamProgress });

    if (!trialBalanceFile) {
      return NextResponse.json(
        { error: 'Trial Balance file is required.' },
        { status: 400 }
      );
    }

    if (!projectIdStr) {
      return NextResponse.json(
        { error: 'Project ID is required.' },
        { status: 400 }
      );
    }

    // Convert projectId to number
    const projectId = parseInt(projectIdStr, 10);
    if (isNaN(projectId)) {
      return NextResponse.json(
        { error: 'Invalid Project ID format.' },
        { status: 400 }
      );
    }

    // Verify project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId }
    });

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found.' },
        { status: 404 }
      );
    }

    // If streaming is requested, return a streaming response
    if (streamProgress) {
      return handleStreamingRequest(trialBalanceFile, projectId);
    }

    // Parse Trial Balance
    const trialBalanceBuffer = await trialBalanceFile.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(trialBalanceBuffer);

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      throw new Error('No sheets found in the trial balance file');
    }

    const trialBalanceData = sheetToJson(worksheet);

    // Split trial balance data
    const incomeStatementData = trialBalanceData.filter(
      (row: any) => {
        return row['Section']?.toString().toLowerCase() === 'income statement';
      }
    );
    const balanceSheetData = trialBalanceData.filter(
      (row: any) => {
        return row['Section']?.toString().toLowerCase() === 'balance sheet';
      }
    );

    // Process Income Statement first
    logInfo('Processing Income Statement', { rowCount: incomeStatementData.length });
    const incomeStatementPrompt = generatePrompt(incomeStatementData, mappingGuide.incomeStatement, 'Income Statement');
    logInfo('Calling AI SDK for Income Statement');
    let incomeStatementResult;
    try {
      const result = await generateObject({
        model: models.mini,
        schema: AccountMappingSchema,
        system: `You are an expert accounting assistant specializing in mapping trial balance accounts to SARS tax categories.

<task>
Your task is to analyze trial balance data and map each account to the appropriate SARS category (sarsItem) based on the provided mapping guide.
</task>

<output_format>
Return a valid JSON array where each object contains:
- accountCode: string
- accountName: string
- balance: number (not string)
- priorYearBalance: number (not string, defaults to 0 if missing)
- sarsItem: string

Do not include any explanation, commentary, or text outside the JSON array.
</output_format>

<instructions>
- Match accounts to the most appropriate sarsItem based on account name and current year balance
- CRITICAL: You MUST use ONLY the exact sarsItem values provided in the mapping guide - do not create new categories
- If no perfect match exists, use the most appropriate "Other" category from the mapping guide
- Preserve original account details exactly as provided, including both Balance and Prior Year Balance
- Ensure all balance values are numbers, not strings
- If Prior Year Balance column is missing, set priorYearBalance to 0
</instructions>`,
        prompt: incomeStatementPrompt,
      });
      incomeStatementResult = result.object;
    } catch (apiError: any) {
      logError('AI SDK Error for Income Statement', apiError, {
        message: apiError.message,
        status: apiError.status,
        code: apiError.code,
        type: apiError.type
      });
      throw new Error(`AI SDK Error: ${apiError.message || apiError}`);
    }

    logInfo('Income Statement mapping completed');
    const incomeStatementMapped = incomeStatementResult.accounts;
    logInfo('Income Statement accounts mapped', { count: incomeStatementMapped.length });

    // Process Balance Sheet
    logInfo('Processing Balance Sheet', { rowCount: balanceSheetData.length });
    const balanceSheetPrompt = generatePrompt(balanceSheetData, mappingGuide.balanceSheet, 'Balance Sheet');
    logInfo('Calling AI SDK for Balance Sheet');
    const { object: balanceSheetResult } = await generateObject({
      model: models.mini,
      schema: AccountMappingSchema,
      system: `You are an expert accounting assistant specializing in mapping trial balance accounts to SARS tax categories.

<task>
Your task is to analyze trial balance data and map each account to the appropriate SARS category (sarsItem) based on the provided mapping guide.
</task>

<output_format>
Return a valid JSON array where each object contains:
- accountCode: string
- accountName: string
- balance: number (not string)
- priorYearBalance: number (not string, defaults to 0 if missing)
- sarsItem: string

Do not include any explanation, commentary, or text outside the JSON array.
</output_format>

<instructions>
- Match accounts to the most appropriate sarsItem based on account name and mapping guide
- CRITICAL: You MUST use ONLY the exact sarsItem values provided in the mapping guide - do not create new categories
- If no perfect match exists, use the most appropriate "Other" category from the mapping guide
- Preserve original account details exactly as provided, including both Balance and Prior Year Balance
- Ensure all balance values are numbers, not strings
- If Prior Year Balance column is missing, set priorYearBalance to 0
</instructions>`,
      prompt: balanceSheetPrompt,
    });

    logInfo('Balance Sheet mapping completed');
    const balanceSheetMapped = balanceSheetResult.accounts;
    logInfo('Balance Sheet accounts mapped', { count: balanceSheetMapped.length });

    // Combine results
    const combinedResults = [...incomeStatementMapped, ...balanceSheetMapped];

    // Add section and subsection programmatically
    const enrichedResults = combinedResults.map(item => {
      const { section, subsection } = determineSectionAndSubsection(item.sarsItem, item.balance);
      return {
        ...item,
        section,
        subsection
      };
    });

    // Save mapped accounts to database
    await prisma.$transaction(async (tx) => {
      // Delete existing mapped accounts for this project
      await tx.mappedAccount.deleteMany({
        where: { projectId }
      });

      // Log the data we're about to insert
      logInfo('Inserting mapped accounts to database', {
        projectId,
        accountCount: enrichedResults.length
      });

      // Use createMany for better performance and to avoid transaction timeout
      if (enrichedResults.length > 0) {
        await tx.mappedAccount.createMany({
          data: enrichedResults.map(item => ({
            projectId,
            accountCode: item.accountCode.toString(),
            accountName: item.accountName,
            section: item.section,
            subsection: item.subsection,
            balance: item.balance,
            priorYearBalance: item.priorYearBalance || 0,
            sarsItem: item.sarsItem
          }))
        });
      }
    }, {
      maxWait: 10000, // Maximum wait time to acquire a connection (10 seconds)
      timeout: 30000, // Maximum time for the transaction to complete (30 seconds)
    });

    return NextResponse.json(enrichedResults);

  } catch (error) {
    logError('Error processing files', error);
    return NextResponse.json(
      { error: 'Error processing files: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

function generatePrompt(trialBalanceData: Record<string, unknown>[], mappingGuide: Record<string, unknown>, section: string) {
  const trialBalanceStr = JSON.stringify(trialBalanceData, null, 2);
  const mappingGuideStr = JSON.stringify(mappingGuide, null, 2);

  return `<task>
Map the following ${section} trial balance accounts to their appropriate SARS categories (sarsItem) based on the provided mapping guide.
</task>

<trial_balance_data>
${trialBalanceStr}
</trial_balance_data>

<mapping_guide>
${mappingGuideStr}
</mapping_guide>

<rules>
1. Each account must have: accountCode, accountName, balance (as number), priorYearBalance (as number), sarsItem
2. CRITICAL: Use ONLY the exact sarsItem values listed in the mapping guide - do not invent new categories
3. Match accounts to the most appropriate sarsItem from the mapping guide based on the account name
4. If no perfect match exists, use the appropriate "Other" category (e.g., "Other current assets", "Other expenses (excluding items listed above)", etc.)
5. Keep original account details exactly as provided, including both Balance and "Prior Year Balance" columns
6. Balance and priorYearBalance must be numbers, not strings
7. If "Prior Year Balance" is missing, set priorYearBalance to 0
8. For accumulated depreciation: set sarsItem to "Other non-current assets"
9. For income statement accounts, correctly distinguish between:
   - Sales/purchases items (e.g., "Gross Sales", "Purchases", "Opening/Closing stock", "Credit notes", "Rebates")
   - Income items (e.g., interest, dividends, foreign exchange gains, royalties)
   - Expense items (e.g., salaries, rent, depreciation, operating costs)
</rules>

<output_format>
Return a JSON object with a single "accounts" key containing an array of mapped accounts:
{
  "accounts": [
    {
      "accountCode": "1000",
      "accountName": "Cash at Bank",
      "balance": 50000.00,
      "priorYearBalance": 45000.00,
      "sarsItem": "Cash and cash equivalents"
    }
  ]
}
</output_format>`;
}
