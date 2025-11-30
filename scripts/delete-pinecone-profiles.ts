import fs from "node:fs";
import path from "node:path";

import dotenv from "dotenv";

import { Pinecone } from "@pinecone-database/pinecone";

const envFiles = [".env", ".env.local"].map((file) => path.join(process.cwd(), file));
for (const envPath of envFiles) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath, override: true });
  }
}

const DELETE_FILE = path.join(process.cwd(), "for_delete", "profiles_for_delete.json");
const BATCH_SIZE = 50;

type DeleteRecord = {
  [key: string]: unknown;
};

async function main() {
  const apiKey = process.env.PINECONE_API_KEY;
  const indexName = process.env.PINECONE_INDEX;

  if (!apiKey || !indexName) {
    throw new Error("PINECONE_API_KEY and PINECONE_INDEX are required.");
  }

  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const ids = resolveIds(args);
  if (!ids.length) {
    console.log("No ids provided; nothing to delete.");
    return;
  }

  console.log(
    `${dryRun ? "Simulating deletion of" : "Deleting"} ${ids.length} record${
      ids.length === 1 ? "" : "s"
    } from Pinecone index "${indexName}".`
  );
  console.log(`First id: ${ids[0]}`);

  if (dryRun) {
    return;
  }

  const pinecone = new Pinecone({ apiKey });
  const index = pinecone.index(indexName);

  for (let start = 0; start < ids.length; start += BATCH_SIZE) {
    const batch = ids.slice(start, start + BATCH_SIZE);
    await index.deleteMany(batch);
    console.log(`Deleted ${start + batch.length}/${ids.length}`);
  }

  console.log("Deletion complete.");
}

function resolveIds(args: string[]) {
  const idsArg = readArgValue(args, "--ids");
  const idsFileArg = readArgValue(args, "--ids-file");

  if (idsArg) {
    const ids = idsArg
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);
    if (ids.length) return ids;
  }

  if (idsFileArg) {
    const ids = loadIdsFromFile(idsFileArg);
    if (ids.length) return ids;
  }

  const records = loadDeleteRecords();
  if (!records.length) return [];
  return buildIdsFromRecords(records);
}

function readArgValue(args: string[], flag: string) {
  const match = args.find((arg) => arg.startsWith(flag));
  if (!match) return "";
  const [, value = ""] = match.split("=");
  return value;
}

function loadIdsFromFile(filePath: string) {
  const absolute = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
  if (!fs.existsSync(absolute)) {
    throw new Error(`Ids file not found at ${absolute}`);
  }

  const raw = fs.readFileSync(absolute, "utf8");

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed
        .filter((value) => typeof value === "string")
        .map((value) => value.trim())
        .filter(Boolean);
    }
  } catch {
    // fall through to newline parsing
  }

  return raw
    .split(/\r?\n/g)
    .map((line) => line.trim())
    .filter(Boolean);
}

function loadDeleteRecords(): DeleteRecord[] {
  if (!fs.existsSync(DELETE_FILE)) {
    throw new Error(`Delete file not found at ${DELETE_FILE}`);
  }

  const raw = fs.readFileSync(DELETE_FILE, "utf8");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(`Failed to parse ${DELETE_FILE}: ${err instanceof Error ? err.message : err}`);
  }

  if (!Array.isArray(parsed)) {
    throw new Error(`Expected an array in ${DELETE_FILE}`);
  }

  return parsed;
}

function buildIdsFromRecords(records: DeleteRecord[]) {
  const counts = new Map<string, number>();

  return records.map((record, index) => {
    const directId = pickIdField(record);
    if (directId) return directId;

    const base = buildBaseId(record, index);
    const count = counts.get(base) ?? 0;
    counts.set(base, count + 1);

    if (count === 0) return base;
    return `${base}-${count}`;
  });
}

function pickIdField(record: DeleteRecord) {
  const id = record.id;
  if (typeof id === "string" && id.trim()) return id.trim();
  return "";
}

function buildBaseId(record: DeleteRecord, index: number) {
  const preferred = pickPreferredId(record);
  const fallbackName =
    pickString(record, ["name", "fullName", "author"]) || trySplitTitle(record) || "";
  const fallbackYear = pickString(record, ["gradYear", "classYear"]) || "";
  const fallback = fallbackName ? `${fallbackName}-${fallbackYear}` : "";

  const candidate = preferred || fallback;
  const slug = slugify(candidate);

  return slug || `profile-${index}`;
}

function pickPreferredId(record: DeleteRecord) {
  const value =
    pickString(record, ["linkedinUrl", "linkedin", "url", "id"]) ??
    pickString(record, ["link", "profileUrl"]);
  return value || "";
}

function trySplitTitle(record: DeleteRecord) {
  const title = pickString(record, ["title", "headline"]);
  if (!title) return "";

  const dashParts = title.split(" - ");
  if (dashParts.length > 1) return dashParts[0].trim();
  return "";
}

function pickString(record: DeleteRecord, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
