import { openai } from "@ai-sdk/openai";
import { convertToCoreMessages, streamText } from "ai";
import { NextRequest } from "next/server";
import { formatProfile, retrieveProfiles } from "@/lib/rag";

export async function POST(req: NextRequest) {
  if (!process.env.OPENAI_API_KEY) {
    return new Response("Missing OPENAI_API_KEY", { status: 500 });
  }

  const { messages } = await req.json();
  const userQuestion = messages?.[messages.length - 1]?.content ?? "";

  const matches = await retrieveProfiles(userQuestion);
  const context = matches.map(({ profile }) => formatProfile(profile)).join("\n\n");

  const system =
    "You are the SOM Network Navigator, a warm guide for connecting Yale SOM students and alumni for coffee chats. " +
    "Use the provided alum context to recommend 2-3 specific people with reasons. " +
    "Be concise, format with short bullets, and include availability and location hints. " +
    "If asked for outreach help, suggest a brief opening line.";

  const result = await streamText({
    model: openai("gpt-4o-mini"),
    temperature: 0.4,
    messages: [
      { role: "system", content: system },
      ...convertToCoreMessages(messages),
      {
        role: "system",
        content: context
          ? `Alum context:\n${context}`
          : "No specific context matched; offer general networking guidance for SOM coffee chats."
      }
    ]
  });

  return result.toAIStreamResponse();
}
