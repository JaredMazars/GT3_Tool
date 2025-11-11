# RAG Diagnostic Guide - Opinion Assistant

## ✅ What's Working

1. **Azure AI Search Index**: Configured and operational
   - Endpoint: `https://tax-opinion-search.search.windows.net`
   - Index: `opinion-documents`
   - Status: ✅ **12 chunks indexed** for Draft ID 1

2. **Document Upload & Indexing**: Working
   - Document: `JJ La Cock Assessment.pdf`
   - Chunks: 12 (indices 0-11)
   - Category: Other
   - Draft ID: 1

3. **Background Processing**: Implemented
   - Documents process asynchronously after upload
   - UI polls every 3 seconds for status updates
   - Status indicators show: "Extracting text..." → "Generating embeddings..." → "Ready for AI search"

## 🔍 Diagnostic Steps

### Step 1: Check Your Draft ID

**CRITICAL**: The document is indexed for **Draft ID: 1**

1. Open the Opinion Drafting page in your browser
2. Look at the URL: `/dashboard/projects/[projectId]/opinion-drafting`
3. Check which draft is selected in the left sidebar
4. The draft ID must be **1** to see the uploaded document

**How to verify:**
- In the chat interface, the AI receives the `draftId` parameter
- Only documents with matching `draftId` will be searchable

### Step 2: Check Browser Console Logs

1. Open Developer Tools (F12 or Cmd+Option+I on Mac)
2. Go to the **Console** tab
3. Upload a document or ask the AI a question
4. Look for these new diagnostic logs:

**Expected Success Logs:**
```
🔍 Semantic search requested for draftId=1, query="What is in the assessment?"
✅ Generated query embedding (1536 dimensions)
🔎 Search filter: draftId eq 1
✅ Found 5 matching chunks from documents:
📄 Unique documents: JJ La Cock Assessment.pdf
📊 Top result: JJ La Cock Assessment.pdf (score: 0.8523)
```

**Problem Indicators:**
```
⚠️ No results found! Check if documents are indexed for draftId=X
```
→ The draftId doesn't match (X ≠ 1)

```
❌ Error performing semantic search: [error details]
```
→ Azure Search error (check credentials)

**No logs at all:**
→ The AI agent isn't being called or research phase isn't triggered

### Step 3: Verify Document Status in UI

1. Go to the **Documents** tab in Opinion Drafting
2. Check document status:
   - ❌ **"Extracting text..."** → PDF extraction in progress
   - 🟡 **"Generating embeddings..."** → Embedding generation in progress  
   - ✅ **"Ready for AI search"** → Fully indexed and searchable

3. If stuck on "Extracting text..." or "Generating embeddings..." for >1 minute:
   - Check combined.log for errors
   - Restart the dev server

### Step 4: Run Diagnostic Script

```bash
node check-search-index.js
```

**Expected Output:**
```
✅ Found 12 chunks in the index

📄 Draft ID: 1
   ├─ Document ID 10: JJ La Cock Assessment.pdf
   │  Category: Other
   │  Chunks: 12 (indices: 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11)
```

**If Empty:**
```
⚠️  Index is EMPTY - no documents indexed yet!
```
→ Documents haven't been indexed. Check document upload process.

### Step 5: Check Combined Logs

```bash
# Check for recent RAG activity
tail -100 logs/combined.log | grep -E "(search|embedding|indexed|🔍|✅|⚠️)"

# Check for errors
tail -100 logs/error.log | grep -E "(RAG|search|embedding)"
```

## 🐛 Common Issues & Solutions

### Issue 1: "AI doesn't see my document"

**Cause:** Draft ID mismatch

**Solution:**
1. Check which draft you're using (must be Draft ID: 1)
2. If using a different draft, upload the document again in that draft
3. Or navigate to the draft with ID 1

### Issue 2: Document stuck "Processing..."

**Cause:** Background indexing failed

**Solution:**
1. Check browser console for error messages
2. Check `logs/combined.log` for errors:
   ```bash
   tail -50 logs/combined.log | grep "error"
   ```
3. Delete and re-upload the document
4. Restart dev server if needed

### Issue 3: "No search results" in logs

**Cause:** 
- Draft ID filter doesn't match indexed documents
- Document not fully vectorized

**Solution:**
1. Verify `vectorized: true` in database:
   ```bash
   npx prisma studio
   ```
   → Check `OpinionDocument` table
2. Ensure `draftId` in chat matches document's `opinionDraftId`
3. Re-index document if needed (delete & re-upload)

### Issue 4: Azure Search errors

**Cause:** Configuration or rate limits

**Solution:**
1. Check `.env.local`:
   ```env
   AZURE_SEARCH_ENDPOINT=https://tax-opinion-search.search.windows.net
   AZURE_SEARCH_API_KEY=oFZQdVrwDsU8jRWFJzmbPfGzDUrtsfFcnVrjeI9sxBAzSeAHFr3h
   AZURE_SEARCH_INDEX_NAME=opinion-documents
   AZURE_OPENAI_EMBEDDING_DEPLOYMENT=text-embedding-3-small
   ```
2. Check embedding deployment capacity (should be ≥10)
3. Check rate limits in Azure Portal

## 📊 Enhanced Logging

The RAG engine now includes detailed logging:

- **🔍** = Search requested
- **✅** = Operation successful  
- **⚠️** = Warning or no results
- **❌** = Error occurred
- **📄** = Document information
- **📊** = Result statistics

All logs include:
- Draft ID being searched
- Query preview (first 100 chars)
- Number of results found
- Document names matched
- Relevance scores

## 🔧 Testing the Full Pipeline

### Test 1: Document Upload
```bash
# 1. Upload a PDF in the Documents tab
# 2. Wait for "Ready for AI search" status
# 3. Check console logs for:
[info]: Downloaded file from blob storage
[info]: Extracting PDF text using Azure Document Intelligence...
[info]: Successfully extracted XXXX characters from PDF
[info]: Generating embeddings for XX chunks...
[info]: Indexed XX chunks for document XX
```

### Test 2: Search Functionality
```bash
# 1. Go to Chat tab (make sure you're in Draft ID 1)
# 2. Ask: "What is in the JJ La Cock Assessment?"
# 3. Check console logs for:
🔍 Semantic search requested for draftId=1
✅ Generated query embedding (1536 dimensions)
🔎 Search filter: draftId eq 1
✅ Found X matching chunks
📄 Unique documents: JJ La Cock Assessment.pdf
```

### Test 3: End-to-End
```bash
# 1. Create a new draft
# 2. Upload a document
# 3. Wait for "Ready for AI search"
# 4. Ask a specific question about document content
# 5. Verify AI response includes document citations
```

## 📝 What to Report When Asking for Help

Please provide:

1. **Draft ID** you're using (from URL or draft list)
2. **Browser console logs** (the 🔍 emoji logs)
3. **Document status** from Documents tab
4. **Output of** `node check-search-index.js`
5. **Question you asked** the AI
6. **AI response** you received
7. **Any error messages** from logs

## 🚀 Quick Reset

If everything seems broken:

```bash
# 1. Stop dev server (Ctrl+C)
# 2. Clear build cache
rm -rf .next

# 3. Restart
npm run dev

# 4. Wait 10-15 seconds for build
# 5. Navigate to Draft ID 1
# 6. Check document status
# 7. Try asking a question
```

## ✅ Success Criteria

You'll know it's working when:

1. ✅ Document shows "Ready for AI search" in UI
2. ✅ `node check-search-index.js` shows your document
3. ✅ Browser console shows `🔍` search logs when you ask questions
4. ✅ Console shows `✅ Found X matching chunks`
5. ✅ AI responses include specific information from your document
6. ✅ AI response includes document citations with `fileName`

