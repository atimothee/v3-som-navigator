"use client";

import { ChatPanel } from "@/components/chat-panel";
import { Button, Card, Flex, Heading, Text } from "@radix-ui/themes";
import Link from "next/link";
import { useEffect, useState } from "react";

type SuperSearchProvider = "exa" | "parallel";
type SuperSearchResult = {
  id: string;
  name: string;
  title: string;
  gradYear: string;
  location: string;
  interests: string[];
  summary: string;
  availability: string;
  linkedinUrl?: string;
  publishedDate?: string;
  snippet: string;
  description: string;
  oneLiner: string;
  source: SuperSearchProvider;
};

export function SearchChatWorkspace({ hasProfileDocumentText }: { hasProfileDocumentText: boolean }) {
  const [chatSeed, setChatSeed] = useState<{ text: string; nonce: number } | null>(null);
  const [expandedDescriptions, setExpandedDescriptions] = useState<Record<string, boolean>>({});
  const [superProvider, setSuperProvider] = useState<SuperSearchProvider>("exa");
  const [superApiKey, setSuperApiKey] = useState("");
  const [superQuery, setSuperQuery] = useState("");
  const [superSearching, setSuperSearching] = useState(false);
  const [superError, setSuperError] = useState<string | null>(null);
  const [superResults, setSuperResults] = useState<SuperSearchResult[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const provider = window.localStorage.getItem("super-search-provider");
    const exaKey = window.localStorage.getItem("super-search-exa-key");
    const parallelKey = window.localStorage.getItem("super-search-parallel-key");

    if (provider === "parallel" || provider === "exa") {
      setSuperProvider(provider);
      setSuperApiKey(provider === "parallel" ? parallelKey ?? "" : exaKey ?? "");
      return;
    }

    if (exaKey) {
      setSuperApiKey(exaKey);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("super-search-provider", superProvider);
    const savedKey =
      superProvider === "parallel"
        ? window.localStorage.getItem("super-search-parallel-key")
        : window.localStorage.getItem("super-search-exa-key");
    setSuperApiKey(savedKey ?? "");
  }, [superProvider]);

  async function runSuperSearch() {
    const normalizedQuery = superQuery.trim();
    if (!normalizedQuery) {
      setSuperError("Enter a natural-language search query.");
      return;
    }
    if (!superApiKey.trim()) {
      setSuperError(`Add your ${superProvider === "exa" ? "Exa" : "Parallel.ai"} API key first.`);
      return;
    }

    setSuperSearching(true);
    setSuperError(null);
    setSuperResults([]);

    try {
      const response = await fetch("/api/super-search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify({
          query: normalizedQuery,
          provider: superProvider,
          apiKey: superApiKey.trim(),
          maxResults: 10
        })
      });

      const rawBody = await response.text();
      let payload: { results?: SuperSearchResult[]; error?: string } = {};
      try {
        payload = rawBody ? (JSON.parse(rawBody) as { results?: SuperSearchResult[]; error?: string }) : {};
      } catch {
        payload = {};
      }

      if (!response.ok) {
        if (payload.error) {
          throw new Error(payload.error);
        }
        if (rawBody.trim().startsWith("<!DOCTYPE") || rawBody.trim().startsWith("<html")) {
          throw new Error("Super search returned HTML instead of JSON. Your session may have expired; refresh and sign in again.");
        }
        throw new Error(rawBody.slice(0, 220) || "Super search failed.");
      }

      const results = Array.isArray(payload.results) ? payload.results : [];
      setSuperResults(results);
      if (results.length === 0) {
        setSuperError("No LinkedIn profile matches returned for this query.");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Super search failed.";
      setSuperError(message);
    } finally {
      setSuperSearching(false);
    }
  }

  function saveSuperSearchKey() {
    if (typeof window === "undefined") return;
    const storageKey = superProvider === "exa" ? "super-search-exa-key" : "super-search-parallel-key";
    window.localStorage.setItem(storageKey, superApiKey.trim());
  }

  return (
    <div className="search-chat-shell">
      <section className="search-pane glass" aria-label="People search">
        <Flex justify="between" align="center" wrap="wrap" gap="3">
          <Heading size="6">Super Search</Heading>
          <Flex direction="column" align="end" gap="1">
            <Text size="1" color={hasProfileDocumentText ? "green" : "gray"}>
              {hasProfileDocumentText ? (
                "Personalized opener mode is on"
              ) : (
                <>
                  Upload resume/LinkedIn PDF with extractable text for personalization.{" "}
                  <Link href="/account/profile-document" style={{ textDecoration: "underline" }}>
                    Add now
                  </Link>
                </>
              )}
            </Text>
          </Flex>
        </Flex>

        <div className="super-search-panel">
          <Flex justify="between" align="center" wrap="wrap" gap="2" mb="2">
            <Text as="p" size="4" weight="bold">
              Super Search (Web LinkedIn)
            </Text>
            <Text size="1" color="gray">
              Uses your own Exa or Parallel.ai key
            </Text>
          </Flex>

          <div className="super-search-controls">
            <label className="search-field">
              <span>Provider</span>
              <select value={superProvider} onChange={(event) => setSuperProvider(event.target.value as SuperSearchProvider)}>
                <option value="exa">Exa</option>
                <option value="parallel">Parallel.ai</option>
              </select>
            </label>

            <label className="search-field">
              <span>API key</span>
              <input
                type="password"
                placeholder={superProvider === "exa" ? "Enter Exa API key" : "Enter Parallel.ai API key"}
                value={superApiKey}
                onChange={(event) => setSuperApiKey(event.target.value)}
              />
            </label>

            <Button type="button" variant="soft" color="gray" onClick={saveSuperSearchKey}>
              Save key
            </Button>
          </div>

          <label className="search-field">
            <span>Natural-language LinkedIn search</span>
            <input
              type="text"
              placeholder="Example: Yale SOM alumni in climate fintech in NYC open to coffee chats"
              value={superQuery}
              onChange={(event) => setSuperQuery(event.target.value)}
            />
          </label>

          <Flex gap="2" mt="3" wrap="wrap" align="center">
            <Button type="button" onClick={runSuperSearch} disabled={superSearching}>
              {superSearching ? "Searching..." : "Run super search"}
            </Button>
            <Text size="1" color="gray">
              Key is stored locally in your browser only.
            </Text>
          </Flex>

          {superError ? (
            <Text as="p" size="2" color="red" mt="2">
              {superError}
            </Text>
          ) : null}

          {superResults.length > 0 ? (
            <div className="super-results" aria-live="polite">
              {superResults.map((result) => (
                <Card key={result.id} className="profile-card" variant="surface">
                  <Flex align="center" gap="3" mb="3">
                    <div className="profile-avatar" aria-hidden>
                      {getInitials(result.name)}
                    </div>
                    <div>
                      <Text as="p" size="5" weight="bold">
                        {result.name}
                      </Text>
                      <Text as="p" size="2" color="gray">
                        {result.title}
                      </Text>
                      <Text as="p" size="2" color="gray">
                        {result.location}
                      </Text>
                    </div>
                  </Flex>

                  <Text
                    as="p"
                    size="2"
                    className={expandedDescriptions[result.id] ? "profile-summary profile-summary-expanded" : "profile-summary"}
                  >
                    {result.summary}
                  </Text>

                  {result.summary.length > 220 ? (
                    <Button
                      type="button"
                      variant="ghost"
                      color="gray"
                      size="1"
                      className="profile-description-toggle"
                      onClick={() =>
                        setExpandedDescriptions((prev) => ({
                          ...prev,
                          [result.id]: !prev[result.id]
                        }))
                      }
                    >
                      {expandedDescriptions[result.id] ? "Show less" : "Read full description"}
                    </Button>
                  ) : null}

                  <Text as="p" size="1" color="gray" mt="1">
                    via: {result.source === "exa" ? "Exa" : "Parallel.ai"}
                  </Text>

                  <Flex gap="2" mt="4" wrap="wrap">
                    {result.linkedinUrl ? (
                      <Button asChild>
                        <a href={result.linkedinUrl} target="_blank" rel="noreferrer">
                          Go to profile
                        </a>
                      </Button>
                    ) : null}

                    <Button
                      variant="soft"
                      color="gray"
                      onClick={() =>
                        setChatSeed({
                          text:
                            `Generate one LinkedIn DM opener for this target using resume-to-LinkedIn opener mode.\n` +
                            `Use my uploaded resume/LinkedIn PDF text as sender context if available.\n` +
                            `Target person:\n` +
                            `- Name: ${result.name}\n` +
                            `- Title: ${result.title}\n` +
                            `- Location: ${result.location}\n` +
                            `- Interests: ${result.interests.join(", ") || "Not listed"}\n` +
                            `- Summary: ${result.summary}\n` +
                            `- LinkedIn: ${result.linkedinUrl ?? "Not provided"}\n` +
                            `Return only the final LinkedIn DM message.`,
                          nonce: Date.now()
                        })
                      }
                    >
                      Draft opener text
                    </Button>
                  </Flex>
                </Card>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      <section className="chat-pane">
        <ChatPanel
          className="chat-panel-wide"
          placeholder="Who can help me explore climate finance roles in NYC?"
          autoSendText={chatSeed?.text}
          autoSendNonce={chatSeed?.nonce}
        />
      </section>
    </div>
  );
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
