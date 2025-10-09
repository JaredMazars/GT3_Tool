import { NextRequest, NextResponse } from 'next/server';
import { read, utils } from 'xlsx';
import OpenAI from 'openai';
import { mappingGuide } from '@/lib/mappingGuide';
import { prisma } from '@/lib/prisma';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
        const trialBalanceWorkbook = read(trialBalanceBuffer);
        const trialBalanceSheet = trialBalanceWorkbook.Sheets[trialBalanceWorkbook.SheetNames[0]];
        const trialBalanceData = utils.sheet_to_json(trialBalanceSheet);
        
        // Split trial balance data
        const incomeStatementData = trialBalanceData.filter(
          (row: unknown) => {
            const typedRow = row as Record<string, unknown>;
            return typedRow['Section']?.toString().toLowerCase() === 'income statement';
          }
        );
        const balanceSheetData = trialBalanceData.filter(
          (row: unknown) => {
            const typedRow = row as Record<string, unknown>;
            return typedRow['Section']?.toString().toLowerCase() === 'balance sheet';
          }
        );
        sendProgress(1, 'complete', 'Trial balance parsed successfully');

        // Stage 2: Map Income Statement
        sendProgress(2, 'in-progress', 'Mapping Income Statement accounts with AI...');
        const incomeStatementPrompt = generatePrompt(incomeStatementData as Record<string, unknown>[], mappingGuide.incomeStatement, 'Income Statement');
        const incomeStatementCompletion = await openai.chat.completions.create({
          messages: [
            {
              role: "system",
              content: `You are an expert accounting assistant specializing in mapping trial balance accounts to SARS tax categories.

<task>
Your task is to analyze trial balance data and map each account to the appropriate SARS category based on the provided mapping guide.
</task>

<output_format>
Return a valid JSON array where each object contains:
- accountCode: string
- accountName: string
- section: string
- subsection: string
- balance: number (not string)
- priorYearBalance: number (not string, defaults to 0 if missing)
- sarsItem: string

Do not include any explanation, commentary, or text outside the JSON array.
</output_format>

<instructions>
- Match accounts to the most appropriate sarsItem based on account name and current year balance
- Preserve original account details exactly as provided, including both Balance and Prior Year Balance
- Ensure all balance values are numbers, not strings
- If Prior Year Balance column is missing, set priorYearBalance to 0
- Follow the mapping guide structure precisely
</instructions>`
            },
            {
              role: "user",
              content: incomeStatementPrompt
            }
          ],
          model: "gpt-5-nano-2025-08-07",
          response_format: { type: "json_object" }
        });
        const incomeStatementMapped = parseLLMResponse(incomeStatementCompletion.choices[0].message.content);
        sendProgress(2, 'complete', 'Income Statement mapped successfully');

        // Stage 3: Map Balance Sheet
        sendProgress(3, 'in-progress', 'Mapping Balance Sheet accounts with AI...');
        const balanceSheetPrompt = generatePrompt(balanceSheetData as Record<string, unknown>[], mappingGuide.balanceSheet, 'Balance Sheet');
        const balanceSheetCompletion = await openai.chat.completions.create({
          messages: [
            {
              role: "system",
              content: `You are an expert accounting assistant specializing in mapping trial balance accounts to SARS tax categories.

<task>
Your task is to analyze trial balance data and map each account to the appropriate SARS category based on the provided mapping guide.
</task>

<output_format>
Return a valid JSON array where each object contains:
- accountCode: string
- accountName: string
- section: string
- subsection: string
- balance: number (not string)
- sarsItem: string

Do not include any explanation, commentary, or text outside the JSON array.
</output_format>

<instructions>
- Match accounts to the most appropriate sarsItem based on account name and mapping guide
- Preserve original account details exactly as provided
- Ensure all balance values are numbers, not strings
- Follow the mapping guide structure precisely
</instructions>`
            },
            {
              role: "user",
              content: balanceSheetPrompt
            }
          ],
          model: "gpt-5-nano-2025-08-07",
          response_format: { type: "json_object" }
        });
        const balanceSheetMapped = parseLLMResponse(balanceSheetCompletion.choices[0].message.content);
        sendProgress(3, 'complete', 'Balance Sheet mapped successfully');

        // Stage 4: Save to database
        sendProgress(4, 'in-progress', 'Saving mapped accounts to database...');
        const combinedResults = [...incomeStatementMapped, ...balanceSheetMapped];
        
        await prisma.$transaction(async (tx) => {
          await tx.mappedAccount.deleteMany({
            where: { projectId }
          });

          for (const item of combinedResults) {
            await tx.mappedAccount.create({
              data: {
                projectId,
                accountCode: item.accountCode.toString(),
                accountName: item.accountName,
                section: item.section,
                subsection: item.subsection,
                balance: item.balance,
                priorYearBalance: item.priorYearBalance || 0,
                sarsItem: item.sarsItem
              }
            });
          }
        });
        sendProgress(4, 'complete', 'All accounts saved successfully');

        // Send final result
        const resultData = JSON.stringify({ type: 'complete', data: combinedResults });
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
    console.log('=== Starting POST /api/map ===');
    const formData = await request.formData();
    const trialBalanceFile = formData.get('trialBalance') as File;
    const projectIdStr = formData.get('projectId') as string;
    const streamProgress = formData.get('stream') === 'true';
    console.log('Project ID:', projectIdStr, 'Stream:', streamProgress);

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
    const trialBalanceWorkbook = read(trialBalanceBuffer);
    const trialBalanceSheet = trialBalanceWorkbook.Sheets[trialBalanceWorkbook.SheetNames[0]];
    const trialBalanceData = utils.sheet_to_json(trialBalanceSheet);

    // Split trial balance data
    const incomeStatementData = trialBalanceData.filter(
      (row: unknown) => {
        const typedRow = row as Record<string, unknown>;
        return typedRow['Section']?.toString().toLowerCase() === 'income statement';
      }
    );
    const balanceSheetData = trialBalanceData.filter(
      (row: unknown) => {
        const typedRow = row as Record<string, unknown>;
        return typedRow['Section']?.toString().toLowerCase() === 'balance sheet';
      }
    );

    // Process Income Statement first
    console.log('Processing Income Statement with', incomeStatementData.length, 'rows');
    const incomeStatementPrompt = generatePrompt(incomeStatementData as Record<string, unknown>[], mappingGuide.incomeStatement, 'Income Statement');
    console.log('Calling OpenAI API for Income Statement...');
    let incomeStatementCompletion;
    try {
      incomeStatementCompletion = await openai.chat.completions.create({
        messages: [
          {
            role: "system",
            content: `You are an expert accounting assistant specializing in mapping trial balance accounts to SARS tax categories.

<task>
Your task is to analyze trial balance data and map each account to the appropriate SARS category based on the provided mapping guide.
</task>

<output_format>
Return a valid JSON array where each object contains:
- accountCode: string
- accountName: string
- section: string
- subsection: string
- balance: number (not string)
- priorYearBalance: number (not string, defaults to 0 if missing)
- sarsItem: string

Do not include any explanation, commentary, or text outside the JSON array.
</output_format>

<instructions>
- Match accounts to the most appropriate sarsItem based on account name and current year balance
- Preserve original account details exactly as provided, including both Balance and Prior Year Balance
- Ensure all balance values are numbers, not strings
- If Prior Year Balance column is missing, set priorYearBalance to 0
- Follow the mapping guide structure precisely
</instructions>`
          },
          {
            role: "user",
            content: incomeStatementPrompt
          }
        ],
        model: "gpt-5-nano-2025-08-07",
        response_format: { type: "json_object" }
      });
    } catch (apiError: any) {
      console.error('OpenAI API Error for Income Statement:', apiError);
      console.error('Error details:', {
        message: apiError.message,
        status: apiError.status,
        code: apiError.code,
        type: apiError.type
      });
      throw new Error(`OpenAI API Error: ${apiError.message || apiError}`);
    }

    console.log('Income Statement Response:', incomeStatementCompletion.choices[0].message.content);
    const incomeStatementMapped = parseLLMResponse(incomeStatementCompletion.choices[0].message.content);
    console.log('Income Statement Mapped:', incomeStatementMapped);

    // Process Balance Sheet
    console.log('Processing Balance Sheet with', balanceSheetData.length, 'rows');
    const balanceSheetPrompt = generatePrompt(balanceSheetData as Record<string, unknown>[], mappingGuide.balanceSheet, 'Balance Sheet');
    console.log('Calling OpenAI API for Balance Sheet...');
    const balanceSheetCompletion = await openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You are an expert accounting assistant specializing in mapping trial balance accounts to SARS tax categories.

<task>
Your task is to analyze trial balance data and map each account to the appropriate SARS category based on the provided mapping guide.
</task>

<output_format>
Return a valid JSON array where each object contains:
- accountCode: string
- accountName: string
- section: string
- subsection: string
- balance: number (not string)
- sarsItem: string

Do not include any explanation, commentary, or text outside the JSON array.
</output_format>

<instructions>
- Match accounts to the most appropriate sarsItem based on account name and mapping guide
- Preserve original account details exactly as provided
- Ensure all balance values are numbers, not strings
- Follow the mapping guide structure precisely
</instructions>`
        },
        {
          role: "user",
          content: balanceSheetPrompt
        }
      ],
      model: "gpt-5-nano-2025-08-07",
      response_format: { type: "json_object" }
    });

    console.log('Balance Sheet Response:', balanceSheetCompletion.choices[0].message.content);
    const balanceSheetMapped = parseLLMResponse(balanceSheetCompletion.choices[0].message.content);
    console.log('Balance Sheet Mapped:', balanceSheetMapped);

    // Combine results
    const combinedResults = [...incomeStatementMapped, ...balanceSheetMapped];

    // Save mapped accounts to database
    await prisma.$transaction(async (tx) => {
      // Delete existing mapped accounts for this project
      await tx.mappedAccount.deleteMany({
        where: { projectId }
      });

      // Log the data we're about to insert
      console.log('Data to insert:', combinedResults.map(item => ({
        projectId,
        accountCode: item.accountCode.toString(),
        accountName: item.accountName,
        section: item.section,
        subsection: item.subsection,
        balance: item.balance,
        priorYearBalance: item.priorYearBalance || 0,
        sarsItem: item.sarsItem
      })));

      // Insert new mapped accounts one by one
      for (const item of combinedResults) {
        await tx.mappedAccount.create({
          data: {
            projectId,
            accountCode: item.accountCode.toString(),
            accountName: item.accountName,
            section: item.section,
            subsection: item.subsection,
            balance: item.balance,
            priorYearBalance: item.priorYearBalance || 0,
            sarsItem: item.sarsItem
          }
        });
      }
    });

    return NextResponse.json(combinedResults);

  } catch (error) {
    console.error('Error processing files:', error);
    console.error('Error stack:', (error as Error).stack);
    return NextResponse.json(
      { error: 'Error processing files: ' + (error as Error).message, stack: (error as Error).stack },
      { status: 500 }
    );
  }
}

function generatePrompt(trialBalanceData: Record<string, unknown>[], mappingGuide: Record<string, unknown>, section: string) {
  const trialBalanceStr = JSON.stringify(trialBalanceData, null, 2);
  const mappingGuideStr = JSON.stringify(mappingGuide, null, 2);

  return `<task>
Map the following ${section} trial balance accounts to their appropriate SARS categories based on the provided mapping guide.
</task>

<trial_balance_data>
${trialBalanceStr}
</trial_balance_data>

<mapping_guide>
${mappingGuideStr}
</mapping_guide>

<rules>
1. Each account must have: accountCode, accountName, section, subsection, balance (as number), priorYearBalance (as number), sarsItem
2. Match accounts to the most appropriate sarsItem based on the account name and the current year balance (Balance column)
3. Keep original account details exactly as provided, including both Balance and "Prior Year Balance" columns
4. Balance and priorYearBalance must be numbers, not strings
5. If "Prior Year Balance" is missing, set priorYearBalance to 0
6. In the trial balance:
   - Income statement: negative amounts = income, positive amounts = expenses
   - Balance sheet: negative amounts = liabilities or equity, positive amounts = assets
7. For long-term loans:
   - If balance is negative: section = "Balance Sheet", subsection = "nonCurrentLiabilities"
   - If balance is positive: section = "Balance Sheet", subsection = "nonCurrentAssets"
8. For accumulated depreciation: set sarsItem to "Other non-current assets"
9. For all other items: set subsection based on the mapping guide structure
</rules>

<output_format>
Return a JSON object with a single "accounts" key containing an array of mapped accounts:
{
  "accounts": [
    {
      "accountCode": "1000",
      "accountName": "Cash at Bank",
      "section": "${section}",
      "subsection": "currentAssets",
      "balance": 50000.00,
      "priorYearBalance": 45000.00,
      "sarsItem": "Cash and cash equivalents"
    }
  ]
}
</output_format>`;
}

function parseLLMResponse(llmResponse: string | null) {
  try {
    if (!llmResponse) throw new Error('Empty response from LLM');
    
    // Parse the JSON object response
    const parsed = JSON.parse(llmResponse.trim());
    
    // Extract the accounts array from the response
    const accounts = parsed.accounts || parsed;
    
    // Validate the structure
    if (!Array.isArray(accounts)) {
      throw new Error('Response does not contain an array of accounts');
    }

    // Validate each object in the array
    accounts.forEach((item, index) => {
      if (!item.accountCode || !item.accountName || !item.section || 
          !item.subsection || typeof item.balance !== 'number' || !item.sarsItem) {
        throw new Error(`Invalid object structure at index ${index}: ${JSON.stringify(item)}`);
      }
      // Ensure priorYearBalance is a number, default to 0 if missing
      if (typeof item.priorYearBalance !== 'number') {
        item.priorYearBalance = 0;
      }
    });

    return accounts;
  } catch (error) {
    console.error('Error parsing LLM response:', error);
    console.error('Raw response:', llmResponse);
    throw new Error('Failed to parse the mapping result: ' + (error as Error).message);
  }
} 