"use client";

import { Button, Card, Flex, Heading, Text } from "@radix-ui/themes";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";

type DocumentStatus = {
  hasDocument: boolean;
  document: {
    type: "resume" | "linkedin_pdf";
    fileName: string;
    uploadedAt: string;
    excerptPreview: string;
    signalCounts: {
      skills: number;
      industries: number;
      companies: number;
      schools: number;
      locations: number;
    };
  } | null;
};

type Props = {
  mode?: "onboarding" | "account";
};

export function ProfileDocumentManager({ mode = "account" }: Props) {
  const [status, setStatus] = useState<DocumentStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [docType, setDocType] = useState<"resume" | "linkedin_pdf">("resume");
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    void loadStatus();
  }, []);

  const uploadedAtLabel = useMemo(() => {
    if (!status?.document?.uploadedAt) return null;
    return new Date(status.document.uploadedAt).toLocaleString();
  }, [status?.document?.uploadedAt]);

  const loadStatus = async () => {
    setIsLoading(true);
    setError(null);

    const response = await fetch("/api/user/profile-document", {
      method: "GET",
      cache: "no-store"
    });

    const payload = (await response.json()) as DocumentStatus & { error?: string };

    if (!response.ok) {
      setError(payload.error ?? "Failed to load your profile document status.");
      setIsLoading(false);
      return;
    }

    setStatus(payload);
    setIsLoading(false);
  };

  const onUpload = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!file) {
      setError("Pick a PDF file to upload.");
      return;
    }

    setIsBusy(true);
    setError(null);
    setSuccess(null);

    const form = new FormData();
    form.append("file", file);
    form.append("docType", docType);

    const response = await fetch("/api/user/profile-document", {
      method: "POST",
      body: form
    });

    const payload = (await response.json()) as DocumentStatus & { error?: string };

    if (!response.ok) {
      setError(payload.error ?? "Upload failed.");
      setIsBusy(false);
      return;
    }

    setStatus(payload);
    setFile(null);
    setSuccess("Profile document saved.");
    setIsBusy(false);
  };

  const onDelete = async () => {
    setIsBusy(true);
    setError(null);
    setSuccess(null);

    const response = await fetch("/api/user/profile-document", {
      method: "DELETE"
    });

    const payload = (await response.json()) as DocumentStatus & { error?: string };

    if (!response.ok) {
      setError(payload.error ?? "Delete failed.");
      setIsBusy(false);
      return;
    }

    setStatus(payload);
    setFile(null);
    setSuccess("Profile document removed.");
    setIsBusy(false);
  };

  return (
    <Card className="glass" size="4">
      <Flex direction="column" gap="3">
        <Heading size="6">Personalization Document</Heading>
        <Text size="2" color="gray">
          Upload a resume PDF or LinkedIn profile PDF export so outreach drafts can reflect your background and likely common ground.
        </Text>

        {isLoading ? <Text size="2" color="gray">Loading status...</Text> : null}

        {!isLoading && status?.document ? (
          <Card variant="surface">
            <Flex direction="column" gap="1">
              <Text size="2">
                Current file: <strong>{status.document.fileName}</strong>
              </Text>
              <Text size="2" color="gray">
                Type: {status.document.type === "linkedin_pdf" ? "LinkedIn PDF" : "Resume"}
              </Text>
              {uploadedAtLabel ? (
                <Text size="2" color="gray">
                  Last updated: {uploadedAtLabel}
                </Text>
              ) : null}
              <Text size="2" color="gray">
                Extracted signals: {status.document.signalCounts.skills} skills, {status.document.signalCounts.industries} industries, {status.document.signalCounts.companies} companies
              </Text>
            </Flex>
          </Card>
        ) : null}

        <form onSubmit={onUpload} className="profile-doc-form">
          <label className="search-field">
            <span>Document type</span>
            <select value={docType} onChange={(event) => setDocType(event.target.value as "resume" | "linkedin_pdf")}>
              <option value="resume">Resume PDF</option>
              <option value="linkedin_pdf">LinkedIn profile PDF export</option>
            </select>
          </label>

          <label className="search-field">
            <span>PDF file</span>
            <input
              type="file"
              accept="application/pdf,.pdf"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
          </label>

          <Flex gap="2" align="center" wrap="wrap" mt="2">
            <Button type="submit" disabled={isBusy || !file}>
              {status?.hasDocument ? "Replace document" : "Upload document"}
            </Button>
            {status?.hasDocument ? (
              <Button type="button" variant="soft" color="red" onClick={onDelete} disabled={isBusy}>
                Delete
              </Button>
            ) : null}
          </Flex>
        </form>

        {error ? <Text size="2" color="red">{error}</Text> : null}
        {success ? <Text size="2" color="green">{success}</Text> : null}

        {mode === "onboarding" ? (
          <Flex gap="2" wrap="wrap" mt="2">
            <Button asChild>
              <Link href="/workspace">Continue to workspace</Link>
            </Button>
            <Button asChild variant="soft" color="gray">
              <Link href="/workspace">Skip for now</Link>
            </Button>
          </Flex>
        ) : null}
      </Flex>
    </Card>
  );
}
