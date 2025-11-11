// Cleanup script to identify and optionally remove orphaned documents
const { PrismaClient } = require('@prisma/client');
const { BlobServiceClient } = require('@azure/storage-blob');
const { SearchClient, AzureKeyCredential } = require('@azure/search-documents');
require('dotenv').config({ path: '.env.local' });

const prisma = new PrismaClient();

// Azure configs
const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || 'adjustment-documents';
const searchEndpoint = process.env.AZURE_SEARCH_ENDPOINT;
const searchApiKey = process.env.AZURE_SEARCH_API_KEY;
const indexName = process.env.AZURE_SEARCH_INDEX_NAME || 'opinion-documents';

async function analyzeConsistency() {
  console.log('\n🔍 ANALYZING DOCUMENT STORAGE CONSISTENCY\n');
  console.log('='.repeat(60));

  // 1. Get database documents
  console.log('\n📊 Step 1: Checking Database...');
  const dbDocs = await prisma.opinionDocument.findMany({
    select: {
      id: true,
      opinionDraftId: true,
      fileName: true,
      filePath: true,
      vectorized: true,
    },
  });
  console.log(`   Found ${dbDocs.length} documents in database`);

  // 2. Get blob storage files
  console.log('\n☁️  Step 2: Checking Blob Storage...');
  const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
  const containerClient = blobServiceClient.getContainerClient(containerName);
  
  const blobPaths = [];
  for await (const blob of containerClient.listBlobsFlat()) {
    blobPaths.push(blob.name);
  }
  console.log(`   Found ${blobPaths.length} files in blob storage`);

  // 3. Get search index documents
  console.log('\n🔎 Step 3: Checking Search Index...');
  const searchClient = new SearchClient(
    searchEndpoint,
    indexName,
    new AzureKeyCredential(searchApiKey)
  );
  
  const searchResults = await searchClient.search('*', {
    top: 1000,
    select: ['id', 'documentId'],
  });
  
  const indexDocIds = new Set();
  for await (const result of searchResults.results) {
    indexDocIds.add(result.document.documentId);
  }
  console.log(`   Found ${indexDocIds.size} unique documents in search index`);

  // 4. Cross-reference
  console.log('\n🔬 Step 4: Cross-Referencing...\n');

  const issues = [];

  // Check for DB documents without blobs
  dbDocs.forEach(doc => {
    if (!blobPaths.includes(doc.filePath)) {
      issues.push({
        type: 'ORPHANED_DB_RECORD',
        severity: 'HIGH',
        doc: doc,
        message: `Database record ${doc.id} has no corresponding blob: ${doc.filePath}`,
      });
    }
  });

  // Check for DB documents not in search index (but marked as vectorized)
  dbDocs.forEach(doc => {
    if (doc.vectorized && !indexDocIds.has(doc.id)) {
      issues.push({
        type: 'MISSING_SEARCH_INDEX',
        severity: 'MEDIUM',
        doc: doc,
        message: `Document ${doc.id} marked as vectorized but not in search index`,
      });
    }
  });

  // Check for blobs without DB records
  const dbPaths = new Set(dbDocs.map(d => d.filePath));
  blobPaths.forEach(path => {
    if (!dbPaths.has(path)) {
      issues.push({
        type: 'ORPHANED_BLOB',
        severity: 'MEDIUM',
        blob: path,
        message: `Blob ${path} has no corresponding database record`,
      });
    }
  });

  // Check for search index entries without DB records
  const dbDocIds = new Set(dbDocs.map(d => d.id));
  indexDocIds.forEach(indexDocId => {
    if (!dbDocIds.has(indexDocId)) {
      issues.push({
        type: 'ORPHANED_SEARCH_ENTRY',
        severity: 'LOW',
        documentId: indexDocId,
        message: `Search index has chunks for document ${indexDocId} with no DB record`,
      });
    }
  });

  // 5. Report findings
  if (issues.length === 0) {
    console.log('✅ NO ISSUES FOUND! All storage layers are consistent.\n');
  } else {
    console.log(`⚠️  FOUND ${issues.length} ISSUES:\n`);
    
    const grouped = {
      HIGH: issues.filter(i => i.severity === 'HIGH'),
      MEDIUM: issues.filter(i => i.severity === 'MEDIUM'),
      LOW: issues.filter(i => i.severity === 'LOW'),
    };

    Object.entries(grouped).forEach(([severity, items]) => {
      if (items.length > 0) {
        console.log(`\n🚨 ${severity} SEVERITY (${items.length} issues):`);
        items.forEach((issue, idx) => {
          console.log(`\n   ${idx + 1}. ${issue.type}`);
          console.log(`      ${issue.message}`);
          if (issue.doc) {
            console.log(`      Document: ${issue.doc.fileName} (ID: ${issue.doc.id})`);
            console.log(`      Draft ID: ${issue.doc.opinionDraftId}`);
          }
        });
      }
    });

    console.log('\n');
    console.log('💡 To fix these issues, you can:');
    console.log('   1. Delete and re-upload affected documents');
    console.log('   2. Manually clean up orphaned records (contact support)');
    console.log('   3. Run database migration to refresh schema\n');
  }

  // 6. Summary
  console.log('='.repeat(60));
  console.log('\n📈 SUMMARY:\n');
  console.log(`   Database:      ${dbDocs.length} documents`);
  console.log(`   Blob Storage:  ${blobPaths.length} files`);
  console.log(`   Search Index:  ${indexDocIds.size} unique documents`);
  console.log(`   Issues:        ${issues.length} discrepancies\n`);

  // 7. List all documents by draft
  console.log('📋 DOCUMENTS BY DRAFT:\n');
  const byDraft = {};
  dbDocs.forEach(doc => {
    if (!byDraft[doc.opinionDraftId]) {
      byDraft[doc.opinionDraftId] = [];
    }
    byDraft[doc.opinionDraftId].push(doc);
  });

  Object.entries(byDraft).forEach(([draftId, docs]) => {
    console.log(`   Draft ${draftId}: ${docs.length} documents`);
    docs.forEach(doc => {
      const status = doc.vectorized ? '✅' : '⏳';
      console.log(`      ${status} ${doc.fileName} (ID: ${doc.id})`);
    });
  });
  console.log('');
}

async function main() {
  try {
    await analyzeConsistency();
  } catch (error) {
    console.error('\n❌ Error during analysis:', error.message);
    if (error.stack) {
      console.error('\n📋 Stack trace:');
      console.error(error.stack);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main();

