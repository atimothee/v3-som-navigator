import { OpenAIEmbeddings } from "@langchain/openai";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { somNetwork, type Profile } from "../data/network";

const embeddings = new OpenAIEmbeddings({
  apiKey: process.env.OPENAI_API_KEY
});

let vectorStorePromise: Promise<MemoryVectorStore> | null = null;

async function buildVectorStore() {
  const texts = somNetwork.map((profile) =>
    [
      `${profile.name} | ${profile.title} | ${profile.gradYear} | ${profile.location}`,
      `Interests: ${profile.interests.join(", ")}`,
      `Availability: ${profile.availability}`,
      `Summary: ${profile.summary}`
    ].join("\n")
  );

  return MemoryVectorStore.fromTexts(texts, somNetwork, embeddings);
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

  return matches.map((match) => ({
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
