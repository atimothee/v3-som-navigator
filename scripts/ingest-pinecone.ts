import "dotenv/config";

import { Pinecone } from "@pinecone-database/pinecone";

import { loadProfilesFromDocs, profileToText, type Profile } from "../lib/profiles";

const EMBEDDING_MODEL = "llama-text-embed-v2";
const BATCH_SIZE = 20;
const EXPECTED_DIMENSION = 4096;

async function main() {
  const apiKey = process.env.PINECONE_API_KEY;
  const indexName = process.env.PINECONE_INDEX;

  if (!apiKey || !indexName) {
    throw new Error("PINECONE_API_KEY and PINECONE_INDEX are required.");
  }

  const pinecone = new Pinecone({
    apiKey,
    environment: process.env.PINECONE_ENV,
    projectId: process.env.PINECONE_PROJECT_ID
  });

  const index = pinecone.index(indexName);
  await validateIndex(pinecone, index);

  const profiles = loadProfilesFromDocs();
  if (!profiles.length) {
    console.log("No profiles found in data/docs; nothing to ingest.");
    return;
  }

  const ids = buildStableIds(profiles);
  console.log(`Upserting ${profiles.length} profiles to Pinecone index "${indexName}"...`);

  for (let start = 0; start < profiles.length; start += BATCH_SIZE) {
    const batchProfiles = profiles.slice(start, start + BATCH_SIZE);
    const batchIds = ids.slice(start, start + BATCH_SIZE);
    const texts = batchProfiles.map((profile) => profileToText(profile));
    const vectors = await embedDocuments(pinecone, texts);

    const payload = vectors.map((values, idx) => ({
      id: batchIds[idx],
      values,
      metadata: batchProfiles[idx]
    }));

    await index.upsert(payload);
    console.log(`Upserted ${start + payload.length}/${profiles.length}`);
  }

  console.log("Ingest complete.");

  const sampleQuery = process.argv.slice(2).join(" ") || "school of management alumni interested in fintech";
  await runSampleQuery(pinecone, index, sampleQuery);
}

async function validateIndex(pinecone: Pinecone, index: ReturnType<Pinecone["index"]>) {
  const stats = await index.describeIndexStats();
  const dimension = stats.dimension ?? stats.database?.dimension;
  if (dimension && dimension !== EXPECTED_DIMENSION) {
    throw new Error(`Index dimension ${dimension} does not match expected ${EXPECTED_DIMENSION}.`);
  }

  const sample = await pinecone.inference.embed({
    model: EMBEDDING_MODEL,
    input: "dimension check",
    parameters: { inputType: "query" }
  });

  const embedDim = sample.data?.[0]?.values?.length;
  if (embedDim && embedDim !== EXPECTED_DIMENSION) {
    throw new Error(`Embedding dimension ${embedDim} does not match expected ${EXPECTED_DIMENSION}.`);
  }
}

async function embedDocuments(pinecone: Pinecone, texts: string[]) {
  const response = await pinecone.inference.embed({
    model: EMBEDDING_MODEL,
    input: texts,
    parameters: { inputType: "document" }
  });

  const vectors = response.data?.map((item) => item.values ?? []);
  if (!vectors?.length || !vectors[0]?.length) {
    throw new Error("No embeddings returned from Pinecone Inference.");
  }

  return vectors;
}

async function embedQuery(pinecone: Pinecone, text: string) {
  const response = await pinecone.inference.embed({
    model: EMBEDDING_MODEL,
    input: text,
    parameters: { inputType: "query" }
  });

  const vector = response.data?.[0]?.values;
  if (!vector?.length) {
    throw new Error("No query embedding returned from Pinecone Inference.");
  }

  return vector;
}

async function runSampleQuery(
  pinecone: Pinecone,
  index: ReturnType<Pinecone["index"]>,
  query: string
) {
  try {
    console.log(`Sample query: "${query}"`);
    const vector = await embedQuery(pinecone, query);
    const results = await index.query({ vector, topK: 3, includeMetadata: true });

    if (!results.matches?.length) {
      console.log("No matches returned from sample query.");
      return;
    }

    for (const match of results.matches) {
      const profile = match.metadata as Profile | undefined;
      console.log(
        `- ${match.id} (${(match.score ?? 0).toFixed(3)}): ${profile?.name ?? "Unknown"} — ${
          profile?.title ?? "No title"
        }`
      );
    }
  } catch (err) {
    console.warn("Sample query failed:", err);
  }
}

function buildStableIds(profiles: Profile[]) {
  const counts = new Map<string, number>();

  return profiles.map((profile, index) => {
    const base = slugify(`${profile.name}-${profile.gradYear}`);
    const count = counts.get(base) ?? 0;
    counts.set(base, count + 1);

    if (count === 0) return base || `profile-${index}`;
    return `${base}-${count}`;
  });
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
