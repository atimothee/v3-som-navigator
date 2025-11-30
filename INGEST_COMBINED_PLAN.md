# Ingest Update Plan (combined_profiles.json)

1. Understand data shape
   - Inspect `data/docs/combined_profiles.json` schema; map fields to `Profile` (name, title, gradYear, location, interests, summary, availability, linkedinUrl).
   - Decide how to derive missing fields (e.g., parse `title`/`author` for name/title; defaults for gradYear/location/interests; use `id`/`url` for LinkedIn URL and stable IDs).

2. Load only combined file
   - Update `lib/profiles.ts` loader to read only `data/docs/combined_profiles.json` (support array or single object) and surface clear errors if missing/malformed.
   - Keep normalization but align it to combined file fields.

3. Normalize for combined data
   - Ensure `deriveName` handles `author`/`title`; clean titles; sensible defaults for gradYear/location/interests/availability.
   - Allow `id`/`url` to populate `linkedinUrl` and contribute to stable IDs.

4. Adjust ingest script
   - In `scripts/ingest-pinecone.ts`, reflect single-source ingest in logging/guards ("No profiles found in combined_profiles.json").
   - Confirm stable ID generation uses chosen unique fields (prefer `id`/`url`, fallback to slugified name+gradYear).

5. Verification/documentation
   - Add a dry-run/log sample payload option or brief README note on the new ingest flow.
   - Re-run ingest once keys/index are set, confirming upserts and sample query output.
