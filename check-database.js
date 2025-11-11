// Check database for OpinionDocuments
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkDatabase() {
  try {
    console.log('\n📊 Checking OpinionDocument table in database...\n');

    const documents = await prisma.opinionDocument.findMany({
      orderBy: [
        { opinionDraftId: 'asc' },
        { id: 'asc' },
      ],
      select: {
        id: true,
        opinionDraftId: true,
        fileName: true,
        fileSize: true,
        filePath: true,
        category: true,
        extractedText: true,
        vectorized: true,
        createdAt: true,
      },
    });

    if (documents.length === 0) {
      console.log('⚠️  No documents found in database\n');
      return;
    }

    console.log(`✅ Found ${documents.length} documents in database:\n`);

    // Group by draft
    const byDraft = {};
    documents.forEach((doc) => {
      if (!byDraft[doc.opinionDraftId]) {
        byDraft[doc.opinionDraftId] = [];
      }
      byDraft[doc.opinionDraftId].push(doc);
    });

    Object.entries(byDraft).forEach(([draftId, docs]) => {
      console.log(`📄 Draft ID: ${draftId}`);
      docs.forEach((doc) => {
        const hasText = doc.extractedText ? `${doc.extractedText.length} chars` : 'No text';
        const vectorStatus = doc.vectorized ? '✅ Vectorized' : '❌ Not vectorized';
        console.log(`   ├─ ID ${doc.id}: ${doc.fileName}`);
        console.log(`   │  Category: ${doc.category}`);
        console.log(`   │  Size: ${(doc.fileSize / 1024).toFixed(2)} KB`);
        console.log(`   │  Path: ${doc.filePath}`);
        console.log(`   │  Text: ${hasText}`);
        console.log(`   │  Status: ${vectorStatus}`);
        console.log(`   │  Created: ${doc.createdAt.toISOString()}`);
        console.log('');
      });
    });

    // Check for duplicates
    const fileNames = documents.map(d => d.fileName);
    const duplicates = fileNames.filter((item, index) => fileNames.indexOf(item) !== index);
    if (duplicates.length > 0) {
      console.log(`\n⚠️  DUPLICATES FOUND: ${[...new Set(duplicates)].join(', ')}\n`);
    }

  } catch (error) {
    console.error('❌ Error checking database:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();

