# Azure OpenAI Setup Instructions

## Quick Start

Your application is now configured to use Azure AI Foundry (Azure OpenAI Service).

### Required Setup

Add your Azure OpenAI API key to your environment file:

**File:** `.env.local`

```bash
AZURE_OPENAI_API_KEY=your-azure-api-key-here
```

### How to Get Your Azure API Key

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to your Azure OpenAI resource: `walte-mflcntql-swedencentral`
3. Go to "Keys and Endpoint" in the left sidebar
4. Copy **KEY 1** or **KEY 2**
5. Add it to your `.env.local` file

### Configuration Details

- **Endpoint:** `https://walte-mflcntql-swedencentral.cognitiveservices.azure.com/`
- **Region:** Sweden Central
- **Deployment:** `gpt-5-mini`
- **API Version:** Latest (handled by AI SDK)

### Verify Setup

After adding the API key, test the configuration:

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Try one of the AI features:
   - Upload a trial balance (Account Mapping)
   - Generate an AI tax report
   - Extract data from a document

### What Changed

Only one file was modified:
- `src/lib/ai/config.ts` - Now uses Azure provider instead of OpenAI

### Rollback (If Needed)

To revert to direct OpenAI API:

1. Edit `src/lib/ai/config.ts`:
   ```typescript
   import { createOpenAI } from '@ai-sdk/openai';
   
   const openai = createOpenAI({
     apiKey: process.env.OPENAI_API_KEY || '',
   });
   
   export const models = {
     mini: openai('gpt-5-mini'),
     nano: openai('gpt-5-nano-2025-08-07'),
   } as const;
   
   export { openai };
   ```

2. Set `OPENAI_API_KEY` in `.env.local`

### Benefits

✅ **Cost Control** - Use your Azure credits and pricing  
✅ **Lower Latency** - Sweden Central region  
✅ **Enterprise Features** - Azure monitoring and compliance  
✅ **Same Functionality** - No code changes needed in your app  

### Troubleshooting

**Error: "API key not found"**
- Make sure `AZURE_OPENAI_API_KEY` is set in `.env.local`
- Restart your development server after adding the key

**Error: "Deployment not found"**
- Verify the deployment name is `gpt-5-mini` in Azure Portal
- Check that the deployment is active

**Error: "Resource not found"**
- Verify the resource name `walte-mflcntql-swedencentral` is correct
- Check Azure Portal for the correct resource name

### Support

For Azure-specific issues:
- [Azure OpenAI Documentation](https://learn.microsoft.com/en-us/azure/ai-services/openai/)
- [AI SDK Documentation](https://sdk.vercel.ai/docs)

For application issues, check the logs:
- Development: Check browser console and terminal
- Production: Check `logs/combined.log` and `logs/error.log`

