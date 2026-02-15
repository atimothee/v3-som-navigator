export type ProfileDocumentType = "resume" | "linkedin_pdf";

export type ProfileSignals = {
  skills: string[];
  industries: string[];
  companies: string[];
  schools: string[];
  locations: string[];
};

export type StoredProfileDocument = {
  version?: 1;
  type?: ProfileDocumentType;
  fileName?: string;
  uploadedAt?: string;
  textExcerpt?: string;
  extractedText?: string;
  signals?: ProfileSignals;
};

export const PROFILE_DOCUMENT_METADATA_KEY = "somProfileDocument";
const PROFILE_DOC_KEY = "profileDocument";
const PROFILE_DOC_ALT_KEY = "profile_document";
const MAX_EXCERPT_CHARS = 2400;
const MAX_SIGNAL_VALUES = 10;

const INDUSTRY_KEYWORDS = [
  "consulting",
  "finance",
  "investment banking",
  "private equity",
  "venture capital",
  "asset management",
  "healthcare",
  "biotech",
  "technology",
  "product management",
  "operations",
  "marketing",
  "sales",
  "climate",
  "sustainability",
  "energy",
  "education",
  "consumer",
  "retail",
  "real estate",
  "public sector",
  "nonprofit",
  "entrepreneurship"
] as const;

const SKILL_KEYWORDS = [
  "python",
  "sql",
  "excel",
  "financial modeling",
  "strategy",
  "go-to-market",
  "product",
  "analytics",
  "data science",
  "machine learning",
  "ai",
  "project management",
  "operations",
  "fundraising",
  "partnerships",
  "research",
  "marketing",
  "sales",
  "leadership"
] as const;

const LOCATION_KEYWORDS = [
  "new york",
  "san francisco",
  "boston",
  "chicago",
  "los angeles",
  "seattle",
  "austin",
  "washington",
  "london",
  "singapore",
  "new haven",
  "connecticut"
] as const;

const SCHOOL_KEYWORDS = [
  "yale",
  "harvard",
  "stanford",
  "mit",
  "wharton",
  "columbia",
  "chicago booth",
  "northwestern",
  "berkeley",
  "princeton"
] as const;

type MaybeUserMetadata = {
  privateMetadata?: unknown;
  publicMetadata?: unknown;
  unsafeMetadata?: unknown;
};

export function buildStoredProfileDocument(params: {
  fileName: string;
  type: ProfileDocumentType;
  extractedText: string;
}): StoredProfileDocument {
  const normalized = normalizeText(params.extractedText);
  const excerpt = normalized.slice(0, MAX_EXCERPT_CHARS);

  return {
    version: 1,
    type: params.type,
    fileName: params.fileName,
    uploadedAt: new Date().toISOString(),
    textExcerpt: excerpt,
    extractedText: excerpt,
    signals: extractSignals(normalized)
  };
}

export function parseStoredProfileDocument(metadata: unknown): StoredProfileDocument | null {
  const root = asRecord(metadata);
  if (!root) return null;

  const modern = parseModernProfileDocument(root);
  if (modern) return modern;

  return parseLegacyProfileDocument(root);
}

export function resolveStoredProfileDocument(user: MaybeUserMetadata | null | undefined): StoredProfileDocument | null {
  if (!user) return null;
  return (
    parseStoredProfileDocument(user.privateMetadata) ??
    parseStoredProfileDocument(user.publicMetadata) ??
    parseStoredProfileDocument(user.unsafeMetadata)
  );
}

export function removeStoredProfileDocument(metadata: unknown): Record<string, unknown> {
  const root = asRecord(metadata) ?? {};
  const next = { ...root };
  delete next[PROFILE_DOCUMENT_METADATA_KEY];
  delete next[PROFILE_DOC_KEY];
  delete next[PROFILE_DOC_ALT_KEY];
  return next;
}

export function setStoredProfileDocument(metadata: unknown, doc: StoredProfileDocument): Record<string, unknown> {
  const root = asRecord(metadata) ?? {};
  return {
    ...root,
    [PROFILE_DOCUMENT_METADATA_KEY]: doc
  };
}

export function buildProfileDocumentPromptContext(doc: StoredProfileDocument): string {
  const signals = ensureSignals(doc);
  const excerpt = doc.textExcerpt ?? doc.extractedText ?? "None extracted";
  return [
    `Type: ${doc.type === "linkedin_pdf" ? "LinkedIn PDF" : "Resume"}`,
    `File: ${doc.fileName ?? "Unknown"}`,
    `Uploaded: ${doc.uploadedAt ?? "Unknown"}`,
    `Skills: ${signals.skills.join(", ") || "None extracted"}`,
    `Industries: ${signals.industries.join(", ") || "None extracted"}`,
    `Companies: ${signals.companies.join(", ") || "None extracted"}`,
    `Schools: ${signals.schools.join(", ") || "None extracted"}`,
    `Locations: ${signals.locations.join(", ") || "None extracted"}`,
    `Resume excerpt: ${excerpt}`
  ].join("\n");
}

export function computeCommonalityHints(doc: StoredProfileDocument, profileText: string): string[] {
  const normalized = normalizeText(profileText).toLowerCase();
  const signals = ensureSignals(doc);
  const hints: string[] = [];

  const maybeAdd = (values: string[], prefix: string) => {
    for (const value of values) {
      if (!value) continue;
      if (!normalized.includes(value.toLowerCase())) continue;
      const hint = `${prefix}${value}`;
      if (!hints.includes(hint)) {
        hints.push(hint);
      }
      if (hints.length >= 4) return;
    }
  };

  maybeAdd(signals.industries, "Shared industry: ");
  maybeAdd(signals.skills, "Shared skill: ");
  maybeAdd(signals.companies, "Shared company background: ");
  maybeAdd(signals.locations, "Shared location: ");
  maybeAdd(signals.schools, "Shared school signal: ");

  return hints.slice(0, 4);
}

function parseModernProfileDocument(root: Record<string, unknown>): StoredProfileDocument | null {
  const raw = asRecord(root[PROFILE_DOCUMENT_METADATA_KEY]);
  if (!raw) return null;

  const version = raw.version === 1 ? 1 : undefined;
  const type = raw.type === "resume" || raw.type === "linkedin_pdf" ? raw.type : undefined;
  const fileName = toOptionalString(raw.fileName);
  const uploadedAt = toOptionalString(raw.uploadedAt);
  const textExcerpt = toOptionalString(raw.textExcerpt);
  const extractedText = toOptionalString(raw.extractedText) ?? textExcerpt;
  const signals = parseSignals(raw.signals);

  if (!fileName && !extractedText && !uploadedAt) return null;

  return {
    version,
    type,
    fileName: fileName || undefined,
    uploadedAt: uploadedAt || undefined,
    textExcerpt: textExcerpt || undefined,
    extractedText: extractedText || undefined,
    signals
  };
}

function parseLegacyProfileDocument(root: Record<string, unknown>): StoredProfileDocument | null {
  const candidate = root[PROFILE_DOC_KEY] ?? root[PROFILE_DOC_ALT_KEY];
  if (!candidate || typeof candidate !== "object") return null;

  const value = candidate as Record<string, unknown>;
  const fileName = toOptionalString(value.fileName);
  const extractedText =
    toOptionalString(value.extractedText) ??
    toOptionalString(value.extracted_text) ??
    toOptionalString(value.text) ??
    toOptionalString(value.content);
  const uploadedAt = toOptionalString(value.uploadedAt);

  if (!fileName && !extractedText && !uploadedAt) return null;

  const signals = extractedText ? extractSignals(extractedText) : undefined;

  return {
    type: "resume",
    fileName: fileName || undefined,
    uploadedAt: uploadedAt || undefined,
    textExcerpt: extractedText?.slice(0, MAX_EXCERPT_CHARS),
    extractedText: extractedText || undefined,
    signals
  };
}

function ensureSignals(doc: StoredProfileDocument): ProfileSignals {
  if (doc.signals) return doc.signals;
  const source = doc.extractedText ?? doc.textExcerpt ?? "";
  return extractSignals(source);
}

function parseSignals(value: unknown): ProfileSignals | undefined {
  const signals = asRecord(value);
  if (!signals) return undefined;
  return {
    skills: toStringArray(signals.skills),
    industries: toStringArray(signals.industries),
    companies: toStringArray(signals.companies),
    schools: toStringArray(signals.schools),
    locations: toStringArray(signals.locations)
  };
}

function extractSignals(text: string): ProfileSignals {
  const lower = text.toLowerCase();
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  return {
    skills: keywordMatches(lower, SKILL_KEYWORDS),
    industries: keywordMatches(lower, INDUSTRY_KEYWORDS),
    companies: extractCompanies(lines),
    schools: keywordMatches(lower, SCHOOL_KEYWORDS),
    locations: keywordMatches(lower, LOCATION_KEYWORDS)
  };
}

function keywordMatches(text: string, keywords: readonly string[]): string[] {
  const values: string[] = [];

  for (const keyword of keywords) {
    if (text.includes(keyword.toLowerCase())) {
      values.push(keyword);
    }
    if (values.length >= MAX_SIGNAL_VALUES) break;
  }

  return values;
}

function extractCompanies(lines: string[]): string[] {
  const companies: string[] = [];
  const patterns = [/\bat\s+([A-Z][A-Za-z0-9&\-\s]{1,40})/g, /\b([A-Z][A-Za-z0-9&\-\s]{1,40})\s+\|\s+[A-Z][A-Za-z]/g];

  for (const line of lines) {
    for (const pattern of patterns) {
      const matches = line.matchAll(pattern);
      for (const match of matches) {
        const raw = (match[1] ?? "").trim();
        const normalized = raw.replace(/\s+/g, " ");
        if (!normalized) continue;
        if (normalized.length < 2 || normalized.length > 42) continue;
        if (!companies.includes(normalized)) {
          companies.push(normalized);
        }
        if (companies.length >= MAX_SIGNAL_VALUES) {
          return companies;
        }
      }
    }
  }

  return companies;
}

function normalizeText(input: string): string {
  return input
    .replace(/\u0000/g, "")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, MAX_SIGNAL_VALUES);
}

function toOptionalString(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const trimmed = input.trim();
  return trimmed || null;
}
