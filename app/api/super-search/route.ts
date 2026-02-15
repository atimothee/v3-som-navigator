import { isAuthorizedYaleUser } from "@/lib/require-yale-user";
import { superSearchLinkedinProfiles, type SuperSearchProvider } from "@/lib/super-search";
import { NextRequest, NextResponse } from "next/server";

type SuperSearchBody = {
  query?: unknown;
  provider?: unknown;
  apiKey?: unknown;
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
  const provider = body.provider === "parallel" ? "parallel" : "exa";
  const maxResults = typeof body.maxResults === "number" ? body.maxResults : 8;

  if (!query) {
    return NextResponse.json({ error: "Query is required." }, { status: 400 });
  }

  const keyFromBody = typeof body.apiKey === "string" ? body.apiKey.trim() : "";
  const keyFromEnv = provider === "exa" ? process.env.EXA_API_KEY : process.env.PARALLEL_API_KEY;
  const apiKey = keyFromBody || keyFromEnv || "";

  if (!apiKey) {
    const name = provider === "exa" ? "Exa" : "Parallel.ai";
    return NextResponse.json(
      { error: `${name} API key is required. Add one in Super Search settings.` },
      { status: 400 }
    );
  }

  try {
    const results = await superSearchLinkedinProfiles({
      query,
      provider: provider as SuperSearchProvider,
      apiKey,
      maxResults
    });

    return NextResponse.json({
      provider,
      query,
      count: results.length,
      results
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Super search failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
