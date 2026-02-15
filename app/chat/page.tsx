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
              Beta
            </Badge>
            <Heading size="8" align="center" className="chat-title">
              Find the right SOM alumni. Draft outreach that gets replies.
            </Heading>
            <Text size="4" color="gray" align="center" style={{ maxWidth: "780px" }}>
              Describe who you want to meet, review matches, then personalize your message in chat.
            </Text>
            <Text size="2" color="gray" align="center">
              Built for Yale SOM networking.
            </Text>
          </Flex>

          <SearchChatWorkspace hasProfileDocumentText={Boolean(storedDoc?.extractedText)} />
        </Flex>
      </Container>
    </div>
  );
}
