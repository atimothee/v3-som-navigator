const EXA_SEARCH_ENDPOINT = "https://api.exa.ai/search";
const PARALLEL_SEARCH_ENDPOINT = "https://api.parallel.ai/v1beta/search";
const DEFAULT_RESULT_LIMIT = 8;

export type SuperSearchProvider = "exa" | "parallel";

export type SuperSearchResult = {
  id: string;
  name: string;
  title: string;
  gradYear: string;
  location: string;
  interests: string[];
  summary: string;
  availability: string;
  linkedinUrl: string;
  snippet: string;
  description: string;
  oneLiner: string;
  publishedDate?: string;
  source: SuperSearchProvider;
};

export async function superSearchLinkedinProfiles({
  query,
  provider,
  apiKey,
  maxResults = DEFAULT_RESULT_LIMIT
}: {
  query: string;
  provider: SuperSearchProvider;
  apiKey: string;
  maxResults?: number;
}): Promise<SuperSearchResult[]> {
  if (provider === "exa") {
    return searchWithExa(query, apiKey, maxResults);
  }

  return searchWithParallel(query, apiKey, maxResults);
}

async function searchWithExa(query: string, apiKey: string, maxResults: number): Promise<SuperSearchResult[]> {
  const response = await fetch(EXA_SEARCH_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey
    },
    body: JSON.stringify({
      query,
      category: "linkedin profile",
      type: "neural",
      numResults: clampResultLimit(maxResults),
      contents: {
        summary: true,
        context: true
      },
      includeDomains: ["linkedin.com"]
    })
  });

  if (!response.ok) {
    throw await buildProviderError("exa", response);
  }

  const payload = (await response.json()) as {
    results?: Array<Record<string, unknown>>;
  };

  const results = Array.isArray(payload.results) ? payload.results : [];
  return results.flatMap((item) => {
    const linkedinUrl = toString(item.url);
    if (!linkedinUrl || !isLinkedinProfileUrl(linkedinUrl)) return [];

    const rawName = pickFirstString(item, ["name", "title"]) || extractLinkedinHandle(linkedinUrl);
    const name = sanitizePersonName(rawName, linkedinUrl);
    const title = pickFirstString(item, ["title", "headline"]) || oneLineTitleFallback(name);
    const oneLiner =
      pickFirstString(item, [
        "contents.summary",
        "summary",
        "oneLiner",
        "one_liner",
        "headline",
        "title"
      ]) || "";
    const description =
      pickFirstString(item, [
        "contents.context",
        "contents.text",
        "text",
        "description",
        "summary"
      ]) || "";
    const location =
      pickFirstString(item, [
        "location",
        "locationName",
        "geo",
        "author.location",
        "profile.location",
        "profile.geo",
        "city",
        "state",
        "region",
        "country",
        "countryName"
      ]) || "";
    const interests = normalizeInterests(item.interests ?? item.tags ?? item.keywords);
    const textSnippet =
      description || oneLiner || pickFirstString(item, ["author", "publishedDate"]) || "";
    const inferredLocation = inferLocationFromText([location, oneLiner, description, title, textSnippet]);
    const summary = normalizeLongText(description || oneLiner || textSnippet);

    return [
      {
        id: buildResultId("exa", linkedinUrl, name),
        name,
        title,
        gradYear: "SOM",
        location: inferredLocation || "Unknown",
        interests,
        summary,
        availability: "Availability not provided",
        linkedinUrl,
        snippet: trimSnippet(textSnippet),
        description: normalizeLongText(description),
        oneLiner: normalizeLongText(oneLiner),
        publishedDate: toString(item.publishedDate) || undefined,
        source: "exa" as const
      }
    ];
  });
}

async function searchWithParallel(query: string, apiKey: string, maxResults: number): Promise<SuperSearchResult[]> {
  const response = await fetch(PARALLEL_SEARCH_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "parallel-beta": "search-v1"
    },
    body: JSON.stringify({
      query,
      max_results: clampResultLimit(maxResults),
      include_domains: ["linkedin.com/in", "linkedin.com/pub"]
    })
  });

  if (!response.ok) {
    throw await buildProviderError("parallel", response);
  }

  const payload = (await response.json()) as Record<string, unknown>;
  const maybeResults =
    (Array.isArray(payload.results) && payload.results) ||
    (Array.isArray(payload.data) && payload.data) ||
    [];

  return maybeResults.flatMap((raw) => {
    const item = (raw ?? {}) as Record<string, unknown>;
    const linkedinUrl = toString(item.url ?? item.link ?? item.source_url);
    if (!linkedinUrl || !isLinkedinProfileUrl(linkedinUrl)) return [];

    const rawName = toString(item.name ?? item.title) || extractLinkedinHandle(linkedinUrl);
    const name = sanitizePersonName(rawName, linkedinUrl);
    const title = toString(item.title ?? item.headline) || oneLineTitleFallback(name);
    const oneLiner =
      pickFirstString(item, ["one_liner", "oneLiner", "headline", "summary", "snippet"]) || "";
    const description =
      pickFirstString(item, ["description", "content", "summary", "snippet", "text"]) || "";
    const location =
      pickFirstString(item, [
        "location",
        "locationName",
        "geo",
        "author.location",
        "profile.location",
        "profile.geo",
        "city",
        "state",
        "region",
        "country",
        "countryName"
      ]) || "";
    const interests = normalizeInterests(item.interests ?? item.tags ?? item.keywords);
    const textSnippet = description || oneLiner || toString(item.snippet ?? item.summary ?? "");
    const inferredLocation = inferLocationFromText([location, oneLiner, description, title, textSnippet]);
    const summary = normalizeLongText(description || oneLiner || textSnippet);

    return [
      {
        id: buildResultId("parallel", linkedinUrl, name),
        name,
        title,
        gradYear: "SOM",
        location: inferredLocation || "Unknown",
        interests,
        summary,
        availability: "Availability not provided",
        linkedinUrl,
        snippet: trimSnippet(textSnippet),
        description: normalizeLongText(description),
        oneLiner: normalizeLongText(oneLiner),
        publishedDate: toString(item.publishedDate) || undefined,
        source: "parallel" as const
      }
    ];
  });
}

function clampResultLimit(maxResults: number): number {
  const bounded = Number.isFinite(maxResults) ? Math.round(maxResults) : DEFAULT_RESULT_LIMIT;
  return Math.min(20, Math.max(1, bounded));
}

function isLinkedinProfileUrl(url: string): boolean {
  return /linkedin\.com\/(in|pub)\//i.test(url);
}

function trimSnippet(value: string): string {
  return value.trim().slice(0, 360);
}

function normalizeLongText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function toString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function pickFirstString(obj: Record<string, unknown>, paths: string[]): string | null {
  for (const path of paths) {
    const value = getPathValue(obj, path);
    const parsed = toString(value);
    if (parsed) return parsed;
  }
  return null;
}

function getPathValue(obj: Record<string, unknown>, path: string): unknown {
  const segments = path.split(".");
  let cursor: unknown = obj;
  for (const segment of segments) {
    if (!cursor || typeof cursor !== "object") return undefined;
    cursor = (cursor as Record<string, unknown>)[segment];
  }
  return cursor;
}

function extractLinkedinHandle(url: string): string {
  const match = url.match(/linkedin\.com\/(?:in|pub)\/([^/?#]+)/i);
  if (!match?.[1]) return "LinkedIn profile";
  return decodeURIComponent(match[1]).replace(/[-_]+/g, " ").trim();
}

function normalizeInterests(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => toString(item)).filter(Boolean);
  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function buildResultId(source: SuperSearchProvider, linkedinUrl: string, name: string): string {
  return `${source}:${linkedinUrl || name}`;
}

function oneLineTitleFallback(name: string): string {
  return name ? "LinkedIn profile" : "";
}

function inferLocationFromText(parts: string[]): string {
  const joined = parts.filter(Boolean).join(" | ");
  if (!joined) return "";

  const patterns = [
    /\b([A-Z][a-z]+(?:\s[A-Z][a-z]+)*,\s[A-Z]{2})\b/,
    /\b([A-Z][a-z]+(?:\s[A-Z][a-z]+)*\sMetropolitan Area)\b/,
    /\b([A-Z][a-z]+(?:\s[A-Z][a-z]+)*,\s[A-Z][a-z]+)\b/,
    /\b(?:based in|located in|in)\s+([A-Z][a-z]+(?:\s[A-Z][a-z]+){0,3})\b/i
  ];

  for (const pattern of patterns) {
    const match = joined.match(pattern);
    const value = match?.[1]?.trim();
    if (value && value.length <= 45) {
      return value;
    }
  }

  return "";
}

function sanitizePersonName(raw: string, linkedinUrl: string): string {
  const normalized = raw
    .replace(/\s*\|\s*linkedin.*$/i, "")
    .replace(/\s*-\s*linkedin.*$/i, "")
    .trim();

  const parts = normalized
    .split(/\s[|–—-]\s/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length > 1 && looksLikePersonName(parts[0])) {
    return parts[0];
  }

  if (looksLikePersonName(normalized)) {
    return normalized;
  }

  return extractLinkedinHandle(linkedinUrl);
}

function looksLikePersonName(value: string): boolean {
  if (!value) return false;
  const tokens = value
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);

  if (!tokens.length || tokens.length > 5) return false;

  const blockedTerms = [
    "director",
    "manager",
    "partner",
    "founder",
    "president",
    "student",
    "consultant",
    "analyst",
    "officer",
    "lead",
    "engineer",
    "investor"
  ];

  const joined = value.toLowerCase();
  if (blockedTerms.some((term) => joined.includes(term))) return false;
  if (/[0-9@]/.test(value)) return false;

  return true;
}

async function buildProviderError(provider: SuperSearchProvider, response: Response): Promise<Error> {
  let detail = "";
  try {
    const body = await response.text();
    detail = body.slice(0, 220);
  } catch {
    detail = "";
  }
  const prefix = provider === "exa" ? "Exa" : "Parallel.ai";
  const message = detail
    ? `${prefix} request failed (${response.status}): ${detail}`
    : `${prefix} request failed (${response.status}).`;
  return new Error(message);
}
