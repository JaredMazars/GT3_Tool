// Test the documents API to see what it returns
const https = require('https');

async function testDocumentsAPI() {
  const draftIds = [1, 2]; // Test both drafts
  
  console.log('\n🧪 Testing Documents API endpoints...\n');

  for (const draftId of draftIds) {
    console.log(`📄 Testing Draft ID: ${draftId}`);
    console.log(`   URL: http://localhost:3000/api/projects/23/opinion-drafts/${draftId}/documents`);
    
    try {
      const response = await fetch(`http://localhost:3000/api/projects/23/opinion-drafts/${draftId}/documents`);
      
      if (!response.ok) {
        console.log(`   ❌ Error: ${response.status} ${response.statusText}\n`);
        continue;
      }

      const data = await response.json();
      const docs = data.data || [];
      
      console.log(`   ✅ Response: ${docs.length} documents`);
      
      if (docs.length > 0) {
        docs.forEach((doc, idx) => {
          console.log(`      ${idx + 1}. ${doc.fileName} (ID: ${doc.id})`);
          console.log(`         Status: ${doc.vectorized ? '✅ Ready' : '⏳ Processing'}`);
          console.log(`         Category: ${doc.category}`);
        });
      }
      console.log('');
      
    } catch (error) {
      console.log(`   ❌ Fetch error: ${error.message}\n`);
    }
  }

  console.log('💡 If you see more than 2 total documents, there may be UI caching issues.\n');
}

testDocumentsAPI();

