// Check Azure Blob Storage for opinion documents
const { BlobServiceClient } = require('@azure/storage-blob');
require('dotenv').config({ path: '.env.local' });

const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || 'tax-documents';

if (!connectionString) {
  console.error('❌ AZURE_STORAGE_CONNECTION_STRING not configured in .env.local');
  process.exit(1);
}

async function checkBlobStorage() {
  try {
    console.log('\n☁️  Checking Azure Blob Storage...');
    console.log(`📦 Container: ${containerName}\n`);

    const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    const containerClient = blobServiceClient.getContainerClient(containerName);

    // List all blobs
    const blobs = [];
    for await (const blob of containerClient.listBlobsFlat()) {
      blobs.push(blob);
    }

    if (blobs.length === 0) {
      console.log('⚠️  No blobs found in container\n');
      return;
    }

    console.log(`✅ Found ${blobs.length} files in blob storage:\n`);

    // Group by project/draft folder
    const grouped = {};
    blobs.forEach((blob) => {
      const parts = blob.name.split('/');
      const folder = parts.length > 1 ? parts[0] : 'root';
      if (!grouped[folder]) {
        grouped[folder] = [];
      }
      grouped[folder].push(blob);
    });

    Object.entries(grouped).forEach(([folder, files]) => {
      console.log(`📁 Folder: ${folder}/`);
      files.forEach((blob) => {
        const sizeKB = (blob.properties.contentLength / 1024).toFixed(2);
        const fileName = blob.name.split('/').pop();
        console.log(`   ├─ ${fileName}`);
        console.log(`   │  Full path: ${blob.name}`);
        console.log(`   │  Size: ${sizeKB} KB`);
        console.log(`   │  Last modified: ${blob.properties.lastModified?.toISOString()}`);
        console.log('');
      });
    });

    // Check for files that match pattern but might be orphaned
    const opinionDocPaths = blobs
      .filter(b => b.name.includes('JJ_La_Cock_Assessment') || b.name.includes('JJ La Cock'))
      .map(b => b.name);

    if (opinionDocPaths.length > 2) {
      console.log(`\n⚠️  Found ${opinionDocPaths.length} "JJ La Cock Assessment" files in blob storage:`);
      opinionDocPaths.forEach(path => console.log(`   - ${path}`));
      console.log('\n💡 Some files may be orphaned (not in database)\n');
    }

  } catch (error) {
    console.error('❌ Error checking blob storage:', error.message);
    if (error.code) {
      console.error(`   Error code: ${error.code}`);
    }
    if (error.stack) {
      console.error('\n📋 Stack trace:');
      console.error(error.stack);
    }
  }
}

checkBlobStorage();

