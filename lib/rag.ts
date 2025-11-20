import fs from "node:fs";
import path from "node:path";

import { OpenAIEmbeddings } from "@langchain/openai";
import { MemoryVectorStore } from "langchain/vectorstores/memory";

export type Profile = {
  name: string;
  title: string;
  gradYear: string;
  location: string;
  interests: string[];
  summary: string;
  availability: string;
};

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

  const texts = profiles.map((profile) =>
    [
      `${profile.name} | ${profile.title} | ${profile.gradYear} | ${profile.location}`,
      `Interests: ${profile.interests.join(", ")}`,
      `Availability: ${profile.availability}`,
      `Summary: ${profile.summary}`
    ].join("\n")
  );

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

function loadProfilesFromDocs(): Profile[] {
  const docsDir = path.join(process.cwd(), "data", "docs");
  if (!fs.existsSync(docsDir)) return [];

  const files = fs.readdirSync(docsDir).filter((file) => file.endsWith(".json"));
  const loaded: Profile[] = [];

  for (const file of files) {
    const fullPath = path.join(docsDir, file);
    try {
      const raw = JSON.parse(fs.readFileSync(fullPath, "utf8"));
      const candidates = Array.isArray(raw) ? raw : [raw];
      for (const candidate of candidates) {
        const profile = normalizeProfile(candidate);
        if (profile) loaded.push(profile);
      }
    } catch (err) {
      console.warn(`Failed to read ${fullPath}:`, err);
    }
  }

  return loaded;
}

function normalizeProfile(input: any): Profile | null {
  if (!input || typeof input !== "object") return null;

  const name = deriveName(input);
  const rawTitle = input.title ?? input.role ?? input.headline ?? "";
  const cleanedTitle = cleanTitle(String(rawTitle), name);
  const title = cleanedTitle || String(rawTitle);
  const gradYear = input.gradYear ?? input.classYear ?? "SOM";
  const location = input.location ?? input.city ?? input.region ?? input.country ?? "Unknown";
  const interests = normalizeInterests(input.interests ?? input.tags ?? input.keywords);
  const summary = (input.summary ?? input.bio ?? input.description ?? "").toString().trim();
  const availability = input.availability ?? input.slots ?? "Availability not provided";

  if (!name || !title || !summary) return null;

  return {
    name: String(name),
    title: String(title),
    gradYear: String(gradYear),
    location: String(location),
    interests,
    summary: String(summary),
    availability: String(availability)
  };
}

function normalizeInterests(value: any): string[] {
  if (Array.isArray(value)) return value.map((v) => String(v));
  if (typeof value === "string") return value.split(",").map((v) => v.trim()).filter(Boolean);
  return [];
}

function deriveName(input: any): string | null {
  const name = input.name ?? input.fullName ?? input.author;
  if (name) return String(name).trim() || null;

  const title = typeof input.title === "string" ? input.title : null;
  if (!title) return null;

  const dashParts = title.split(" - ");
  if (dashParts.length > 1) return dashParts[0].trim() || null;

  return null;
}

function cleanTitle(title: string, name: string | null): string {
  if (!title) return "";

  let cleaned = title.trim();
  if (name && cleaned.startsWith(name)) {
    cleaned = cleaned.slice(name.length).replace(/^[\s|–—-]+/, "").trim();
  }

  const pipeIndex = cleaned.indexOf("|");
  if (pipeIndex !== -1) {
    cleaned = cleaned.slice(0, pipeIndex).trim();
  }

  return cleaned;
}
