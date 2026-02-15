"use client";

import { ChatPanel } from "@/components/chat-panel";
import { Button, Card, Flex, Heading, Text } from "@radix-ui/themes";
import { useMemo, useState } from "react";

type SearchProfile = {
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
};

type SortOption = "recent" | "name";

export function SearchChatWorkspace({ profiles }: { profiles: SearchProfile[] }) {
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("recent");
  const [chatSeed, setChatSeed] = useState<{ text: string; nonce: number } | null>(null);
  const [expandedDescriptions, setExpandedDescriptions] = useState<Record<string, boolean>>({});

  const locationOptions = useMemo(() => {
    const options = new Set<string>();
    for (const profile of profiles) {
      if (profile.location) {
        options.add(profile.location);
      }
    }
    return Array.from(options).sort((a, b) => a.localeCompare(b));
  }, [profiles]);

  const filteredProfiles = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const normalizedLocation = location.trim().toLowerCase();

    const matched = profiles.filter((profile) => {
      const haystack = [
        profile.name,
        profile.title,
        profile.location,
        profile.summary,
        profile.availability,
        profile.gradYear,
        ...profile.interests
      ]
        .join(" ")
        .toLowerCase();

      const queryMatch = !normalizedQuery || haystack.includes(normalizedQuery);
      const locationMatch = !normalizedLocation || profile.location.toLowerCase().includes(normalizedLocation);

      return queryMatch && locationMatch;
    });

    matched.sort((a, b) => {
      if (sortBy === "name") {
        return a.name.localeCompare(b.name);
      }

      const aTs = a.publishedDate ? Date.parse(a.publishedDate) : 0;
      const bTs = b.publishedDate ? Date.parse(b.publishedDate) : 0;
      return bTs - aTs;
    });

    return matched;
  }, [location, profiles, query, sortBy]);

  return (
    <div className="search-chat-shell">
      <section className="search-pane glass" aria-label="People search">
        <Flex justify="between" align="center" wrap="wrap" gap="3">
          <Heading size="6">Search for people</Heading>
          <Text size="2" color="gray">
            {filteredProfiles.length} result{filteredProfiles.length === 1 ? "" : "s"}
          </Text>
        </Flex>

        <div className="search-controls">
          <label className="search-field">
            <span>Name or keyword</span>
            <input
              type="text"
              placeholder="Type a name or keyword"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>

          <label className="search-field">
            <span>Location</span>
            <select value={location} onChange={(event) => setLocation(event.target.value)}>
              <option value="">All locations</option>
              {locationOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="search-sort">
            <span>Sort by</span>
            <select value={sortBy} onChange={(event) => setSortBy(event.target.value as SortOption)}>
              <option value="recent">Recently active</option>
              <option value="name">Name (A-Z)</option>
            </select>
          </label>

          <Button
            type="button"
            variant="soft"
            color="gray"
            onClick={() => {
              setQuery("");
              setLocation("");
              setSortBy("recent");
            }}
          >
            Clear all filters
          </Button>
        </div>

        <div className="profile-grid" aria-live="polite">
          {filteredProfiles.length === 0 ? (
            <Card variant="surface" className="profile-empty">
              <Text size="2" color="gray">
                No matches found. Try another keyword, location, or reset filters.
              </Text>
            </Card>
          ) : (
            filteredProfiles.slice(0, 60).map((profile) => (
              <Card key={profile.id} className="profile-card" variant="surface">
                <Flex align="center" gap="3" mb="3">
                  <div className="profile-avatar" aria-hidden>
                    {getInitials(profile.name)}
                  </div>
                  <div>
                    <Text as="p" size="5" weight="bold">
                      {profile.name}
                    </Text>
                    <Text as="p" size="2" color="gray">
                      {profile.title}
                    </Text>
                    <Text as="p" size="2" color="gray">
                      {profile.location}
                    </Text>
                  </div>
                </Flex>

                <Text
                  as="p"
                  size="2"
                  className={expandedDescriptions[profile.id] ? "profile-summary profile-summary-expanded" : "profile-summary"}
                >
                  {profile.summary}
                </Text>

                {profile.summary.length > 220 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    color="gray"
                    size="1"
                    className="profile-description-toggle"
                    onClick={() =>
                      setExpandedDescriptions((prev) => ({
                        ...prev,
                        [profile.id]: !prev[profile.id]
                      }))
                    }
                  >
                    {expandedDescriptions[profile.id] ? "Show less" : "Read full description"}
                  </Button>
                ) : null}

                <Text as="p" size="2" color="gray" mt="2">
                  Availability: {profile.availability}
                </Text>

                <Flex gap="2" mt="4" wrap="wrap">
                  {profile.linkedinUrl ? (
                    <Button asChild>
                      <a href={profile.linkedinUrl} target="_blank" rel="noreferrer">
                        Go to profile
                      </a>
                    </Button>
                  ) : null}

                  <Button
                    variant="soft"
                    color="gray"
                    onClick={() =>
                      setChatSeed({
                        text: `Help me draft a coffee chat outreach for ${profile.name}, ${profile.title} in ${profile.location}.`,
                        nonce: Date.now()
                      })
                    }
                  >
                    Draft opener text
                  </Button>
                </Flex>
              </Card>
            ))
          )}
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
