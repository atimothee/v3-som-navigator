import { isAuthorizedYaleUser } from "@/lib/require-yale-user";
import { superSearchLinkedinProfiles } from "@/lib/super-search";
import { NextRequest, NextResponse } from "next/server";

type SuperSearchBody = {
  query?: unknown;
  maxResults?: unknown;
};

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const authorized = await isAuthorizedYaleUser();
  if (!authorized) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as SuperSearchBody;
  const query = typeof body.query === "string" ? body.query.trim() : "";
  const maxResults = typeof body.maxResults === "number" ? body.maxResults : 8;
  const yaleOnly = true;
  const yaleSomOnly = true;

  if (!query) {
    return NextResponse.json({ error: "Query is required." }, { status: 400 });
  }

  const apiKey = process.env.EXA_API_KEY?.trim() || "";

  if (!apiKey) {
    return NextResponse.json({ error: "Search is temporarily unavailable." }, { status: 503 });
  }

  try {
    const results = await superSearchLinkedinProfiles({
      query,
      apiKey,
      maxResults,
      yaleOnly,
      yaleSomOnly
    });

    return NextResponse.json({
      query,
      yaleOnly,
      yaleSomOnly,
      count: results.length,
      results
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Super search failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
