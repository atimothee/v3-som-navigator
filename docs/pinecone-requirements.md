# Pinecone Requirements for RAG

The RAG pipeline now relies exclusively on Pinecone. There is no in-memory fallback.

## Configuration
- `PINECONE_API_KEY`: required.
- `PINECONE_INDEX`: required; must exist and be ready.
- Index dimension must be **3072** to match the `text-embedding-3-large` embedding model.

## Behavior
- If configuration is missing or the index fails validation, API requests error with HTTP 500.
- Pinecone query failures surface as errors; no automatic fallback to in-memory search.
