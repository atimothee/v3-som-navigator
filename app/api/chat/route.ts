import { openai } from "@ai-sdk/openai";
import { convertToCoreMessages, streamText } from "ai";
import { NextRequest } from "next/server";
import { formatProfile, retrieveProfiles } from "@/lib/rag";

export const runtime = "nodejs";

const CONTEXT_PROFILE_LIMIT = 10;
const PROFILE_DISPLAY_MIN = 7;
const PROFILE_DISPLAY_MAX = 10;

export async function POST(req: NextRequest) {
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

  let retrieval = null as Awaited<ReturnType<typeof retrieveProfiles>> | null;
  try {
    retrieval = await retrieveProfiles(userQuestion);
  } catch (err) {
    console.error("Failed to retrieve profiles via Pinecone:", err);
    return new Response("Pinecone retrieval unavailable. Check Pinecone configuration and index readiness.", { status: 500 });
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

  const profileInstruction =
    `Highlight ${PROFILE_DISPLAY_MIN}-${PROFILE_DISPLAY_MAX} profiles from the available context (use all if fewer than ${PROFILE_DISPLAY_MIN} appear), each with LinkedIn references and location hints.`;

  const system =
    "You are the SOM Network Navigator, a warm guide for connecting Yale SOM students and alumni for coffee chats.\n" +
    `Use the provided alum context to recommend 5-10 specific people with reasons.\n` +
    "Be concise, prefer short bullets, include link to Linkedin profile + location hints, and add a brief outreach opener when asked.\n" +
    `${profileInstruction}\n\n` +
    "Strict rules:" +
    "\n- Only recommend people from the provided alum context." +
    "\n- If no relevant alum context is provided, give general advice on how to approach coffee chats." +
    "\n- Always maintain a friendly and encouraging tone." +
    "\n - Do not fabricate information about alumni.\n" +
    `Alum context:\n${context}`;

  const result = await streamText({
    // Cast to bypass mismatched @ai-sdk/provider versions between transitive deps.
    model: openai("gpt-4o-mini") as any,
    temperature: 0.4,
    system,
    messages: coreMessages
  });

  return result.toAIStreamResponse();
}
