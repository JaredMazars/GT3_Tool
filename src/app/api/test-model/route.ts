import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function GET() {
  try {
    console.log('Testing gpt-5-nano-2025-08-07 model...');
    
    const completion = await openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant."
        },
        {
          role: "user",
          content: "Say 'test successful' in JSON format with a key 'status'."
        }
      ],
      model: "gpt-5-nano-2025-08-07",
      response_format: { type: "json_object" }
    });

    return NextResponse.json({
      success: true,
      model: "gpt-5-nano-2025-08-07",
      response: completion.choices[0].message.content
    });

  } catch (error: any) {
    console.error('Model test error:', error);
    return NextResponse.json({
      success: false,
      model: "gpt-5-nano-2025-08-07",
      error: error.message,
      errorType: error.type,
      errorCode: error.code,
      status: error.status
    }, { status: 500 });
  }
}

