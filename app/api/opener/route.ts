import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";
import { currentUser } from "@clerk/nextjs/server";
import { isAuthorizedYaleUser } from "@/lib/require-yale-user";
import { resolveStoredProfileDocument } from "@/lib/profile-document";
import { OPENER_STYLE_GUIDELINES } from "@/lib/opener-instructions";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const PROFILE_DOCUMENT_MAX_CHARS = 8000;

type OpenerTarget = {
  name?: string;
  title?: string;
  location?: string;
  interests?: string[];
  summary?: string;
  linkedinUrl?: string;
};

function normalizeTarget(value: unknown): OpenerTarget | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const interests = Array.isArray(record.interests)
    ? record.interests.filter((item): item is string => typeof item === "string").slice(0, 8)
    : [];

  return {
    name: typeof record.name === "string" ? record.name : undefined,
    title: typeof record.title === "string" ? record.title : undefined,
    location: typeof record.location === "string" ? record.location : undefined,
    interests,
    summary: typeof record.summary === "string" ? record.summary : undefined,
    linkedinUrl: typeof record.linkedinUrl === "string" ? record.linkedinUrl : undefined
  };
}

export async function POST(req: NextRequest) {
  const authorized = await isAuthorizedYaleUser();
  if (!authorized) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 });
  }

  const body = (await req.json()) as { target?: unknown };
  const target = normalizeTarget(body.target);

  if (!target?.name && !target?.summary) {
    return NextResponse.json({ error: "Missing target profile context." }, { status: 400 });
  }

  const user = await currentUser();
  const profileDoc = resolveStoredProfileDocument(user);
  const senderContext = profileDoc?.extractedText?.slice(0, PROFILE_DOCUMENT_MAX_CHARS) ?? "Not available.";

  const targetContext = [
    `Name: ${target.name ?? "Unknown"}`,
    `Title: ${target.title ?? "Unknown"}`,
    `Location: ${target.location ?? "Unknown"}`,
    `Interests: ${target.interests?.join(", ") || "Not listed"}`,
    `Summary: ${target.summary ?? "Not available"}`,
    `Profile URL: ${target.linkedinUrl ?? "Not provided"}`
  ].join("\n");

  try {
    const result = await generateText({
      model: openai("gpt-4o-mini") as any,
      temperature: 0.25,
      system:
        "You are writing one standalone LinkedIn networking opener. " +
        `${OPENER_STYLE_GUIDELINES} ` +
        "Use details from the target context and use sender context if available. " +
        "Return only the final opener text.",
      prompt: `Sender context:\n${senderContext}\n\nTarget context:\n${targetContext}`
    });

    return NextResponse.json({ text: result.text.trim() });
  } catch (error) {
    console.error("Failed to generate standalone opener:", error);
    return NextResponse.json({ error: "Failed to generate opener." }, { status: 500 });
  }
}
