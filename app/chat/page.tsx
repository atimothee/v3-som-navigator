import { SearchChatWorkspace } from "@/components/search-chat-workspace";
import { loadProfilesFromDocs } from "@/lib/profiles";
import { requireYaleUser } from "@/lib/require-yale-user";
import { Badge, Container, Flex, Heading, Text } from "@radix-ui/themes";

export default async function ChatPage() {
  await requireYaleUser();

  const profiles = loadProfilesFromDocs().map((profile, index) => ({
    id: profile.id ?? profile.linkedinUrl ?? `${profile.name}-${profile.title}-${index}`,
    name: profile.name,
    title: profile.title,
    gradYear: profile.gradYear,
    location: profile.location,
    interests: profile.interests,
    summary: profile.summary,
    availability: profile.availability,
    linkedinUrl: profile.linkedinUrl,
    publishedDate: profile.publishedDate
  }));

  return (
    <div className="chat-page">
      <Container size="4" px={{ initial: "3", md: "6" }} py="7">
        <Flex direction="column" gap="6">
          <Flex direction="column" align="center" gap="3" className="chat-top">
            <Badge variant="surface" color="indigo">
              Beta Version
            </Badge>
            <Heading size="8" align="center" className="chat-title">
              Search and Talk to the SOM Navigator
            </Heading>
            <Text size="4" color="gray" align="center" style={{ maxWidth: "780px" }}>
              Find relevant alumni with filters, then draft personalized outreach in chat.
            </Text>
          </Flex>

          <SearchChatWorkspace profiles={profiles} />
        </Flex>
      </Container>
    </div>
  );
}
