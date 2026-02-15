export type StoredProfileDocument = {
  fileName?: string;
  extractedText?: string;
  uploadedAt?: string;
};

const PROFILE_DOC_KEY = "profileDocument";
const PROFILE_DOC_ALT_KEY = "profile_document";

type MaybeUserMetadata = {
  privateMetadata?: unknown;
  publicMetadata?: unknown;
  unsafeMetadata?: unknown;
};

export function parseStoredProfileDocument(privateMetadata: unknown): StoredProfileDocument | null {
  if (!privateMetadata || typeof privateMetadata !== "object") return null;

  const source = privateMetadata as Record<string, unknown>;
  const candidate = source[PROFILE_DOC_KEY] ?? source[PROFILE_DOC_ALT_KEY];
  if (!candidate || typeof candidate !== "object") return null;

  const value = candidate as Record<string, unknown>;
  const fileName = toOptionalString(value.fileName);
  const extractedText =
    toOptionalString(value.extractedText) ??
    toOptionalString(value.extracted_text) ??
    toOptionalString(value.text) ??
    toOptionalString(value.content);
  const uploadedAt = toOptionalString(value.uploadedAt);

  if (!fileName && !extractedText && !uploadedAt) return null;

  return {
    fileName: fileName || undefined,
    extractedText: extractedText || undefined,
    uploadedAt: uploadedAt || undefined
  };
}

export function resolveStoredProfileDocument(user: MaybeUserMetadata | null | undefined): StoredProfileDocument | null {
  if (!user) return null;
  return (
    parseStoredProfileDocument(user.privateMetadata) ??
    parseStoredProfileDocument(user.publicMetadata) ??
    parseStoredProfileDocument(user.unsafeMetadata)
  );
}

function toOptionalString(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const trimmed = input.trim();
  return trimmed || null;
}
