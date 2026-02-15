import { createHash } from "node:crypto";
import { Pinecone } from "@pinecone-database/pinecone";
import { OpenAIEmbeddings } from "@langchain/openai";
import { Profile } from "./profiles";
import { superSearchLinkedinProfiles } from "./super-search";

const PINECONE_INDEX = process.env.PINECONE_INDEX;
const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
const EXA_API_KEY = process.env.EXA_API_KEY?.trim() || "";
const EMBEDDING_MODEL = "text-embedding-3-large";
const EMBEDDING_DIMENSION = 3072;
const MIN_CONTEXT_PROFILES = 10;
const DEFAULT_TOP_K = 20;
const TOP_K_BUFFER = 5;
const EXA_MAX_RESULTS = 12;

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

export async function retrieveProfiles(query: string, k = MIN_CONTEXT_PROFILES): Promise<RetrievalResult> {
  let pineconeMatches: ProfileMatch[] = [];
  const topK = Math.max(k, DEFAULT_TOP_K, MIN_CONTEXT_PROFILES + TOP_K_BUFFER);
  let pineconeReason: string | undefined;
  const index = getPineconeIndex();
  if (!index) {
    pineconeReason = "pinecone_unavailable";
    console.warn("Pinecone not configured; using Exa fallback.");
  } else {
    const ready = await ensurePineconeIndex(index);
    if (!ready) {
      pineconeReason = "pinecone_not_ready";
      console.warn("Pinecone index not ready; using Exa fallback.");
    } else {
      try {
        const vector = await embedText(query);
        const results = await index.query({
          topK,
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
        pineconeReason = "pinecone_query_failed";
        console.error("Pinecone query failed, using Exa fallback.", err);
      }
    }
  }

  const uniqueMatches = dedupeMatches(pineconeMatches);
  const limit = Math.max(MIN_CONTEXT_PROFILES, topK);
  const limitedMatches = uniqueMatches.slice(0, limit);
  const retrievalQualityReason = evaluateFallback(limitedMatches);
  const fallbackReason = pineconeReason ?? retrievalQualityReason;
  let fallbackUsed = false;
  let blobUrl: string | undefined;
  let combinedResults = limitedMatches;

  if (combinedResults.length < MIN_CONTEXT_PROFILES) {
    console.warn(
      `Only ${combinedResults.length} unique Pinecone results found; consider re-ingesting docs or increasing query coverage.`
    );
  }

  if (fallbackReason) {
    const exaResults = await retrieveFromExa(query, Math.min(EXA_MAX_RESULTS, limit));
    fallbackUsed = exaResults.length > 0;
    combinedResults = dedupeMatches([...combinedResults, ...exaResults]).slice(0, limit);

    if (exaResults.length > 0) {
      const blobKey = buildBlobKey(query);
      blobUrl = blobKey;
      void persistExaResultsPlaceholder(exaResults, query, blobKey);
    } else {
      console.warn(`Exa fallback returned no usable results for query: "${query}"`);
    }
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

async function retrieveFromExa(query: string, maxResults: number): Promise<ProfileMatch[]> {
  if (!EXA_API_KEY) {
    console.warn("EXA_API_KEY missing; Exa fallback disabled.");
    return [];
  }

  try {
    const results = await superSearchLinkedinProfiles({
      query,
      apiKey: EXA_API_KEY,
      maxResults,
      yaleOnly: true,
      yaleSomOnly: true
    });

    return results.map((result) => {
      const profile: PublicProfile = {
        name: result.name,
        title: result.title,
        summary: result.summary || result.description || result.snippet,
        linkedinUrl: result.linkedinUrl
      };

      return {
        profile,
        score: 0,
        snippet: result.snippet || buildSnippet(profile),
        source: "exa" as const
      };
    });
  } catch (error) {
    console.error("Exa fallback failed.", error);
    return [];
  }
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
