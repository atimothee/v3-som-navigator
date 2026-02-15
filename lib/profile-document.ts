export type StoredProfileDocument = {
  fileName?: string;
  extractedText?: string;
  uploadedAt?: string;
};

const PROFILE_DOC_KEY = "profileDocument";

export function parseStoredProfileDocument(privateMetadata: unknown): StoredProfileDocument | null {
  if (!privateMetadata || typeof privateMetadata !== "object") return null;

  const candidate = (privateMetadata as Record<string, unknown>)[PROFILE_DOC_KEY];
  if (!candidate || typeof candidate !== "object") return null;

  const value = candidate as Record<string, unknown>;
  const fileName = toOptionalString(value.fileName);
  const extractedText = toOptionalString(value.extractedText);
  const uploadedAt = toOptionalString(value.uploadedAt);

  if (!fileName && !extractedText && !uploadedAt) return null;

  return {
    fileName: fileName || undefined,
    extractedText: extractedText || undefined,
    uploadedAt: uploadedAt || undefined
  };
}

function toOptionalString(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const trimmed = input.trim();
  return trimmed || null;
}
