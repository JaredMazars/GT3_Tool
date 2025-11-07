import { createAzure } from '@ai-sdk/azure';

/**
 * Initialize Azure OpenAI provider with API key
 * Endpoint: https://walte-mflcntql-swedencentral.cognitiveservices.azure.com/
 */
const azure = createAzure({
  resourceName: 'walte-mflcntql-swedencentral',
  apiKey: process.env.AZURE_OPENAI_API_KEY || '',
});

/**
 * Model configurations for different use cases
 * All models use the gpt-5-mini deployment on Azure
 */
export const models = {
  // GPT-5 Mini - for most AI generation tasks
  mini: azure('gpt-5-mini'),
  
  // Using same deployment for nano tasks (document extraction)
  nano: azure('gpt-5-mini'),
} as const;

/**
 * Default model for general use
 */
export const defaultModel = models.mini;

/**
 * Export the provider for advanced use cases
 */
export { azure };

