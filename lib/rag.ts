import { createHash } from "node:crypto";
import { Pinecone } from "@pinecone-database/pinecone";
import { OpenAIEmbeddings } from "@langchain/openai";
import { Profile } from "./profiles";

const PINECONE_INDEX = process.env.PINECONE_INDEX;
const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
const EMBEDDING_MODEL = "text-embedding-3-large";
const EMBEDDING_DIMENSION = 3072;

type RetrievalSource = "pinecone" | "exa";

type PublicProfile = Pick<Profile, "name" | "title" | "summary" | "linkedinUrl">;

export type ProfileMatch = {
  profile: PublicProfile;
  score: number;
  snippet: string;
  source: RetrievalSource;
};

export type RetrievalResult = {
  results: ProfileMatch[];
  fallbackUsed: boolean;
  fallbackReason?: string;
  blobUrl?: string;
};

const embeddings = new OpenAIEmbeddings({
  apiKey: process.env.OPENAI_API_KEY,
  model: EMBEDDING_MODEL,
  dimensions: EMBEDDING_DIMENSION
});

let pineconeClient: Pinecone | null = null;
let pineconeIndex: ReturnType<Pinecone["index"]> | null = null;
let pineconeIndexValidated = false;
const FALLBACK_DEFAULTS = {
  minScore: 0.3,
  minHits: 3,
  scoreDrop: 0.15
};

export async function retrieveProfiles(query: string, k = 4): Promise<RetrievalResult> {
  const index = getPineconeIndex();

  if (!index) {
    throw new Error("Pinecone not configured; set PINECONE_API_KEY and PINECONE_INDEX.");
  }

  const ready = await ensurePineconeIndex(index);
  if (!ready) {
    throw new Error("Pinecone index not ready or dimension mismatch.");
  }

  const vector = await embedText(query);
  let pineconeMatches: ProfileMatch[] = [];
  try {
    const results = await index.query({
      topK: k,
      vector,
      includeMetadata: true
    });
    console.log("Pinecone ids:", results.matches?.map((match) => match.id));

    if (results.matches?.length) {
      pineconeMatches = results.matches.map((match) => {
        const profile = sanitizeProfile(match.metadata ?? {});
        return {
          profile,
          score: match.score ?? 0,
          snippet: buildSnippet(profile),
          source: "pinecone" as const
        };
      });
    }
  } catch (err) {
    console.error("Pinecone query failed.", err);
    throw new Error("Pinecone query failed.");
  }

  const fallbackReason = evaluateFallback(pineconeMatches);
  let fallbackUsed = false;
  let blobUrl: string | undefined;
  let combinedResults = pineconeMatches;

  if (fallbackReason) {
    fallbackUsed = true;
    console.log(`this is where exa ai will be called: ${query}`);

    const exaResults: ProfileMatch[] = [];
    combinedResults = dedupeMatches([...pineconeMatches, ...exaResults]);

    const blobKey = buildBlobKey(query);
    blobUrl = blobKey;
    void persistExaResultsPlaceholder(exaResults, query, blobKey);
  }

  return {
    results: combinedResults,
    fallbackUsed,
    fallbackReason,
    blobUrl
  };
}

export function formatProfile(profile: PublicProfile) {
  return [
    `${profile.name} — ${profile.title}`,
    `LinkedIn: ${profile.linkedinUrl ?? "Not provided"}`,
    `Notes: ${profile.summary}`
  ].join("\n");
}

function sanitizeProfile(metadata: any): PublicProfile {
  const profile = (metadata ?? {}) as Profile;
  return {
    name: profile.name,
    title: profile.title,
    summary: profile.summary,
    linkedinUrl: profile.linkedinUrl
  };
}

function buildSnippet(profile: PublicProfile) {
  return [
    `${profile.name} | ${profile.title}`,
    `LinkedIn: ${profile.linkedinUrl ?? "Not provided"}`,
    `Summary: ${profile.summary}`
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
    // Some Pinecone deployments return dimension nested under database.
    const dimension =
      stats.dimension ??
      (stats as { database?: { dimension?: number } }).database?.dimension;
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

function evaluateFallback(matches: ProfileMatch[]): string | undefined {
  console.log(`evaluateFallback called: ${matches.length} matches found.`);
  if (!matches.length) return "no_matches";

  const [first, second, third] = matches;
  if (first.score < FALLBACK_DEFAULTS.minScore) return "low_score";
  if (matches.length < FALLBACK_DEFAULTS.minHits) return "sparse_hits";

  const thirdScore = third?.score ?? second?.score ?? 0;
  if (first.score - thirdScore > FALLBACK_DEFAULTS.scoreDrop) return "score_dropoff";

  return undefined;
}

function dedupeMatches(matches: ProfileMatch[]) {
  const seen = new Set<string>();
  return matches.filter(({ profile }) => {
    const key = profile.linkedinUrl ?? profile.name;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildBlobKey(query: string) {
  const hash = createHash("sha256").update(query).digest("hex").slice(0, 8);
  return `exa-search/${Date.now()}-${hash}.json`;
}

async function persistExaResultsPlaceholder(
  exaResults: ProfileMatch[],
  query: string,
  blobKey: string
) {
  if (!exaResults.length) {
    console.log("No Exa results to persist for query:", query);
    return;
  }

  console.log(
    `Stub Vercel Blob upload: would write ${exaResults.length} Exa results to ${blobKey} for query "${query}".`
  );
}
