## Goal
Add a keyword-extraction step before RAG retrieval so embeddings/search use a concise, focused query while preserving the original user text for logging and metadata.

## Approach
- Implement `extractKeywords(query)` helper that calls an LLM to return up to N concise keywords/entities (JSON or CSV), strips stopwords/noise, and falls back to the original query on any failure.
- Use keywordized string for embeddings and downstream Pinecone/Exa searches; keep the original query for logging, blob keys, and snippets.
- Make behavior configurable via env flags so it can be rolled out safely.

## Proposed changes
- New helper (likely in `lib/rag.ts` or `lib/query.ts`):
  - Prompt: emphasize skills, entities, proper nouns; cap at 8; no fillers; stable JSON/CSV response.
  - Parse/validate output, dedupe, join into a search string; fallback to raw query if empty/invalid.
  - Allow model override (default `gpt-4o-mini` or `gpt-3.5-turbo`).
- Wire into `retrieveProfiles`:
  - Run extraction first; embed keywordized string.
  - Preserve original query for logging, fallback blob keys, and display text.
  - Ensure Exa (when added) also uses the keywordized string.
- Observability:
  - Log when extraction is skipped/failed and when fallback to raw query occurs.
  - Optional metric counters (if available) for success/fail/skip.

## Config/toggles
- `ENABLE_QUERY_KEYWORDS` (default off or on per preference).
- `QUERY_KEYWORDS_MAX` (default 8).
- `QUERY_KEYWORDS_MODEL` (optional override).

## Testing
- Unit: prompt parsing (JSON/CSV), dedupe/truncation, fallback to raw query on bad output, respect max keywords.
- Integration/smoke: `retrieveProfiles` uses keywordized string when enabled and raw query when disabled.

## Rollout notes
- Start disabled; enable in staging, then production after verifying retrieval quality.
- Add brief README or doc note referencing this plan once shipped.
