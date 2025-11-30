# Plan to Resolve Pinecone `describeIndexStats` Type Error

## Context
- Vercel build fails in `lib/rag.ts:86` with `Property 'database' does not exist on type 'IndexStatsDescription'.`
- Using `@pinecone-database/pinecone@6.1.3`; typings only expose `dimension` but some responses nest it under `database.dimension`.

## Plan
1. Inspect Pinecone typings and, if possible, the runtime `describeIndexStats()` payload to confirm whether the deployment returns `dimension` or `database.dimension`.
2. Update `ensurePineconeIndex` to safely read both shapes (type guard or extended type cast) while preserving the existing validation/warning behavior.
3. Ensure missing dimension is handled gracefully (skip validation or warn) and keep the mismatch warning.
4. Run `npm run build` (and lint if needed) to verify the TypeScript error is gone and no regressions appear.
