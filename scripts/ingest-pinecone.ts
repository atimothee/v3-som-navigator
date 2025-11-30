import "dotenv/config";

import { Pinecone } from "@pinecone-database/pinecone";
import { OpenAIEmbeddings } from "@langchain/openai";

import { loadProfilesFromDocs, profileToText, type Profile } from "../lib/profiles";

const EMBEDDING_MODEL = "text-embedding-3-large";
const EMBEDDING_DIMENSION = 3072;
const BATCH_SIZE = 5;

async function main() {
  const apiKey = process.env.PINECONE_API_KEY;
  const indexName = process.env.PINECONE_INDEX;

  if (!apiKey || !indexName) {
    throw new Error("PINECONE_API_KEY and PINECONE_INDEX are required.");
  }

  const embeddingClient = new OpenAIEmbeddings({
    apiKey: process.env.OPENAI_API_KEY,
    model: EMBEDDING_MODEL,
    dimensions: EMBEDDING_DIMENSION
  });

  const pinecone = new Pinecone({ apiKey });

  const index = pinecone.index(indexName);
  await validateIndex(index, embeddingClient);

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
    const vectors = await embedDocuments(embeddingClient, texts);

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
  await runSampleQuery(embeddingClient, index, sampleQuery);
}

async function validateIndex(
  index: ReturnType<Pinecone["index"]>,
  embeddingClient: OpenAIEmbeddings
) {
  const stats = await index.describeIndexStats();
  const dimension = stats.dimension ?? stats.database?.dimension;
  if (dimension && dimension !== EMBEDDING_DIMENSION) {
    throw new Error(`Index dimension ${dimension} does not match expected ${EMBEDDING_DIMENSION}.`);
  }

  const sample = await embeddingClient.embedQuery("dimension check");
  const embedDim = sample.length;
  if (embedDim && embedDim !== EMBEDDING_DIMENSION) {
    throw new Error(`Embedding dimension ${embedDim} does not match expected ${EMBEDDING_DIMENSION}.`);
  }
}

async function embedDocuments(embeddingClient: OpenAIEmbeddings, texts: string[]) {
  const vectors = await embeddingClient.embedDocuments(texts);
  if (!vectors?.length || !vectors[0]?.length) {
    throw new Error("No embeddings returned from OpenAI.");
  }

  return vectors;
}

async function embedQuery(embeddingClient: OpenAIEmbeddings, text: string) {
  const vector = await embeddingClient.embedQuery(text);
  if (!vector?.length) {
    throw new Error("No query embedding returned from OpenAI.");
  }

  return vector;
}

async function runSampleQuery(
  embeddingClient: OpenAIEmbeddings,
  index: ReturnType<Pinecone["index"]>,
  query: string
) {
  try {
    console.log(`Sample query: "${query}"`);
    const vector = await embedQuery(embeddingClient, query);
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
