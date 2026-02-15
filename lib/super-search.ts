const EXA_SEARCH_ENDPOINT = "https://api.exa.ai/search";
const DEFAULT_RESULT_LIMIT = 8;

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
  source: "exa";
};

export async function superSearchLinkedinProfiles({
  query,
  apiKey,
  maxResults = DEFAULT_RESULT_LIMIT,
  yaleOnly = false,
  yaleSomOnly = false
}: {
  query: string;
  apiKey: string;
  maxResults?: number;
  yaleOnly?: boolean;
  yaleSomOnly?: boolean;
}): Promise<SuperSearchResult[]> {
  const shouldFilterYale = yaleOnly || yaleSomOnly;
  return searchWithExa(query, apiKey, maxResults, shouldFilterYale, yaleSomOnly);
}

async function searchWithExa(
  query: string,
  apiKey: string,
  maxResults: number,
  yaleOnly: boolean,
  yaleSomOnly: boolean
): Promise<SuperSearchResult[]> {
  const providerQuery = buildProviderQuery(query, yaleOnly, yaleSomOnly);
  const response = await fetch(EXA_SEARCH_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey
    },
    body: JSON.stringify({
      query: providerQuery,
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
    throw await buildProviderError(response);
  }

  const payload = (await response.json()) as {
    results?: Array<Record<string, unknown>>;
  };

  const results = Array.isArray(payload.results) ? payload.results : [];
  const mappedResults = results.flatMap((item) => {
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

  if (yaleSomOnly) return mappedResults.filter(isLikelyYaleSomAlum);
  return yaleOnly ? mappedResults.filter(isLikelyYaleAlum) : mappedResults;
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

function buildResultId(source: "exa", linkedinUrl: string, name: string): string {
  return `${source}:${linkedinUrl || name}`;
}

function oneLineTitleFallback(name: string): string {
  return name ? "LinkedIn profile" : "";
}

function inferLocationFromText(parts: string[]): string {
  const joined = parts.filter(Boolean).join(" | ");
  if (!joined) return "";

  const blockedTokens = new Set([
    "english",
    "urdu",
    "arabic",
    "spanish",
    "french",
    "german",
    "hindi",
    "mandarin",
    "cantonese",
    "portuguese",
    "japanese",
    "korean",
    "russian"
  ]);

  const maybeLocation = (value: string | undefined) => {
    const normalized = (value ?? "").trim().replace(/[.,;:]+$/, "");
    if (!normalized || normalized.length > 45) return "";

    const tokens = normalized.toLowerCase().split(/\s+/).filter(Boolean);
    if (!tokens.length) return "";
    if (tokens.some((token) => blockedTokens.has(token))) return "";
    if (/^[A-Z][a-z]+,\s[A-Z][a-z]+$/.test(normalized)) return "";

    return normalized;
  };

  const patterns = [
    /\b(Greater\s+[A-Z][a-z]+(?:\s[A-Z][a-z]+){0,2}\sArea)\b/,
    /\b([A-Z][a-z]+(?:\s[A-Z][a-z]+)*,\s[A-Z]{2})\b/,
    /\b([A-Z][a-z]+(?:\s[A-Z][a-z]+)*\sMetropolitan Area)\b/,
    /\b([A-Z][a-z]+(?:\s[A-Z][a-z]+)*,\s[A-Z][a-z]+)\b/,
    /\b(?:based in|located in)\s+([A-Z][a-z]+(?:\s[A-Z][a-z]+){0,3})\b/i
  ];

  for (const pattern of patterns) {
    const match = joined.match(pattern);
    const value = maybeLocation(match?.[1]);
    if (value) {
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

function buildProviderQuery(query: string, yaleOnly: boolean, yaleSomOnly: boolean): string {
  if (yaleSomOnly) {
    return `${query} "Yale School of Management" OR "Yale SOM" alumni`;
  }
  if (yaleOnly) {
    return `${query} Yale University OR Yale School of Management alumni`;
  }
  return query;
}

function isLikelyYaleAlum(result: SuperSearchResult): boolean {
  const combined = [
    result.name,
    result.title,
    result.summary,
    result.description,
    result.oneLiner,
    result.snippet
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return (
    /\byale\b/.test(combined) ||
    /\byale som\b/.test(combined) ||
    /\byale school of management\b/.test(combined)
  );
}

function isLikelyYaleSomAlum(result: SuperSearchResult): boolean {
  const combined = [
    result.name,
    result.title,
    result.summary,
    result.description,
    result.oneLiner,
    result.snippet
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return (
    /\byale som\b/.test(combined) ||
    /\byale school of management\b/.test(combined) ||
    /\bschool of management at yale\b/.test(combined)
  );
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

async function buildProviderError(response: Response): Promise<Error> {
  let detail = "";
  try {
    const body = await response.text();
    detail = body.slice(0, 220);
  } catch {
    detail = "";
  }
  const message = detail
    ? `Exa request failed (${response.status}): ${detail}`
    : `Exa request failed (${response.status}).`;
  return new Error(message);
}
