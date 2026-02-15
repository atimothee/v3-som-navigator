import { SearchChatWorkspace } from "@/components/search-chat-workspace";
import { resolveStoredProfileDocument } from "@/lib/profile-document";
import { requireYaleUser } from "@/lib/require-yale-user";
import { currentUser } from "@clerk/nextjs/server";
import { Badge, Container, Flex, Heading, Text } from "@radix-ui/themes";

export default async function ChatPage() {
  await requireYaleUser();
  const user = await currentUser();
  const storedDoc = resolveStoredProfileDocument(user);

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
              Run natural-language LinkedIn Super Search, then draft personalized outreach in chat.
            </Text>
          </Flex>

          <SearchChatWorkspace hasProfileDocumentText={Boolean(storedDoc?.extractedText)} />
        </Flex>
      </Container>
    </div>
  );
}
