import { NextRequest, NextResponse } from 'next/server';
import { read, utils } from 'xlsx';
import OpenAI from 'openai';
import { mappingGuide } from '@/lib/mappingGuide';
import { prisma } from '@/lib/prisma';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const trialBalanceFile = formData.get('trialBalance') as File;
    const projectIdStr = formData.get('projectId') as string;

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
    const incomeStatementPrompt = generatePrompt(incomeStatementData as Record<string, unknown>[], mappingGuide.incomeStatement, 'Income Statement');
    const incomeStatementCompletion = await openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You are an accounting assistant that maps trial balance accounts to SARS categories. 
          You must return ONLY a valid JSON array with no additional text or explanation.
          Each object in the array must include: accountCode, accountName, section, subsection, balance (as number), and sarsItem.`
        },
        {
          role: "user",
          content: incomeStatementPrompt
        }
      ],
      model: "gpt-4o",
      temperature: 0.5,
    });

    const incomeStatementMapped = parseLLMResponse(incomeStatementCompletion.choices[0].message.content);

    // Process Balance Sheet
    const balanceSheetPrompt = generatePrompt(balanceSheetData as Record<string, unknown>[], mappingGuide.balanceSheet, 'Balance Sheet');
    const balanceSheetCompletion = await openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You are an accounting assistant that maps trial balance accounts to an account structure. 
          You must return ONLY a valid JSON array with no additional text or explanation.
          Each object in the array must include: accountCode, accountName, section, subsection, balance (as number), sarsItem.`
        },
        {
          role: "user",
          content: balanceSheetPrompt
        }
      ],
      model: "gpt-4.1",
      temperature: 0.5,
    });

    const balanceSheetMapped = parseLLMResponse(balanceSheetCompletion.choices[0].message.content);

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
            sarsItem: item.sarsItem
          }
        });
      }
    });

    return NextResponse.json(combinedResults);

  } catch (error) {
    console.error('Error processing files:', error);
    return NextResponse.json(
      { error: 'Error processing files: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

function generatePrompt(trialBalanceData: Record<string, unknown>[], mappingGuide: Record<string, unknown>, section: string) {
  const trialBalanceStr = JSON.stringify(trialBalanceData, null, 2);
  const mappingGuideStr = JSON.stringify(mappingGuide, null, 2);

  return `Map the following ${section} trial balance accounts to their appropriate FSA categories.

Trial Balance Data:
${trialBalanceStr}

Mapping Guide:
${mappingGuideStr}

Rules:
1. Return ONLY a JSON array with no additional text
2. Each object must have: accountCode, accountName, section, subsection, balance (as number), sarsItem
3. Match accounts to the most appropriate sarsItem based on the account name and the mapping guide structure
4. Keep original account details exactly as provided
5. Balance must be a number, not a string
6. The response must be a valid JSON array starting with '[' and ending with ']'
7. In the trial balance the income statement balances - amounts means income and + amounts are expenses. In the balance sheet - amounts means liabilities or equity and + amounts are assets.
8. For long-term loans:
   - If balance is negative, set section to "Balance Sheet" and subsection to "nonCurrentLiabilities"
   - If balance is positive, set section to "Balance Sheet" and subsection to "nonCurrentAssets"
9. For balance sheet items if it refers to accumulated depreciation, set the sarsItem to a Other non-current assets
9. For all other items, set the subsection based on the mapping guide structure

Example Response Format:
[
  {
    "accountCode": "1000",
    "accountName": "Cash at Bank",
    "section": "${section}",
    "subsection": "currentAssets",
    "balance": 50000.00,
    "sarsItem": "Cash and cash equivalents"
  }
]`;
}

function parseLLMResponse(llmResponse: string | null) {
  try {
    if (!llmResponse) throw new Error('Empty response from LLM');
    
    // Clean the response to find the JSON array
    const cleaned = llmResponse.trim();
    const startIndex = cleaned.indexOf('[');
    const endIndex = cleaned.lastIndexOf(']');
    
    if (startIndex === -1 || endIndex === -1) {
      console.error('Invalid response format. Full response:', llmResponse);
      throw new Error('No JSON array found in the LLM response');
    }

    const jsonString = cleaned.slice(startIndex, endIndex + 1);
    const parsed = JSON.parse(jsonString);
    
    // Validate the structure
    if (!Array.isArray(parsed)) {
      throw new Error('Response is not an array');
    }

    // Validate each object in the array
    parsed.forEach((item, index) => {
      if (!item.accountCode || !item.accountName || !item.section || 
          !item.subsection || typeof item.balance !== 'number' || !item.sarsItem) {
        throw new Error(`Invalid object structure at index ${index}: ${JSON.stringify(item)}`);
      }
    });

    return parsed;
  } catch (error) {
    console.error('Error parsing LLM response:', error);
    console.error('Raw response:', llmResponse);
    throw new Error('Failed to parse the mapping result: ' + (error as Error).message);
  }
} 