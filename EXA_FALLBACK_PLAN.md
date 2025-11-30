# Exa Fallback Plan

## Overview
- Add a Pinecone→Exa fallback when Pinecone confidence is weak, return results immediately, then persist Exa results to Vercel Blob in the background.

## Decision Points (any triggers fallback)
- Top Pinecone score below threshold (e.g., 0.25–0.35).
- Hit count below minimum (e.g., <3–5).
- Zero hits after required filters/facets.
- Steep score drop-off between rank 1 and 3 (e.g., >0.15).
- Pre-flagged ambiguous query types allowed to fallback.

## Flow
1. Run Pinecone query.
2. Evaluate decision points; if strong, return Pinecone results.
3. If weak: log `this is where exa ai will be called: {query}` (placeholder for Exa call).
4. Normalize would-be Exa results to internal shape (title, url, snippet, score, source=`exa`); set `fallbackUsed=true`.
5. Respond immediately with combined results (Pinecone + normalized Exa) and a blob URL placeholder.
6. In background, persist Exa result JSON to Vercel Blob using unique key `exa-search/{Date.now()}-{query-hash}.json`; optionally cache to avoid repeat calls.

## Guardrails
- Dedupe by URL/id across sources.
- Cap fallback attempts per query hash.
- Timeout the Exa step (future) to avoid hanging.
- On failure, return Pinecone-only.

## Testing Hooks
- Unit: weak-branch asserts log fires and `fallbackUsed` is set.
- Integration stub: mock Exa + blob write.
- Cache tests for hash reuse.
