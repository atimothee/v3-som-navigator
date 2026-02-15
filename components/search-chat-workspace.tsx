"use client";

import { ChatPanel } from "@/components/chat-panel";
import { trackEvent } from "@/lib/analytics";
import { Button, Card, Flex, Heading, Text } from "@radix-ui/themes";
import Link from "next/link";
import { useEffect, useState } from "react";

type SuperSearchResult = {
  id: string;
  name: string;
  title: string;
  gradYear: string;
  location: string;
  interests: string[];
  summary: string;
  linkedinUrl?: string;
  publishedDate?: string;
  snippet: string;
  description: string;
  oneLiner: string;
  source: "exa";
};

type WorkspaceMode = "search" | "chat";

type OpenerState = {
  loading: boolean;
  text: string | null;
  error: string | null;
};

export function SearchChatWorkspace({ hasProfileDocumentText }: { hasProfileDocumentText: boolean }) {
  const [activeMode, setActiveMode] = useState<WorkspaceMode>("search");
  const [chatPrefill, setChatPrefill] = useState<{ text: string; nonce: number } | null>(null);
  const [expandedDescriptions, setExpandedDescriptions] = useState<Record<string, boolean>>({});
  const [openerByResultId, setOpenerByResultId] = useState<Record<string, OpenerState>>({});
  const [superQuery, setSuperQuery] = useState("");
  const [superSearching, setSuperSearching] = useState(false);
  const [superError, setSuperError] = useState<string | null>(null);
  const [superResults, setSuperResults] = useState<SuperSearchResult[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    window.localStorage.removeItem("super-search-provider");
    window.localStorage.removeItem("super-search-parallel-key");
    window.localStorage.removeItem("super-search-exa-key");
    window.localStorage.removeItem("super-search-yale-only");
    window.localStorage.removeItem("super-search-yale-som-only");
  }, []);

  async function runSuperSearch() {
    const normalizedQuery = superQuery.trim();
    if (!normalizedQuery) {
      setSuperError("Describe who you want to meet.");
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
          throw new Error("People Finder returned HTML instead of JSON. Your session may have expired; refresh and sign in again.");
        }
        throw new Error(rawBody.slice(0, 220) || "People Finder failed.");
      }

      const results = Array.isArray(payload.results) ? payload.results : [];
      setSuperResults(results);
      if (results.length === 0) {
        setSuperError("No Yale SOM alumni profile matches returned for this query.");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "People Finder failed.";
      setSuperError(message);
    } finally {
      setSuperSearching(false);
    }
  }

  function switchMode(nextMode: WorkspaceMode) {
    if (nextMode === activeMode) return;
    trackEvent("Workspace Mode Switched", { from: activeMode, to: nextMode });
    setActiveMode(nextMode);
  }

  async function runOpenerDraft(result: SuperSearchResult) {
    trackEvent("Opener Draft Requested", { profileId: result.id });
    setOpenerByResultId((prev) => ({
      ...prev,
      [result.id]: {
        loading: true,
        text: prev[result.id]?.text ?? null,
        error: null
      }
    }));

    try {
      const response = await fetch("/api/opener", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify({
          target: {
            name: result.name,
            title: result.title,
            location: result.location,
            interests: result.interests,
            summary: result.summary,
            linkedinUrl: result.linkedinUrl
          }
        })
      });
      const payload = (await response.json()) as { text?: string; error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "Unable to generate opener.");
      }
      if (!payload.text?.trim()) {
        throw new Error("No opener returned.");
      }

      setOpenerByResultId((prev) => ({
        ...prev,
        [result.id]: {
          loading: false,
          text: payload.text ?? null,
          error: null
        }
      }));
      trackEvent("Opener Draft Generated", { profileId: result.id });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to generate opener.";
      setOpenerByResultId((prev) => ({
        ...prev,
        [result.id]: {
          loading: false,
          text: prev[result.id]?.text ?? null,
          error: message
        }
      }));
    }
  }

  async function copyOpener(profileId: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      trackEvent("Opener Draft Copied", { profileId });
    } catch {
      // Ignore clipboard errors silently; user can still copy manually.
    }
  }

  function sendOpenerToChat(profileId: string, text: string) {
    setChatPrefill({ text, nonce: Date.now() });
    setActiveMode("chat");
    trackEvent("Opener Sent To Chat", { profileId });
  }

  return (
    <div className="search-chat-shell">
      <Flex className="workspace-mode-toggle" role="tablist" aria-label="Workspace mode">
        <Button
          type="button"
          role="tab"
          variant={activeMode === "search" ? "solid" : "soft"}
          aria-selected={activeMode === "search"}
          className={activeMode === "search" ? "workspace-mode-button active" : "workspace-mode-button"}
          onClick={() => switchMode("search")}
        >
          Find People
        </Button>
        <Button
          type="button"
          role="tab"
          variant={activeMode === "chat" ? "solid" : "soft"}
          aria-selected={activeMode === "chat"}
          className={activeMode === "chat" ? "workspace-mode-button active" : "workspace-mode-button"}
          onClick={() => switchMode("chat")}
        >
          Draft Message
        </Button>
      </Flex>

      <Text as="p" size="2" color="gray" mb="2">
        {activeMode === "search"
          ? "Start by describing who you want to meet."
          : "Refine and personalize your outreach draft before sending."}
      </Text>

      {activeMode === "search" ? (
      <section className="search-pane glass" aria-label="People search">
        <Flex justify="between" align="center" wrap="wrap" gap="3">
          <Heading size="6">People Finder</Heading>
          <Flex direction="column" align="end" gap="1">
            <Text size="1" color={hasProfileDocumentText ? "green" : "gray"}>
              {hasProfileDocumentText ? (
                "Personalization is on"
              ) : (
                <>
                  Upload your resume or LinkedIn PDF to improve opener personalization.{" "}
                  <Link href="/account/profile-document" style={{ textDecoration: "underline" }}>
                    Add now
                  </Link>
                </>
              )}
            </Text>
          </Flex>
        </Flex>

        <div className="super-search-panel">
          <Text as="p" size="2" color="gray" mb="2">
            Finds relevant SOM alumni from verified public profiles.
          </Text>

          <label className="search-field">
            <span>Who do you want to meet?</span>
            <input
              type="text"
              placeholder="Examples: Yale SOM alums in healthcare; AI Product Managers in Seattle; VC in San Francisco"
              value={superQuery}
              onChange={(event) => setSuperQuery(event.target.value)}
            />
          </label>

          <Flex gap="2" mt="3" wrap="wrap" align="center">
            <Button type="button" onClick={runSuperSearch} disabled={superSearching}>
              {superSearching ? "Searching..." : "Find matches"}
            </Button>
            <Text size="1" color="gray">
              Tip: Include industry, location, and role for better matches.
            </Text>
          </Flex>

          {superError ? (
            <Text as="p" size="2" color="red" mt="2">
              {superError}
            </Text>
          ) : null}

          {superResults.length > 0 ? (
            <div className="super-results" aria-live="polite">
              {superResults.map((result) => {
                return (
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

                  <Flex gap="2" mt="4" wrap="wrap">
                    {result.linkedinUrl ? (
                      <Button asChild>
                        <a href={result.linkedinUrl} target="_blank" rel="noreferrer">
                          Go to profile
                        </a>
                      </Button>
                    ) : null}

                    <Button variant="soft" color="gray" onClick={() => runOpenerDraft(result)} disabled={openerByResultId[result.id]?.loading}>
                      {openerByResultId[result.id]?.loading ? "Drafting..." : "Draft personalized opener"}
                    </Button>
                  </Flex>

                  {openerByResultId[result.id]?.error ? (
                    <Text as="p" size="2" color="red" mt="3">
                      {openerByResultId[result.id]?.error}
                    </Text>
                  ) : null}

                  {openerByResultId[result.id]?.text ? (
                    <Card className="opener-result-card" variant="surface" mt="3">
                      <Text as="p" size="2" weight="bold">
                        Outreach draft
                      </Text>
                      <Text as="p" size="2" mt="2">
                        {openerByResultId[result.id]?.text}
                      </Text>
                      <Text as="p" size="1" color="gray" mt="2">
                        Generate a first outreach draft using this person&apos;s profile.
                      </Text>
                      <Flex gap="2" mt="3" wrap="wrap">
                        <Button size="1" variant="soft" onClick={() => copyOpener(result.id, openerByResultId[result.id].text ?? "")}>
                          Copy draft
                        </Button>
                        <Button size="1" variant="soft" color="gray" onClick={() => runOpenerDraft(result)} disabled={openerByResultId[result.id]?.loading}>
                          Regenerate
                        </Button>
                        <Button size="1" onClick={() => sendOpenerToChat(result.id, openerByResultId[result.id].text ?? "")}>
                          Refine in Draft Message
                        </Button>
                      </Flex>
                    </Card>
                  ) : null}
                </Card>
                );
              })}
            </div>
          ) : null}
        </div>
      </section>
      ) : null}

      {activeMode === "chat" ? (
      <section className="chat-pane">
        <ChatPanel
          className="chat-panel-wide"
          placeholder="Refine this opener to sound warm, concise, and specific."
          prefillText={chatPrefill?.text}
          prefillNonce={chatPrefill?.nonce}
        />
      </section>
      ) : null}
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
