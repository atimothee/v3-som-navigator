# Switch to OpenAI `text-embedding-3-large` (3072 dims, 8191 tokens) with Pinecone

1) Update embedding model selection/constants to use OpenAI `text-embedding-3-large` (3072 dims, 8191 tokens) across ingest and query paths.
2) Adjust Pinecone index expectations (dimension/metric) and client validation to match the new model; create or recreate the index if needed.
3) Ensure the ingest pipeline uses OpenAI embeddings instead of Pinecone inference, batching and upserting vectors/metadata to Pinecone.
4) Update the runtime query flow to embed queries with OpenAI and query the Pinecone index; keep the in-memory fallback consistent.
5) Add env/config notes and run a test ingest/query to confirm successful upsert and retrieval.

Notes:
- Required env: `OPENAI_API_KEY`, `PINECONE_API_KEY`, `PINECONE_INDEX` (index must be 3072-dim, cosine/dot). Optional: `DOTENV_CONFIG_PATH=.env.local` when running scripts locally.
- Create/recreate the Pinecone index at dimension 3072 to match `text-embedding-3-large` (8191 max input tokens).
- Test: `DOTENV_CONFIG_PATH=.env.local npm run ingest:pinecone` to upsert; then hit `/api/chat` with a sample query and observe Pinecone results. If index dims mismatch, ingest/query will fall back or fail with a clear warning.
