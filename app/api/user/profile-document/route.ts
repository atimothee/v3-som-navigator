import {
  buildStoredProfileDocument,
  parseStoredProfileDocument,
  removeStoredProfileDocument,
  setStoredProfileDocument,
  type ProfileDocumentType,
  type StoredProfileDocument
} from "@/lib/profile-document";
import { isAuthorizedYaleUser } from "@/lib/require-yale-user";
import { auth, clerkClient, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_FILE_BYTES = 8 * 1024 * 1024;

export async function GET() {
  const authorized = await isAuthorizedYaleUser();
  if (!authorized) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const doc = parseStoredProfileDocument(user.privateMetadata);
  return NextResponse.json({
    hasDocument: Boolean(doc),
    document: serializeDocument(doc)
  });
}

export async function POST(req: NextRequest) {
  const authorized = await isAuthorizedYaleUser();
  if (!authorized) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await req.formData();
  const file = form.get("file");
  const requestedType = form.get("docType");

  const docType: ProfileDocumentType = requestedType === "linkedin_pdf" ? "linkedin_pdf" : "resume";

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "A PDF file is required." }, { status: 400 });
  }

  if (!isPdfFile(file)) {
    return NextResponse.json(
      { error: "Only PDF files are accepted. Upload a resume PDF or LinkedIn profile PDF export." },
      { status: 400 }
    );
  }

  if (file.size <= 0) {
    return NextResponse.json({ error: "The uploaded file is empty." }, { status: 400 });
  }

  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json(
      { error: `File is too large. Maximum size is ${Math.floor(MAX_FILE_BYTES / (1024 * 1024))}MB.` },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const text = await extractTextFromPdf(buffer);

  if (!text.trim()) {
    return NextResponse.json(
      {
        error:
          "No readable text found in this PDF. If this is an image-only/scanned document, export a text-based PDF from LinkedIn or your resume tool."
      },
      { status: 422 }
    );
  }

  const doc = buildStoredProfileDocument({
    fileName: file.name || "uploaded-profile.pdf",
    type: docType,
    extractedText: text
  });

  const client = await clerkClient();
  const privateMetadata = setStoredProfileDocument(user.privateMetadata, doc);

  await client.users.updateUserMetadata(userId, {
    privateMetadata
  });

  return NextResponse.json({
    hasDocument: true,
    document: serializeDocument(doc)
  });
}

export async function DELETE() {
  const authorized = await isAuthorizedYaleUser();
  if (!authorized) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const client = await clerkClient();
  const privateMetadata = removeStoredProfileDocument(user.privateMetadata);

  await client.users.updateUserMetadata(userId, {
    privateMetadata
  });

  return NextResponse.json({
    hasDocument: false,
    document: null
  });
}

function isPdfFile(file: File) {
  const mime = file.type.toLowerCase();
  const name = file.name.toLowerCase();
  return mime.includes("pdf") || name.endsWith(".pdf");
}

async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  const parseOutput = await tryPdfParse(buffer);
  if (parseOutput.trim()) return parseOutput;

  const rawOutput = tryRawPdfText(buffer);
  if (rawOutput.trim()) return rawOutput;

  return "";
}

async function tryPdfParse(buffer: Buffer): Promise<string> {
  try {
    const pdfParse = (await import("pdf-parse")).default;
    const parsed = await pdfParse(buffer);
    return typeof parsed.text === "string" ? parsed.text : "";
  } catch (error) {
    console.warn("pdf-parse could not extract text from uploaded profile document.", error);
    return "";
  }
}

function tryRawPdfText(buffer: Buffer): string {
  try {
    // Fallback for PDFs that fail structured parsing: recover literal text fragments from content streams.
    const input = buffer.toString("latin1");
    const matches = input.match(/\((?:\\.|[^\\()]){2,}\)/g) ?? [];
    const chunks = matches
      .map((token) => token.slice(1, -1))
      .map((token) =>
        token
          .replace(/\\n/g, "\n")
          .replace(/\\r/g, "\n")
          .replace(/\\t/g, " ")
          .replace(/\\\(/g, "(")
          .replace(/\\\)/g, ")")
          .replace(/\\\\/g, "\\")
      )
      .map((token) => token.replace(/[^\x20-\x7E\n]/g, " "))
      .map((token) => token.replace(/\s+/g, " ").trim())
      .filter((token) => token.length > 2);

    return chunks.join("\n");
  } catch (error) {
    console.warn("Raw PDF text fallback could not extract text from uploaded profile document.", error);
    return "";
  }
}

function serializeDocument(doc: StoredProfileDocument | null) {
  if (!doc) return null;
  const signals = doc.signals ?? {
    skills: [],
    industries: [],
    companies: [],
    schools: [],
    locations: []
  };
  const excerptPreview = (doc.textExcerpt ?? doc.extractedText ?? "").slice(0, 280);
  const type = doc.type === "linkedin_pdf" ? "linkedin_pdf" : "resume";

  return {
    type,
    fileName: doc.fileName ?? "uploaded-profile.pdf",
    uploadedAt: doc.uploadedAt,
    excerptPreview,
    signalCounts: {
      skills: signals.skills.length,
      industries: signals.industries.length,
      companies: signals.companies.length,
      schools: signals.schools.length,
      locations: signals.locations.length
    }
  };
}
