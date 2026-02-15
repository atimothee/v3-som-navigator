import fs from "node:fs";
import path from "node:path";

export type Profile = {
  id?: string;
  name: string;
  title: string;
  gradYear: string;
  location: string;
  interests: string[];
  summary: string;
  availability: string;
  linkedinUrl?: string;
  publishedDate?: string;
};

export function loadProfilesFromDocs(): Profile[] {
  const combinedPath = path.join(process.cwd(), "data", "docs", "combined_profiles.json");
  if (!fs.existsSync(combinedPath)) {
    console.warn(`combined_profiles.json not found at ${combinedPath}`);
    return [];
  }

  try {
    const raw = JSON.parse(fs.readFileSync(combinedPath, "utf8"));
    const candidates = Array.isArray(raw) ? raw : [raw];

    return candidates
      .map((candidate) => normalizeProfile(candidate))
      .filter((profile): profile is Profile => Boolean(profile));
  } catch (err) {
    console.warn(`Failed to read ${combinedPath}:`, err);
    return [];
  }
}

export function profileToText(profile: Profile) {
  return [
    `${profile.name} | ${profile.title} | ${profile.gradYear} | ${profile.location}`,
    `Interests: ${profile.interests.join(", ")}`,
    `Availability: ${profile.availability}`,
    `LinkedIn: ${profile.linkedinUrl ?? "Not provided"}`,
    `Summary: ${profile.summary}`
  ].join("\n");
}

export function normalizeProfile(input: any): Profile | null {
  if (!input || typeof input !== "object") return null;

  const id = toOptionalString(input.id);
  const name = deriveName(input);
  const rawTitle = input.title ?? input.role ?? input.headline ?? "";
  const cleanedTitle = cleanTitle(String(rawTitle), name);
  const title = cleanedTitle || String(rawTitle);
  const gradYear = input.gradYear ?? input.classYear ?? "SOM";
  const location = input.location ?? input.city ?? input.region ?? input.country ?? "Unknown";
  const interests = normalizeInterests(input.interests ?? input.tags ?? input.keywords);
  const summary = (input.summary ?? input.bio ?? input.description ?? "").toString().trim();
  const availability = input.availability ?? input.slots ?? "Availability not provided";
  const linkedinUrl = normalizeLinkedinUrl(input);
  const publishedDate = toOptionalString(input.publishedDate);

  if (!name || !title || !summary) return null;

  return {
    id: id || undefined,
    name: String(name),
    title: String(title),
    gradYear: String(gradYear),
    location: String(location),
    interests,
    summary: String(summary),
    availability: String(availability),
    linkedinUrl: linkedinUrl || undefined,
    publishedDate: publishedDate || undefined
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

function normalizeLinkedinUrl(input: any): string | null {
  const candidates = [input.linkedinUrl, input.linkedin, input.url, input.id];
  for (const value of candidates) {
    if (typeof value === "string" && value.trim().startsWith("http")) {
      return value.trim();
    }
  }
  return null;
}

function toOptionalString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}
