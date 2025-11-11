// Quick script to check Azure AI Search index contents
const { SearchClient, AzureKeyCredential } = require('@azure/search-documents');
require('dotenv').config({ path: '.env.local' });

const searchEndpoint = process.env.AZURE_SEARCH_ENDPOINT;
const searchApiKey = process.env.AZURE_SEARCH_API_KEY;
const indexName = process.env.AZURE_SEARCH_INDEX_NAME || 'opinion-documents';

if (!searchEndpoint || !searchApiKey) {
  console.error('❌ Azure Search credentials not configured in .env.local');
  process.exit(1);
}

const client = new SearchClient(
  searchEndpoint,
  indexName,
  new AzureKeyCredential(searchApiKey)
);

async function checkIndex() {
  try {
    console.log(`\n🔍 Checking Azure AI Search Index: ${indexName}`);
    console.log(`📍 Endpoint: ${searchEndpoint}\n`);

    // Get all documents
    const results = await client.search('*', {
      top: 100,
      select: ['id', 'draftId', 'documentId', 'fileName', 'category', 'chunkIndex'],
    });

    const docs = [];
    for await (const result of results.results) {
      docs.push(result.document);
    }

    if (docs.length === 0) {
      console.log('⚠️  Index is EMPTY - no documents indexed yet!\n');
      return;
    }

    console.log(`✅ Found ${docs.length} chunks in the index\n`);

    // Group by draftId and documentId
    const byDraft = {};
    docs.forEach((doc) => {
      if (!byDraft[doc.draftId]) {
        byDraft[doc.draftId] = {};
      }
      if (!byDraft[doc.draftId][doc.documentId]) {
        byDraft[doc.draftId][doc.documentId] = {
          fileName: doc.fileName,
          category: doc.category,
          chunks: [],
        };
      }
      byDraft[doc.draftId][doc.documentId].chunks.push(doc.chunkIndex);
    });

    // Display results
    Object.entries(byDraft).forEach(([draftId, documents]) => {
      console.log(`📄 Draft ID: ${draftId}`);
      Object.entries(documents).forEach(([docId, info]) => {
        console.log(`   ├─ Document ID ${docId}: ${info.fileName}`);
        console.log(`   │  Category: ${info.category}`);
        console.log(`   │  Chunks: ${info.chunks.length} (indices: ${info.chunks.sort((a, b) => a - b).join(', ')})`);
      });
      console.log('');
    });

    console.log(`💡 To search for documents in draft ID 123, the AI uses: draftId eq 123\n`);
  } catch (error) {
    console.error('❌ Error checking index:', error.message);
    if (error.statusCode) {
      console.error(`   Status Code: ${error.statusCode}`);
    }
    if (error.details) {
      console.error(`   Details:`, error.details);
    }
    if (error.stack) {
      console.error('\n📋 Full Stack Trace:');
      console.error(error.stack);
    }
  }
}

checkIndex();

