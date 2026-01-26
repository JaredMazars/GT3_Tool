# Azure AI Projects Migration

## Overview

Successfully migrated the company research functionality from `@azure/ai-agents` SDK to `@azure/ai-projects` SDK to use an existing pre-configured agent instead of creating temporary agents on each request.

## Changes Made

### 1. Agent Client (`src/lib/ai/agentClient.ts`)

**Before:**
- Used `AgentsClient` from `@azure/ai-agents`
- Created temporary agents with Bing grounding tool on each request
- Used threads/messages/runs pattern
- Required cleanup (agent deletion) after each request
- Needed `AZURE_BING_CONNECTION_ID` for Bing grounding

**After:**
- Uses `AIProjectClient` from `@azure/ai-projects`
- Retrieves existing agent by ID (`GT3-Business-Researcher:2`)
- Uses conversation/response pattern
- No cleanup needed (agent persists)
- Agent has Bing grounding pre-configured

**Key Code Changes:**
```typescript
// Old pattern
const agent = await client.createAgent('gpt-4.1', { tools: [bingTool] });
const thread = await client.threads.create();
const run = await client.runs.create(thread.id, agent.id);
// ... polling logic ...
await client.deleteAgent(agent.id);

// New pattern
const agent = await client.agents.get(agentId);
const openAIClient = await client.getOpenAIClient();
const conversation = await openAIClient.conversations.create({
  items: [{ type: "message", role: "user", content: message }]
});
const response = await openAIClient.responses.create(
  { conversation: conversation.id },
  { body: { agent: { name: agent.versions.latest.name, type: "agent_reference" } } }
);
```

### 2. Configuration (`src/lib/config/env.ts`)

**Environment Variables:**
- ✅ `AZURE_EXISTING_AIPROJECT_ENDPOINT` → `azureAIFoundryEndpoint`
- ✅ `AZURE_EXISTING_AGENT_ID` → `azureAIAgentId` (e.g., "GT3-Business-Researcher:2")
- ⚠️ `AZURE_BING_CONNECTION_ID` → No longer required (agent has it built-in)

**Configuration Check:**
```typescript
// Updated to check for agent ID instead of connection ID
static isConfigured(): boolean {
  return !!(env.azureAIFoundryEndpoint && env.azureAIAgentId);
}
```

### 3. Response Extraction

Updated citation extraction to handle Azure AI Projects response format:
- Response has `output_text` property
- Citations can be in `response.citations`, `response.grounding_data.web_results`, or `response.output.items[].citations`
- Handles multiple citation formats for robustness

### 4. Company Research Agent

No changes required! The `CompanyResearchAgent` class continues to work as-is because:
- Uses the same `AzureAIAgentClient.isConfigured()` static method (updated)
- Uses the same `azureAIAgentClient.chat()` method (updated internally)
- Receives the same `AgentResponse` interface (content + citations)

## Benefits

1. **Performance**: No agent creation/deletion overhead on each request
2. **Simplicity**: Simpler conversation/response pattern vs threads/messages/runs
3. **Cost**: Reduced API calls (no agent CRUD operations)
4. **Reliability**: Pre-configured agent with Bing grounding
5. **Maintainability**: Less code, fewer moving parts

## Environment Setup

Add these environment variables to `.env.local`:

```bash
# Azure AI Projects - Existing Agent
AZURE_EXISTING_AIPROJECT_ENDPOINT="https://gt3-openai.services.ai.azure.com/api/projects/gt3-openai-project"
AZURE_EXISTING_AGENT_ID="GT3-Business-Researcher:2"

# Optional: Remove if not needed elsewhere
# AZURE_BING_CONNECTION_ID=""
```

## Testing

### 1. Quick Test Script

Run the test script to verify basic integration:

```bash
npx tsx test-agent-integration.ts
```

This will:
- Check if the agent is configured
- Send a simple test message
- Display the response and citations
- Verify grounding is working

### 2. Company Research Test

Test the full company research functionality:

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Navigate to Business Development section
3. Try the company research feature with a test company name
4. Verify:
   - Research completes successfully
   - Citations are present
   - Results are structured correctly
   - Fallback to Bing Search API still works (if configured)

### 3. Expected Behavior

✅ **Success indicators:**
- Agent retrieves successfully
- Conversation creates with user message
- Response generates with output_text
- Citations are extracted (when grounding is used)
- Company research returns structured results

⚠️ **Fallback behavior:**
- If Azure AI Projects fails → Falls back to Bing Search API (if configured)
- If both fail → Returns empty result with appropriate messaging

## Troubleshooting

### "Azure AI Agent Service is not configured"

**Cause:** Missing environment variables

**Solution:**
```bash
# Check environment variables are set
echo $AZURE_EXISTING_AIPROJECT_ENDPOINT
echo $AZURE_EXISTING_AGENT_ID
```

### "Failed to retrieve agent"

**Cause:** Invalid agent ID or insufficient permissions

**Solution:**
1. Verify agent ID is correct: `GT3-Business-Researcher:2`
2. Ensure Azure AD credentials have access to the project
3. Check `DefaultAzureCredential` is configured (Azure CLI login, Managed Identity, etc.)

### No citations returned

**Cause:** Agent may not be using grounding, or citations extraction needs adjustment

**Solution:**
1. Verify agent has Bing grounding enabled in Azure AI Foundry
2. Check response object structure in logs
3. Update citation extraction logic if needed

### "Cannot find module '@azure/ai-projects'"

**Cause:** Package not installed

**Solution:**
```bash
npm install
# Or specifically:
npm install @azure/ai-projects@^1.0.1
```

## Migration Notes

### Breaking Changes

None! The public API remains the same:
- `AzureAIAgentClient.isConfigured()` still works
- `azureAIAgentClient.chat(message)` still returns `AgentResponse`
- All calling code remains unchanged

### Dependencies

- ✅ Updated: `@azure/ai-projects@2.0.0-beta.2` (required for agents.get() API)
- ✅ Keep: `@azure/ai-agents` (used internally by ai-projects)
- ✅ Keep: `@azure/identity` (used for authentication)

### Optional Cleanup

After verifying the migration works:

1. Remove unused dependency:
   ```bash
   npm uninstall @azure/ai-agents
   ```

2. Remove unused environment variable from `.env.local`:
   ```bash
   # AZURE_BING_CONNECTION_ID=""  # No longer needed
   ```

3. Update `env.ts` to remove `azureBingConnectionId` if not used elsewhere

## Rollback Plan

If needed, revert by:

1. Checkout previous version of `agentClient.ts`
2. Ensure `@azure/ai-agents` is installed
3. Restore `AZURE_BING_CONNECTION_ID` environment variable
4. Remove `AZURE_EXISTING_AGENT_ID` environment variable

## Related Files

- `src/lib/ai/agentClient.ts` - Main agent client implementation
- `src/lib/services/bd/companyResearchAgent.ts` - Uses the agent client
- `src/lib/config/env.ts` - Environment configuration
- `src/app/api/bd/company-research/route.ts` - API endpoint
- `src/hooks/bd/useCompanyResearch.ts` - React hook
- `test-agent-integration.ts` - Test script

## References

- [Azure AI Projects SDK Documentation](https://learn.microsoft.com/en-us/azure/ai-services/agents/)
- [Azure AI Foundry Documentation](https://learn.microsoft.com/en-us/azure/ai-studio/)
- [DefaultAzureCredential Documentation](https://learn.microsoft.com/en-us/dotnet/api/azure.identity.defaultazurecredential)

