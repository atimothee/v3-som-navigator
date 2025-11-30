import fs from "node:fs";
import path from "node:path";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

import dotenv from "dotenv";

import { Pinecone } from "@pinecone-database/pinecone";

const envFiles = [".env", ".env.local"].map((file) => path.join(process.cwd(), file));
for (const envPath of envFiles) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath, override: true });
  }
}

async function main() {
  const apiKey = process.env.PINECONE_API_KEY;
  const indexName = process.env.PINECONE_INDEX;
  const namespace = process.env.PINECONE_NAMESPACE;

  if (!apiKey || !indexName) {
    throw new Error("PINECONE_API_KEY and PINECONE_INDEX are required.");
  }

  const force = process.argv.includes("--yes") || process.argv.includes("-y");
  if (!(force || (process.env.CI && process.env.CI !== "false"))) {
    const confirmed = await promptForConfirmation(indexName, namespace);
    if (!confirmed) {
      console.log("Aborted; nothing deleted.");
      return;
    }
  }

  const pinecone = new Pinecone({ apiKey });
  const index = pinecone.index(indexName);
  const target = namespace ? index.namespace(namespace) : index;

  console.log(
    `Deleting all vectors from Pinecone index "${indexName}"${namespace ? ` (namespace "${namespace}")` : ""}...`
  );
  await target.deleteAll();
  console.log("Deletion complete.");
}

async function promptForConfirmation(indexName: string, namespace?: string) {
  const rl = readline.createInterface({ input, output });
  const promptLabel = namespace
    ? `Type "${indexName}/${namespace}" to confirm deletion`
    : `Type "${indexName}" to confirm deletion`;

  const answer = await rl.question(
    `${promptLabel} of all vectors in the Pinecone index (or press Enter to cancel): `
  );
  rl.close();

  const expected = namespace ? `${indexName}/${namespace}` : indexName;
  return answer.trim().toLowerCase() === expected.toLowerCase();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
