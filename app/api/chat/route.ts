import { openai } from "@ai-sdk/openai";
import { convertToCoreMessages, generateText, streamText } from "ai";
import { currentUser } from "@clerk/nextjs/server";
import { resolveStoredProfileDocument } from "@/lib/profile-document";
import { isAuthorizedYaleUser } from "@/lib/require-yale-user";
import { NextRequest } from "next/server";
import { formatProfile, retrieveProfiles } from "@/lib/rag";

export const runtime = "nodejs";

const CONTEXT_PROFILE_LIMIT = 10;
const PROFILE_DISPLAY_MIN = 7;
const PROFILE_DISPLAY_MAX = 10;
const PROFILE_DOCUMENT_MAX_CHARS = 8000;
const TARGET_CONTEXT_MAX_CHARS = 2500;
const MAX_SIMILARITY_ITEMS = 6;

type SimilaritySignals = {
  overlaps: string[];
  senderAnchors: string[];
  targetAnchors: string[];
  evidence: string[];
};

function isOpenerRequest(input: string) {
  const normalized = input.toLowerCase();
  return (
    normalized.includes("draft opener") ||
    normalized.includes("linkedin dm opener") ||
    normalized.includes("resume-to-linkedin opener") ||
    normalized.includes("15-20 minute chat")
  );
}

function extractTargetBlock(input: string): string | null {
  const marker = "target person:";
  const normalized = input.toLowerCase();
  const start = normalized.indexOf(marker);
  if (start === -1) return null;
  const raw = input.slice(start + marker.length).trim();
  if (!raw) return null;
  return raw.slice(0, TARGET_CONTEXT_MAX_CHARS);
}

function emptySimilaritySignals(): SimilaritySignals {
  return {
    overlaps: [],
    senderAnchors: [],
    targetAnchors: [],
    evidence: []
  };
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, MAX_SIMILARITY_ITEMS);
}

function parseSimilaritySignals(raw: string): SimilaritySignals {
  const jsonBlockMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonBlockMatch) return emptySimilaritySignals();

  try {
    const parsed = JSON.parse(jsonBlockMatch[0]) as Record<string, unknown>;
    return {
      overlaps: toStringArray(parsed.overlaps),
      senderAnchors: toStringArray(parsed.senderAnchors),
      targetAnchors: toStringArray(parsed.targetAnchors),
      evidence: toStringArray(parsed.evidence)
    };
  } catch {
    return emptySimilaritySignals();
  }
}

async function generateSimilaritySignals(
  senderContext: string | undefined,
  targetContext: string
): Promise<SimilaritySignals> {
  if (!senderContext?.trim() || !targetContext.trim()) {
    return emptySimilaritySignals();
  }

  try {
    const extraction = await generateText({
      model: openai("gpt-4o-mini") as any,
      temperature: 0,
      system:
        "You extract evidence-backed overlap signals between a sender resume and a target LinkedIn profile.\n" +
        "Return ONLY valid JSON with keys: overlaps, senderAnchors, targetAnchors, evidence.\n" +
        "Rules:\n" +
        "- overlaps: 1-3 specific shared themes (industry, geography, institution, transition, company, function).\n" +
        "- senderAnchors: up to 4 short exact phrases from sender context.\n" +
        "- targetAnchors: up to 4 short exact phrases from target context.\n" +
        "- evidence: up to 4 short strings that justify overlap and mention both sides.\n" +
        "- No markdown, no prose, no extra keys, no invented facts.",
      prompt:
        `Sender context:\n${senderContext}\n\n` +
        `Target context:\n${targetContext}\n\n` +
        "Output JSON now."
    });
    return parseSimilaritySignals(extraction.text);
  } catch (error) {
    console.error("Failed to generate model-driven similarity signals:", error);
    return emptySimilaritySignals();
  }
}

export async function POST(req: NextRequest) {
  const authorized = await isAuthorizedYaleUser();

  if (!authorized) {
    return new Response("Forbidden", { status: 403 });
  }

  if (!process.env.OPENAI_API_KEY) {
    return new Response("Missing OPENAI_API_KEY", { status: 500 });
  }

  const { messages } = (await req.json()) as { messages: unknown };
  const safeMessages = Array.isArray(messages) ? messages : [];
  const coreMessages = convertToCoreMessages(safeMessages);
  const last = coreMessages[coreMessages.length - 1];
  const userQuestion =
    typeof last?.content === "string"
      ? last.content
      : Array.isArray(last?.content)
        ? last.content
            .map((chunk) => ("text" in chunk && typeof chunk.text === "string" ? chunk.text : ""))
            .join(" ")
        : "";
  const openerMode = isOpenerRequest(userQuestion);
  const explicitTargetContext = extractTargetBlock(userQuestion);
  const user = await currentUser();
  const profileDoc = resolveStoredProfileDocument(user);
  const profileDocText = profileDoc?.extractedText?.slice(0, PROFILE_DOCUMENT_MAX_CHARS);

  let retrieval = null as Awaited<ReturnType<typeof retrieveProfiles>> | null;
  try {
    retrieval = await retrieveProfiles(userQuestion);
  } catch (err) {
    console.error("Failed to retrieve profiles via Pinecone/Exa:", err);
  }

  const matches = retrieval?.results ?? [];
  console.log("Retrieved profiles:", matches);
  if (retrieval?.fallbackUsed) {
    console.log("Fallback was triggered.", {
      fallbackReason: retrieval.fallbackReason,
      blobUrl: retrieval.blobUrl
    });
  }

  const contextMatches = matches.slice(0, CONTEXT_PROFILE_LIMIT);
  const context =
    contextMatches.length
      ? contextMatches.map(({ profile }) => formatProfile(profile)).join("\n\n")
      : "No specific context matched; offer general networking guidance for SOM coffee chats.";
  const openerTargetContext =
    explicitTargetContext ?? (contextMatches[0] ? formatProfile(contextMatches[0].profile) : "Not available.");
  const similaritySignals = openerMode
    ? await generateSimilaritySignals(profileDocText, openerTargetContext)
    : emptySimilaritySignals();

  const profileInstruction = `Highlight ${PROFILE_DISPLAY_MIN}-${PROFILE_DISPLAY_MAX} profiles from the available context (use all if fewer than ${PROFILE_DISPLAY_MIN} appear), each with LinkedIn references and location hints.`;
  const openerSystem =
    "You are an executive networking strategist and professional ghostwriter.\n" +
    "Your task is to generate a concise LinkedIn direct message opener by comparing the sender resume and the target LinkedIn profile.\n\n" +
    "Objective:\n" +
    "- Write a brief, thoughtful LinkedIn DM opener that establishes credibility without bragging.\n" +
    "- Identify 1-2 specific overlaps (industry, geography, institutions, career transitions, companies, themes).\n" +
    "- Demonstrate genuine interest in the target work.\n" +
    "- Clearly but softly ask for a short conversation.\n\n" +
    "Constraints:\n" +
    "- 75 to 120 words.\n" +
    "- 3 to 5 sentences.\n" +
    "- Do not use these phrases: \"I came across your profile\", \"I'd love to pick your brain\", \"I admire your journey\".\n" +
    "- No emojis, no excessive flattery, no over-praise.\n" +
    "- Avoid sounding transactional.\n\n" +
    "Style:\n" +
    "- Professional, thoughtful, and slightly warm.\n" +
    "- Specific over generic.\n" +
    "- Forward-looking.\n" +
    "- Confident but not self-promotional.\n" +
    "- Write as a peer, not a fan.\n\n" +
    "Structure:\n" +
    "- Personalized hook referencing a specific detail from the target background.\n" +
    "- One line of sender context.\n" +
    "- Specific overlap or reason for reaching out.\n" +
    "- Lightweight ask for a 15-20 minute chat.\n\n" +
    "Specificity requirements:\n" +
    "- Use at least 2 concrete details from target context (for example company, school, title, geography, transition).\n" +
    "- Use at least 1 concrete sender detail from resume context when available.\n" +
    "- Name the overlap explicitly; do not use vague language like \"similar background\".\n\n" +
    "Grounding requirements:\n" +
    "- If model-derived overlaps are provided, use 1-2 of them explicitly.\n" +
    "- Include one sender anchor and one target anchor verbatim when available.\n" +
    "- Align wording with model-derived evidence when provided.\n" +
    "- Never invent similarities that are not supported by the provided contexts/signals.\n\n" +
    "Output rules:\n" +
    "- Return only the final LinkedIn DM message.\n" +
    "- Do not explain reasoning.\n" +
    "- Do not summarize inputs.\n" +
    "- Do not use bullet points.\n\n" +
    `Sender resume context (if available):\n${profileDocText ?? "Not available."}\n\n` +
    `Target profile context:\n${openerTargetContext}\n\n` +
    `Model-derived overlap candidates:\n${similaritySignals.overlaps.join(", ") || "None"}\n` +
    `Sender anchors:\n${similaritySignals.senderAnchors.join(", ") || "None"}\n` +
    `Target anchors:\n${similaritySignals.targetAnchors.join(", ") || "None"}\n` +
    `Model-derived evidence:\n${similaritySignals.evidence.join(" | ") || "None"}`;
  const defaultSystem =
    "You are the SOM Network Navigator, a warm guide for connecting Yale SOM students and alumni for coffee chats.\n" +
    "Use the provided alum context to recommend 5-10 specific people with reasons.\n" +
    "Be concise, prefer short bullets, include link to Linkedin profile + location hints, and add a brief outreach opener when asked.\n" +
    `${profileInstruction}\n\n` +
    "Strict rules:" +
    "\n- Only recommend people from the provided alum context." +
    "\n- If no relevant alum context is provided, give general advice on how to approach coffee chats." +
    "\n- Always maintain a friendly and encouraging tone." +
    "\n- Do not fabricate information about alumni.\n" +
    `Alum context:\n${context}`;
  const system = openerMode ? openerSystem : defaultSystem;

  const result = await streamText({
    // Cast to bypass mismatched @ai-sdk/provider versions between transitive deps.
    model: openai("gpt-4o-mini") as any,
    temperature: openerMode ? 0.2 : 0.4,
    system,
    messages: coreMessages
  });

  return result.toAIStreamResponse();
}
