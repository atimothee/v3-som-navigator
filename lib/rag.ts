import { Pinecone } from "@pinecone-database/pinecone";
import { OpenAIEmbeddings } from "@langchain/openai";
import { Profile, profileToText } from "./profiles";

const PINECONE_INDEX = process.env.PINECONE_INDEX;
const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
const EMBEDDING_MODEL = "text-embedding-3-large";
const EMBEDDING_DIMENSION = 3072;

const embeddings = new OpenAIEmbeddings({
  apiKey: process.env.OPENAI_API_KEY,
  model: EMBEDDING_MODEL,
  dimensions: EMBEDDING_DIMENSION
});

let pineconeClient: Pinecone | null = null;
let pineconeIndex: ReturnType<Pinecone["index"]> | null = null;
let pineconeIndexValidated = false;

export async function retrieveProfiles(query: string, k = 4) {
  const index = getPineconeIndex();

  if (!index) {
    throw new Error("Pinecone not configured; set PINECONE_API_KEY and PINECONE_INDEX.");
  }

  const ready = await ensurePineconeIndex(index);
  if (!ready) {
    throw new Error("Pinecone index not ready or dimension mismatch.");
  }

  const vector = await embedText(query);
  try {
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
    console.error("Pinecone query failed.", err);
    throw new Error("Pinecone query failed.");
  }

  return [];
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
