import { Pinecone } from "@pinecone-database/pinecone";
import { OpenAIEmbeddings } from "@langchain/openai";
import { MemoryVectorStore } from "langchain/vectorstores/memory";

import { Profile, loadProfilesFromDocs, profileToText } from "./profiles";

const PINECONE_INDEX = process.env.PINECONE_INDEX;
const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
const EMBEDDING_MODEL = "text-embedding-3-large";
const EMBEDDING_DIMENSION = 3072;

const embeddings = new OpenAIEmbeddings({
  apiKey: process.env.OPENAI_API_KEY,
  model: EMBEDDING_MODEL,
  dimensions: EMBEDDING_DIMENSION
});

let vectorStorePromise: Promise<MemoryVectorStore> | null = null;
let pineconeClient: Pinecone | null = null;
let pineconeIndex: ReturnType<Pinecone["index"]> | null = null;
let pineconeIndexValidated = false;

async function buildVectorStore() {
  const profiles: Profile[] = loadProfilesFromDocs();

  if (profiles.length === 0) {
    // Return an empty store; the model will fall back to general guidance.
    return MemoryVectorStore.fromTexts([], [], embeddings);
  }

  const texts = profiles.map((profile) => profileToText(profile));

  return MemoryVectorStore.fromTexts(texts, profiles, embeddings);
}

export async function getStore() {
  if (!vectorStorePromise) {
    vectorStorePromise = buildVectorStore();
  }

  return vectorStorePromise;
}

export async function retrieveProfiles(query: string, k = 4) {
  const index = getPineconeIndex();

  if (!index) {
    console.warn("Pinecone not configured; using in-memory search.");
    return retrieveFromMemory(query, k);
  }

  const ready = await ensurePineconeIndex(index);
  if (!ready) {
    console.warn("Pinecone index not ready; using in-memory search.");
    return retrieveFromMemory(query, k);
  }

  try {
    const vector = await embedText(query);
    const results = await index.query({
      topK: k,
      vector,
      includeMetadata: true
    });

    if (results.matches?.length) {
      return results.matches.map((match) => {
        const profile = (match.metadata ?? {}) as Profile;
        return {
          profile,
          score: match.score ?? 0,
          snippet: profileToText(profile)
        };
      });
    }
  } catch (err) {
    console.warn("Pinecone query failed; falling back to in-memory store.", err);
  }

  return retrieveFromMemory(query, k);
}

async function retrieveFromMemory(query: string, k: number) {
  const store = await getStore();
  const matches = await store.similaritySearch(query, k);
  const safeMatches = matches as Array<typeof matches[number] & { score?: number }>;

  return safeMatches.map((match) => ({
    profile: match.metadata as Profile,
    score: match.score ?? 0,
    snippet: match.pageContent
  }));
}

export function formatProfile(profile: Profile) {
  return [
    `${profile.name} (${profile.gradYear}) — ${profile.title}`,
    `Location: ${profile.location}`,
    `Interests: ${profile.interests.join(", ")}`,
    `Availability: ${profile.availability}`,
    `Notes: ${profile.summary}`
  ].join("\n");
}

function getPineconeIndex() {
  if (pineconeIndex) return pineconeIndex;
  if (!PINECONE_API_KEY || !PINECONE_INDEX) return null;

  pineconeClient = new Pinecone({
    apiKey: PINECONE_API_KEY
  });

  pineconeIndex = pineconeClient.index(PINECONE_INDEX);
  pineconeIndexValidated = false;
  return pineconeIndex;
}

async function ensurePineconeIndex(index: ReturnType<Pinecone["index"]>) {
  if (pineconeIndexValidated) return true;
  try {
    const stats = await index.describeIndexStats();
    const dimension = stats.dimension ?? stats.database?.dimension;
    if (dimension && dimension !== EMBEDDING_DIMENSION) {
      console.warn(
        `Pinecone index dimension ${dimension} does not match embedding dimension ${EMBEDDING_DIMENSION}.`
      );
      return false;
    }
    pineconeIndexValidated = true;
    return true;
  } catch (err) {
    console.warn("Failed to validate Pinecone index stats.", err);
    return false;
  }
}

async function embedText(text: string) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OpenAI API key missing for embedding.");
  }

  return embeddings.embedQuery(text);
}
