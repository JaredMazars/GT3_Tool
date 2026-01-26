/**
 * Azure AI Project Client
 * Client for calling Azure AI Projects with existing agent that has Bing Search grounding
 * Uses @azure/ai-projects SDK v2.0.0-beta with Azure AD authentication
 * Pattern from official Azure AI Projects documentation
 */

import { AIProjectClient } from '@azure/ai-projects';
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
 * Azure AI Project Client using official @azure/ai-projects SDK v2.0.0-beta
 * Uses DefaultAzureCredential for Azure AD authentication
 * Connects to existing agent with Bing grounding pre-configured
 */
export class AzureAIAgentClient {
  private client: AIProjectClient | null = null;
  private endpoint: string;
  private agentName: string;
  private configured: boolean;

  constructor() {
    this.endpoint = env.azureAIFoundryEndpoint ?? '';
    this.agentName = env.azureAIAgentId ?? '';
    this.configured = !!(this.endpoint && this.agentName);

    if (this.configured) {
      try {
        this.client = new AIProjectClient(this.endpoint, new DefaultAzureCredential());
        logger.info('AIProjectClient initialized', { endpoint: this.endpoint, agentName: this.agentName });
      } catch (error) {
        logger.error('Failed to initialize AIProjectClient', { error });
        this.configured = false;
      }
    }
  }

  /**
   * Check if the agent service is configured
   */
  static isConfigured(): boolean {
    return !!(env.azureAIFoundryEndpoint && env.azureAIAgentId);
  }

  /**
   * Check if this instance is ready
   */
  isReady(): boolean {
    return this.configured && this.client !== null;
  }

  /**
   * Send a message to the agent and get a grounded response
   * Uses existing agent with pre-configured Bing grounding
   * Pattern matches official Azure AI Projects documentation
   */
  async chat(message: string): Promise<AgentResponse> {
    if (!this.isReady() || !this.client) {
      throw new Error('Azure AI Agent Service is not configured');
    }

    try {
      logger.info('Starting AI Projects agent conversation', { agentName: this.agentName });

      // Retrieve Agent by name (with version if specified)
      const retrievedAgent = await this.client.agents.get(this.agentName);
      logger.info('Retrieved agent by name', { 
        agentName: retrievedAgent.versions?.latest?.name || retrievedAgent.name,
        agentId: retrievedAgent.id 
      });

      // Get OpenAI client from the project
      const openAIClient = await this.client.getOpenAIClient();
      logger.info('Retrieved OpenAI client');

      // Create conversation with initial user message
      logger.info('Creating conversation with user message');
      const conversation = await openAIClient.conversations.create({
        items: [{ type: "message", role: "user", content: message }]
      });
      logger.info('Created conversation', { conversationId: conversation.id });

      // Generate response using the agent
      logger.info('Generating response with agent');
      const response = await openAIClient.responses.create(
        { conversation: conversation.id },
        { 
          body: { 
            agent: { 
              name: retrievedAgent.versions?.latest?.name || retrievedAgent.name, 
              type: "agent_reference" 
            }
          } 
        }
      );

      logger.info('Response generated successfully');

      // Extract response and citations
      const extractedResponse = this.extractResponse(response);

      return extractedResponse;
    } catch (error) {
      logger.error('Error calling Azure AI Projects Agent', { error });
      throw error;
    }
  }

  /**
   * Extract the response and citations from OpenAI response object
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private extractResponse(response: any): AgentResponse {
    const citations: Citation[] = [];

    // Extract content from output_text
    const content = response.output_text || '';

    // Extract citations if present
    if (response.citations && Array.isArray(response.citations)) {
      for (const citation of response.citations) {
        citations.push({
          title: citation.title || citation.name || 'Source',
          url: citation.url || citation.uri || '',
          snippet: citation.snippet || citation.content || '',
        });
      }
    }

    // Also check for grounding_data or grounding in response
    if (response.grounding_data?.web_results) {
      for (const result of response.grounding_data.web_results) {
        citations.push({
          title: result.title || 'Source',
          url: result.url || '',
          snippet: result.snippet || '',
        });
      }
    }

    // Check output items for citations
    if (response.output?.items) {
      for (const item of response.output.items) {
        if (item.citations) {
          for (const citation of item.citations) {
            citations.push({
              title: citation.title || 'Source',
              url: citation.url || '',
              snippet: citation.snippet || '',
            });
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
