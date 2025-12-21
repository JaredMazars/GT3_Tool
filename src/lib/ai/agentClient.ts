/**
 * Azure AI Agent Service Client
 * Client for calling Azure AI Foundry Agent Service with Grounding with Bing Search
 * Uses @azure/ai-agents SDK with Azure AD authentication
 * Based on official Azure documentation pattern
 */

import { AgentsClient, ToolUtility, isOutputOfType } from '@azure/ai-agents';
import { delay } from '@azure/core-util';
import { DefaultAzureCredential } from '@azure/identity';
import { logger } from '@/lib/utils/logger';
import { env } from '@/lib/config/env';

/**
 * Citation from Bing grounding
 */
interface Citation {
  title: string;
  url: string;
  snippet?: string;
}

/**
 * Agent response with grounding
 */
export interface AgentResponse {
  content: string;
  citations: Citation[];
  groundingUsed: boolean;
}

/**
 * Azure AI Agent Service Client using official @azure/ai-agents SDK
 * Uses DefaultAzureCredential for Azure AD authentication
 * Creates agent dynamically with Bing grounding tool
 */
export class AzureAIAgentClient {
  private client: AgentsClient | null = null;
  private endpoint: string;
  private connectionId: string;
  private configured: boolean;

  constructor() {
    this.endpoint = env.azureAIFoundryEndpoint ?? '';
    this.connectionId = env.azureBingConnectionId ?? '';
    this.configured = !!(this.endpoint && this.connectionId);

    if (this.configured) {
      try {
        this.client = new AgentsClient(this.endpoint, new DefaultAzureCredential());
        logger.info('AgentsClient initialized', { endpoint: this.endpoint });
      } catch (error) {
        logger.error('Failed to initialize AgentsClient', { error });
        this.configured = false;
      }
    }
  }

  /**
   * Check if the agent service is configured
   */
  static isConfigured(): boolean {
    return !!(env.azureAIFoundryEndpoint && env.azureBingConnectionId);
  }

  /**
   * Check if this instance is ready
   */
  isReady(): boolean {
    return this.configured && this.client !== null;
  }

  /**
   * Send a message to the agent and get a grounded response
   * Creates agent dynamically with Bing grounding tool attached
   */
  async chat(message: string): Promise<AgentResponse> {
    if (!this.isReady() || !this.client) {
      throw new Error('Azure AI Agent Service is not configured');
    }

    let agentId: string | null = null;

    try {
      logger.info('Starting AI Foundry agent conversation with Bing grounding');

      // Initialize Bing grounding tool with connection ID
      const bingTool = ToolUtility.createBingGroundingTool([{ connectionId: this.connectionId }]);

      // Create agent with Bing tool
      const agent = await this.client.createAgent('gpt-4.1', {
        name: 'bd-research-agent',
        instructions: 'You are a professional business intelligence analyst. Provide comprehensive, well-researched responses with citations.',
        tools: [bingTool.definition],
      });
      agentId = agent.id;
      logger.info('Created agent with Bing grounding', { agentId: agent.id });

      // Create thread for communication
      const thread = await this.client.threads.create();
      logger.info('Created thread', { threadId: thread.id });

      // Create message to thread
      const msg = await this.client.messages.create(thread.id, 'user', message);
      logger.info('Created message', { messageId: msg.id });

      // Create and process agent run
      let run = await this.client.runs.create(thread.id, agentId);
      logger.info('Started run', { runId: run.id, status: run.status });

      // Poll until the run reaches a terminal status
      while (run.status === 'queued' || run.status === 'in_progress') {
        await delay(1000);
        run = await this.client.runs.get(thread.id, run.id);
        logger.info('Polling run status', { runId: run.id, status: run.status });
      }

      if (run.status === 'failed') {
        logger.error('Run failed', { error: run.lastError });
        throw new Error(`Agent run failed: ${run.lastError?.message || 'Unknown error'}`);
      }

      logger.info('Run completed', { status: run.status });

      // Fetch and extract messages
      const messagesIterator = this.client.messages.list(thread.id);

      // Extract response using isOutputOfType
      const response = await this.extractResponse(messagesIterator);

      // Clean up - delete the agent when done
      await this.client.deleteAgent(agentId);
      logger.info('Deleted agent', { agentId });

      return response;
    } catch (error) {
      logger.error('Error calling Azure AI Foundry Agent', { error });

      // Try to clean up agent on error
      if (agentId && this.client) {
        try {
          await this.client.deleteAgent(agentId);
        } catch {
          // Ignore cleanup errors
        }
      }

      throw error;
    }
  }

  /**
   * Extract the response and citations from messages
   * Uses isOutputOfType helper from Azure SDK
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async extractResponse(messagesIterator: any): Promise<AgentResponse> {
    let content = '';
    const citations: Citation[] = [];

    // Get messages and find assistant response
    for await (const m of messagesIterator) {
      if (m.role === 'assistant' && m.content && m.content.length > 0) {
        const agentMessage = m.content[0];

        // Use isOutputOfType helper from SDK
        if (isOutputOfType(agentMessage, 'text')) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const textContent = agentMessage as any;

          // Extract text value
          content = textContent.text.value;

          // Extract citations from annotations if present
          if (textContent.text?.annotations) {
            for (const annotation of textContent.text.annotations) {
              // Check for url_citation (SDK uses camelCase: urlCitation)
              if (annotation.type === 'url_citation' && annotation.urlCitation) {
                citations.push({
                  title: annotation.urlCitation.title || annotation.text || 'Source',
                  url: annotation.urlCitation.url || '',
                  snippet: annotation.text,
                });
              }
              // Check for bing_grounding format (alternative)
              else if (annotation.type === 'bing_grounding' || annotation.bingGrounding) {
                const bingData = annotation.bingGrounding || annotation;
                citations.push({
                  title: bingData.title || annotation.text || 'Source',
                  url: bingData.url || '',
                  snippet: annotation.text,
                });
              }
              // Check for web_search format
              else if (annotation.type === 'web_search' || annotation.webSearch) {
                const webData = annotation.webSearch || annotation;
                citations.push({
                  title: webData.title || annotation.text || 'Source',
                  url: webData.url || '',
                  snippet: annotation.text,
                });
              }
            }
          }
        }
      }
    }

    if (!content) {
      return {
        content: 'No response from agent',
        citations: [],
        groundingUsed: false,
      };
    }

    return {
      content,
      citations,
      groundingUsed: citations.length > 0,
    };
  }
}

// Singleton instance
export const azureAIAgentClient = new AzureAIAgentClient();
