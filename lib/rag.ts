import { OpenAIEmbeddings } from "@langchain/openai";
import { MemoryVectorStore } from "langchain/vectorstores/memory";

import { Profile, loadProfilesFromDocs, profileToText } from "./profiles";

const embeddings = new OpenAIEmbeddings({
  apiKey: process.env.OPENAI_API_KEY
});

let vectorStorePromise: Promise<MemoryVectorStore> | null = null;

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
