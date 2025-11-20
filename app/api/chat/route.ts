import { openai } from "@ai-sdk/openai";
import { convertToCoreMessages, streamText } from "ai";
import { NextRequest } from "next/server";
import { formatProfile, retrieveProfiles } from "@/lib/rag";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!process.env.OPENAI_API_KEY) {
    return new Response("Missing OPENAI_API_KEY", { status: 500 });
  }

  const { messages } = (await req.json()) as { messages: unknown };
  const coreMessages = convertToCoreMessages(messages ?? []);
  const last = coreMessages[coreMessages.length - 1];
  const userQuestion =
    typeof last?.content === "string"
      ? last.content
      : Array.isArray(last?.content)
        ? last.content
            .map((chunk) => ("text" in chunk && typeof chunk.text === "string" ? chunk.text : ""))
            .join(" ")
        : "";

  const matches = await retrieveProfiles(userQuestion);
  const context = matches.map(({ profile }) => formatProfile(profile)).join("\n\n") ||
    "No specific context matched; offer general networking guidance for SOM coffee chats.";

  const system =
    "You are the SOM Network Navigator, a warm guide for connecting Yale SOM students and alumni for coffee chats.\n" +
    "Use the provided alum context to recommend 2-3 specific people with reasons.\n" +
    "Be concise, prefer short bullets, include availability + location hints, and add a brief outreach opener when asked.\n\n" +
    `Alum context:\n${context}`;

  const result = await streamText({
    model: openai("gpt-4o-mini"),
    temperature: 0.4,
    system,
    messages: coreMessages
  });

  return result.toAIStreamResponse();
}
