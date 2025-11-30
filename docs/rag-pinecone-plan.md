# RAG Pinecone-Only Plan

Goal: Remove any in-memory vector store usage and make `retrieveProfiles` rely solely on Pinecone.

## Steps

1) Code audit and cleanup
- Remove `MemoryVectorStore` imports/usages in `lib/rag.ts`.
- Delete in-memory builder/getter helpers and fallback functions.

2) Pinecone-only retrieval path
- Require `PINECONE_API_KEY` and `PINECONE_INDEX`; throw clear errors if missing.
- Validate index dimensions against `text-embedding-3-large` (3072) and fail fast on mismatch.
- Query Pinecone for embeddings; return empty list on query errors instead of falling back to memory.
- Keep `formatProfile` unchanged.

3) Surface errors to API layer
- Update `app/api/chat/route.ts` to handle Pinecone errors (return 500 with actionable message) instead of silently falling back.

4) Configuration/docs
- Update `.env.example`/`.env.local` notes to mark Pinecone as required for RAG.
- Add short README note describing Pinecone requirement and index dimension.

5) Validation
- Run `pnpm lint`/`pnpm test` (or project-standard checks) to confirm types and imports are clean.
- If no automated tests, manually hit `POST /api/chat` to verify Pinecone path executes.

## Files to touch
- `lib/rag.ts`
- `app/api/chat/route.ts`
- `.env.example` (and/or `.env.local` guidance)
- `README.md` (or docs entry)
