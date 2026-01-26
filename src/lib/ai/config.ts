import { createAzure } from '@ai-sdk/azure';

/**
 * Initialize Azure OpenAI provider with API key
 * Resource name is configurable via AZURE_OPENAI_RESOURCE_NAME environment variable
 */
const azure = createAzure({
  resourceName: process.env.AZURE_OPENAI_RESOURCE_NAME || 'walte-mflcntql-swedencentral',
  apiKey: process.env.AZURE_OPENAI_API_KEY || '',
});

/**
 * Get deployment name from environment variable
 * Defaults to 'gpt-5-mini' if not specified
 */
const deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-5-mini';

/**
 * Get embedding deployment name from environment variable
 * Defaults to 'text-embedding-3-small' if not specified
 */
const embeddingDeploymentName = process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT || 'text-embedding-3-small';

/**
 * Model configurations for different use cases
 * All models use the same deployment on Azure (configurable via AZURE_OPENAI_DEPLOYMENT)
 */
export const models = {
  // GPT-5 Mini - for most AI generation tasks
  mini: azure(deploymentName),
  
  // Using same deployment for nano tasks (document extraction)
  nano: azure(deploymentName),
  
  // Text embedding model for RAG and semantic search
  // Use the .textEmbeddingModel() method for embedding models
  embedding: azure.textEmbeddingModel(embeddingDeploymentName),
} as const;

/**
 * Default model for general use
 */
export const defaultModel = models.mini;

/**
 * Check if the model is a reasoning model (o1/o3 series)
 * These models don't support temperature, top_p, presence_penalty, or frequency_penalty
 */
export const isReasoningModel = (modelName: string = deploymentName): boolean => {
  const name = modelName.toLowerCase();
  return name.includes('o1') || name.includes('o3') || name.includes('gpt-5');
};

/**
 * Get safe model parameters based on model type
 */
export const getModelParams = (overrides: any = {}) => {
  if (isReasoningModel()) {
    // Reasoning models only support basic parameters
    const { temperature, top_p, presence_penalty, frequency_penalty, ...safeParams } = overrides;
    return safeParams;
  }
  return overrides;
};

/**
 * Export the provider for advanced use cases
 */
export { azure };


