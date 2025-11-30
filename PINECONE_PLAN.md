# Pinecone integration plan (RAG swap)

## Goals
- Replace in-memory vector store with Pinecone (Pinecone Inference + index).
- Keep `retrieveProfiles`/`formatProfile` API stable for existing callers.
- Add an ingest script for `data/docs/*.json` profiles; queries become Pinecone-only.

## Dependencies / Env
- Add dependency: `@pinecone-database/pinecone`.
- Env vars: `PINECONE_API_KEY`, `PINECONE_INDEX` (dimension 4096, metric cosine or dot for `llama-text-embed-v2`), optionally `PINECONE_ENV`/`PINECONE_PROJECT_ID` per your Pinecone project setup.
- Embedding model: `llama-text-embed-v2` via Pinecone Inference (returns 4096-dim vectors).

## Refactors
- Extract profile parsing/text builder from `lib/rag.ts` into a shared helper (e.g., `lib/profiles.ts`) to reuse in ingest + query.
- Keep `formatProfile` in `lib/rag.ts`; change store/query internals only.

## Ingest flow (one-time/when docs change)
- Script: `scripts/ingest-pinecone.ts`.
  - Validate env and index dimension.
  - Load and normalize profiles from `data/docs/combined_profiles.json` (array or single object).
  - Build text per profile (name/title/year/location + interests + availability + summary).
  - Call Pinecone Inference `embed` (`model: "llama-text-embed-v2"`) on batches.
  - Upsert to Pinecone with stable ids (prefer LinkedIn URL/id slug, fallback to name + gradYear) and store full profile in `metadata`.
  - Optional: sample query to log top matches for verification; `--dry-run` flag logs a sample payload per batch and skips upserts/query.

## Query flow (`lib/rag.ts`)
- Lazy-init Pinecone client/index once.
- On `retrieveProfiles(query, k)`: embed query via Pinecone Inference, call `index.query({ vector, topK: k, includeMetadata: true })`, return metadata as profiles (plus score/snippet).
- Optional dev fallback: if Pinecone env missing, fall back to in-memory store with a warning (useful locally).

## Verification
- Run ingest script; confirm upsert succeeds.
- Hit `/api/chat` with a test question; ensure matches return from Pinecone (log scores/ids).
