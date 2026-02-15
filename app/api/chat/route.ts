import { openai } from "@ai-sdk/openai";
import { convertToCoreMessages, generateText, streamText } from "ai";
import { currentUser } from "@clerk/nextjs/server";
import { resolveStoredProfileDocument } from "@/lib/profile-document";
import { isAuthorizedYaleUser } from "@/lib/require-yale-user";
import { NextRequest } from "next/server";
import { formatProfile, retrieveProfiles } from "@/lib/rag";
import { OPENER_STYLE_GUIDELINES } from "@/lib/opener-instructions";

export const runtime = "nodejs";

const CONTEXT_PROFILE_LIMIT = 10;
const PROFILE_DISPLAY_MIN = 7;
const PROFILE_DISPLAY_MAX = 10;
const PROFILE_DOCUMENT_MAX_CHARS = 8000;
const TARGET_CONTEXT_MAX_CHARS = 2500;
const MAX_SIMILARITY_ITEMS = 6;
const NO_TARGET_CONTEXT = "Not available.";

type ChatIntent = "draft_primary" | "search_primary" | "hybrid";

type SimilaritySignals = {
  overlaps: string[];
  senderAnchors: string[];
  targetAnchors: string[];
  evidence: string[];
};

function includesAny(text: string, phrases: string[]): boolean {
  return phrases.some((phrase) => text.includes(phrase));
}

function classifyIntent(input: string): ChatIntent {
  const normalized = input.toLowerCase();
  if (!normalized.trim()) return "draft_primary";

  const searchSignals = [
    "find people",
    "find alumni",
    "search",
    "who should i reach out",
    "who should i contact",
    "recommend people",
    "recommend alumni",
    "suggest people",
    "give me profiles",
    "people in",
    "alumni in"
  ];

  const draftSignals = [
    "draft",
    "opener",
    "linkedin dm",
    "linkedin message",
    "cold message",
    "rewrite",
    "edit this",
    "tone",
    "follow-up",
    "follow up",
    "make this shorter",
    "improve this",
    "target person:"
  ];

  const hasSearchIntent = includesAny(normalized, searchSignals);
  const hasDraftIntent = includesAny(normalized, draftSignals);

  if (hasSearchIntent && hasDraftIntent) return "hybrid";
  if (hasSearchIntent) return "search_primary";
  return "draft_primary";
}

function shouldRetrieveProfiles(intent: ChatIntent): boolean {
  return intent === "search_primary" || intent === "hybrid";
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
  if (!senderContext?.trim() || !targetContext.trim() || targetContext === NO_TARGET_CONTEXT) {
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

function buildDraftSystem(
  profileDocText: string | undefined,
  openerTargetContext: string,
  similaritySignals: SimilaritySignals,
  alumContext: string
): string {
  return (
    "You are the SOM Draft Assistant. Your primary role is helping the user draft strong cold networking opener text.\n" +
    "Prioritize drafting quality first, and treat profile search as optional support when requested.\n\n" +
    "Core behavior:\n" +
    "- Draft, rewrite, tighten, and personalize opener messages for cold outreach.\n" +
    "- Offer 2-4 variants when asked (for example concise, friendly, formal).\n" +
    "- Produce follow-up messages when asked.\n" +
    "- Ask one focused clarification question only when truly required to continue.\n\n" +
    `${OPENER_STYLE_GUIDELINES}\n\n` +
    "Grounding requirements:\n" +
    "- Use the provided sender resume context when available.\n" +
    "- Use target profile details when available.\n" +
    "- Never invent facts about the sender or target.\n" +
    "- If target details are missing, produce a customizable draft with placeholders and one clear next-input request.\n\n" +
    "Search behavior:\n" +
    "- If the user explicitly asks for people suggestions, use the provided alum context and recommend relevant profiles.\n" +
    "- If no alum context is available, say that and ask for filters (industry, location, function).\n\n" +
    "Output rules:\n" +
    "- Default to concise prose.\n" +
    "- Avoid fluff, cliches, and generic praise.\n" +
    "- Do not use emojis.\n\n" +
    `Sender resume context (if available):\n${profileDocText ?? "Not available."}\n\n` +
    `Target profile context:\n${openerTargetContext}\n\n` +
    `Model-derived overlap candidates:\n${similaritySignals.overlaps.join(", ") || "None"}\n` +
    `Sender anchors:\n${similaritySignals.senderAnchors.join(", ") || "None"}\n` +
    `Target anchors:\n${similaritySignals.targetAnchors.join(", ") || "None"}\n` +
    `Model-derived evidence:\n${similaritySignals.evidence.join(" | ") || "None"}\n\n` +
    `Alum context (optional):\n${alumContext}`
  );
}

function buildSearchSystem(alumContext: string): string {
  const profileInstruction = `Highlight ${PROFILE_DISPLAY_MIN}-${PROFILE_DISPLAY_MAX} profiles from available context (use all if fewer than ${PROFILE_DISPLAY_MIN} exist), each with LinkedIn reference and location hints.`;

  return (
    "You are the SOM Network Navigator. The user asked for people search and recommendations.\n" +
    "Recommend relevant Yale SOM alumni from provided context and keep it practical.\n" +
    "When helpful, include a brief optional first-line outreach opener for each person.\n\n" +
    `${profileInstruction}\n\n` +
    "Strict rules:\n" +
    "- Only recommend people from the provided alum context.\n" +
    "- If no matching context is available, say so clearly and suggest how to refine the search.\n" +
    "- Do not fabricate alumni details.\n\n" +
    `Alum context:\n${alumContext}`
  );
}

function buildHybridSystem(
  profileDocText: string | undefined,
  openerTargetContext: string,
  similaritySignals: SimilaritySignals,
  alumContext: string
): string {
  return (
    "You are the SOM Draft Assistant handling a combined request: find people and draft outreach opener text.\n" +
    "Return two sections in this order:\n" +
    "1) People to consider\n" +
    "2) Draft opener\n\n" +
    "People section rules:\n" +
    "- Recommend 3-6 relevant profiles from alum context with one reason each.\n" +
    "- Include LinkedIn reference and location hints when present.\n\n" +
    "Draft section rules:\n" +
    "- Provide one polished opener message tailored to the top recommended person or explicit target details.\n" +
    "- Use the style and grounding requirements below.\n\n" +
    `${OPENER_STYLE_GUIDELINES}\n\n` +
    "Strict rules:\n" +
    "- Only use provided context.\n" +
    "- Never fabricate alumni or sender details.\n\n" +
    `Sender resume context (if available):\n${profileDocText ?? "Not available."}\n\n` +
    `Target profile context:\n${openerTargetContext}\n\n` +
    `Model-derived overlap candidates:\n${similaritySignals.overlaps.join(", ") || "None"}\n` +
    `Sender anchors:\n${similaritySignals.senderAnchors.join(", ") || "None"}\n` +
    `Target anchors:\n${similaritySignals.targetAnchors.join(", ") || "None"}\n` +
    `Model-derived evidence:\n${similaritySignals.evidence.join(" | ") || "None"}\n\n` +
    `Alum context:\n${alumContext}`
  );
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

  const intent = classifyIntent(userQuestion);
  const explicitTargetContext = extractTargetBlock(userQuestion);

  const user = await currentUser();
  const profileDoc = resolveStoredProfileDocument(user);
  const profileDocText = profileDoc?.extractedText?.slice(0, PROFILE_DOCUMENT_MAX_CHARS);

  let retrieval = null as Awaited<ReturnType<typeof retrieveProfiles>> | null;
  if (shouldRetrieveProfiles(intent)) {
    try {
      retrieval = await retrieveProfiles(userQuestion);
    } catch (err) {
      console.error("Failed to retrieve profiles via Pinecone/Exa:", err);
    }
  }

  const matches = retrieval?.results ?? [];
  const contextMatches = matches.slice(0, CONTEXT_PROFILE_LIMIT);
  const alumContext = contextMatches.length
    ? contextMatches.map(({ profile }) => formatProfile(profile)).join("\n\n")
    : "No alumni context retrieved for this turn.";

  const openerTargetContext =
    explicitTargetContext ?? (contextMatches[0] ? formatProfile(contextMatches[0].profile) : NO_TARGET_CONTEXT);

  const needsDraftSignalExtraction = intent === "draft_primary" || intent === "hybrid";
  const similaritySignals = needsDraftSignalExtraction
    ? await generateSimilaritySignals(profileDocText, openerTargetContext)
    : emptySimilaritySignals();

  let system = "";
  if (intent === "search_primary") {
    system = buildSearchSystem(alumContext);
  } else if (intent === "hybrid") {
    system = buildHybridSystem(profileDocText, openerTargetContext, similaritySignals, alumContext);
  } else {
    system = buildDraftSystem(profileDocText, openerTargetContext, similaritySignals, alumContext);
  }

  const result = await streamText({
    // Cast to bypass mismatched @ai-sdk/provider versions between transitive deps.
    model: openai("gpt-4o-mini") as any,
    temperature: intent === "search_primary" ? 0.4 : 0.25,
    system,
    messages: coreMessages
  });

  return result.toAIStreamResponse();
}
