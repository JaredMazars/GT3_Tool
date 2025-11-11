# AI Tax Opinion Assistant - Setup Guide

This guide covers the setup required for the AI-assisted tax opinion workflow.

## Overview

The AI Tax Opinion Assistant is a comprehensive system that helps users develop professional tax opinions through:
- Interactive AI chatbot guidance
- Document upload and RAG-based analysis
- Multi-agent AI system (Interview, Research, Analysis, Drafting, Review)
- Structured opinion section management
- PDF and Word document export

## Required Environment Variables

Add these to your `.env` or `.env.local` file:

```bash
# Azure Document Intelligence (for PDF text extraction) - CONFIGURED ✅
AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT=https://southafricanorth.api.cognitive.microsoft.com/
AZURE_DOCUMENT_INTELLIGENCE_KEY=202955222eec4c1dafef94ea963d6526

# Azure AI Search (for RAG functionality) - CONFIGURED ✅
AZURE_SEARCH_ENDPOINT=https://tax-opinion-search.search.windows.net
AZURE_SEARCH_API_KEY=oFZQdVrwDsU8jRWFJzmbPfGzDUrtsfFcnVrjeI9sxBAzSeAHFr3h
AZURE_SEARCH_INDEX_NAME=opinion-documents

# Azure OpenAI - CONFIGURED ✅
AZURE_OPENAI_API_KEY=your_existing_key
AZURE_OPENAI_DEPLOYMENT=gpt-5-mini
AZURE_OPENAI_EMBEDDING_DEPLOYMENT=text-embedding-3-small
```

## Required npm Packages

Install these additional packages:

```bash
npm install @azure/search-documents mammoth docx
```

Or if using yarn:

```bash
yarn add @azure/search-documents mammoth docx
```

### Package Details:
- `@azure/search-documents` - Azure AI Search SDK for vector storage and semantic search (optional)
- `mammoth` - Extract text from Word documents
- `docx` - Generate Word documents for export

**Note:** PDF text extraction uses Azure Document Intelligence service (no npm package required).

## Database Migration

Run the Prisma migration to create the new tables:

```bash
npx prisma migrate dev --name add_opinion_assistant_tables
```

This will create:
- `OpinionDocument` - Stores uploaded client documents
- `OpinionSection` - Stores opinion sections (Facts, Issue, Law, Application, Conclusion)
- `OpinionChatMessage` - Stores conversation history with AI assistant

## Azure AI Search Setup

### 1. Create Azure AI Search Resource

1. Go to Azure Portal
2. Create a new "Azure Cognitive Search" resource
3. Choose a pricing tier (Basic or higher for vector search)
4. Note the endpoint and admin key

### 2. Create Search Index

The index will be created automatically when the first document is uploaded, or you can create it manually with this schema:

```json
{
  "name": "opinion-documents",
  "fields": [
    {"name": "id", "type": "Edm.String", "key": true},
    {"name": "draftId", "type": "Edm.Int32", "filterable": true},
    {"name": "documentId", "type": "Edm.Int32", "filterable": true},
    {"name": "chunkIndex", "type": "Edm.Int32"},
    {"name": "content", "type": "Edm.String", "searchable": true},
    {"name": "embedding", "type": "Collection(Edm.Single)", "searchable": true, "dimensions": 1536},
    {"name": "fileName", "type": "Edm.String", "filterable": true},
    {"name": "category", "type": "Edm.String", "filterable": true}
  ],
  "vectorSearch": {
    "algorithms": [
      {
        "name": "vector-config",
        "kind": "hnsw"
      }
    ]
  }
}
```

## Features Implemented

### 1. AI Chat Interface
- **Location**: `/dashboard/projects/[id]/opinion-drafting` (Chat tab)
- **Features**:
  - Conversational AI that asks clarifying questions
  - Phase-based workflow (Interview → Research → Analysis → Drafting → Review)
  - Source citations from uploaded documents
  - Quick action suggestions

### 2. Document Management
- **Location**: `/dashboard/projects/[id]/opinion-drafting` (Documents tab)
- **Features**:
  - Drag-and-drop file upload
  - Support for PDF, Word, and text files
  - Automatic text extraction and indexing
  - Category-based organization
  - Processing status indicators

### 3. Section Editor
- **Location**: `/dashboard/projects/[id]/opinion-drafting` (Sections tab)
- **Features**:
  - Generate all sections at once or individually
  - Edit sections with rich text support
  - Drag-and-drop reordering
  - Review status tracking
  - AI-generated content indicators

### 4. Opinion Preview
- **Location**: `/dashboard/projects/[id]/opinion-drafting` (Preview tab)
- **Features**:
  - Formatted preview of complete opinion
  - Table of contents
  - Professional styling
  - Export to PDF or Word

### 5. AI Agents
- **InterviewAgent**: Conducts structured interviews to gather facts
- **ResearchAgent**: Searches documents and identifies relevant law
- **AnalysisAgent**: Analyzes tax positions and identifies risks
- **DraftingAgent**: Generates professional opinion sections
- **ReviewAgent**: Reviews drafts for quality and completeness
- **AgentOrchestrator**: Coordinates all agents in workflow

## API Endpoints Created

1. **Documents**
   - `GET /api/projects/[id]/opinion-drafts/[draftId]/documents` - List documents
   - `POST /api/projects/[id]/opinion-drafts/[draftId]/documents` - Upload document
   - `DELETE /api/projects/[id]/opinion-drafts/[draftId]/documents?documentId=X` - Delete document

2. **Chat**
   - `GET /api/projects/[id]/opinion-drafts/[draftId]/chat` - Get chat history
   - `POST /api/projects/[id]/opinion-drafts/[draftId]/chat` - Send message
   - `DELETE /api/projects/[id]/opinion-drafts/[draftId]/chat` - Clear history

3. **Sections**
   - `GET /api/projects/[id]/opinion-drafts/[draftId]/sections` - List sections
   - `POST /api/projects/[id]/opinion-drafts/[draftId]/sections` - Create/generate section
   - `PUT /api/projects/[id]/opinion-drafts/[draftId]/sections` - Update section
   - `DELETE /api/projects/[id]/opinion-drafts/[draftId]/sections?sectionId=X` - Delete section

4. **Export**
   - `POST /api/projects/[id]/opinion-drafts/[draftId]/export` - Export as PDF or Word

## Usage Workflow

### Step 1: Create Opinion Draft
1. Navigate to "Opinion Drafting" in project
2. Click "New Opinion"
3. Give it a meaningful title

### Step 2: Chat with AI Assistant
1. Go to "AI Assistant" tab
2. Answer questions about the tax scenario
3. AI will guide you through fact-gathering

### Step 3: Upload Documents
1. Switch to "Documents" tab
2. Upload relevant client documents:
   - Financial Statements
   - Tax Returns
   - Correspondence
   - Assessments
3. Wait for documents to be indexed (shows "Ready for AI search")

### Step 4: Generate Sections
1. Go to "Sections" tab
2. Click "Generate All Sections" for complete opinion
3. Or generate individual sections for more control
4. Review and edit generated content
5. Mark sections as reviewed when finalized

### Step 5: Preview and Export
1. Go to "Preview" tab
2. Review the complete formatted opinion
3. Click "Export PDF" or "Export Word" to download

## RAG (Retrieval Augmented Generation)

The system uses Azure AI Search to:
- Extract text from uploaded documents
- Chunk text into manageable pieces
- Generate embeddings using Azure OpenAI
- Store in vector database
- Perform semantic search during analysis
- Provide citations for all AI-generated content

## Human-in-the-Loop Design

The system is designed with human oversight at every stage:
- Users guide the conversation with the AI
- All AI-generated content can be edited
- Review status tracking ensures human verification
- Multiple draft versions maintained
- Export only when user is satisfied

## Troubleshooting

### Documents not indexing
- Check Azure Search endpoint and API key
- Verify Azure Search service is running
- Check file format is supported (PDF, Word, text)

### AI responses seem off
- Ensure conversation history is building correctly
- Check that relevant documents are uploaded
- Verify Azure OpenAI deployment is accessible

### Export not working
- Ensure all sections are generated
- Check that jsPDF and docx packages are installed
- Verify no special characters in draft title

## Security Considerations

- All uploads go through authentication
- Documents stored in project-specific folders
- Vector embeddings don't contain raw content
- Export downloads are server-generated (not client-side)

## Performance Notes

- Document indexing happens asynchronously
- Large documents may take time to process
- RAG searches are optimized with filters
- PDF generation is done server-side for consistency

## Future Enhancements

Potential improvements for future iterations:
- Real-time collaboration on opinions
- Version comparison tools
- Template library for common opinion types
- Integration with case law databases
- Automated citation formatting
- Multi-language support

