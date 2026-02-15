import { SearchChatWorkspace } from "@/components/search-chat-workspace";
import { resolveStoredProfileDocument } from "@/lib/profile-document";
import { requireYaleUser } from "@/lib/require-yale-user";
import { currentUser } from "@clerk/nextjs/server";
import { Badge, Container, Flex, Heading, Text } from "@radix-ui/themes";

export default async function WorkspacePage() {
  await requireYaleUser();
  const user = await currentUser();
  const storedDoc = resolveStoredProfileDocument(user);

  return (
    <div className="chat-page">
      <Container size="4" px={{ initial: "3", md: "6" }} py="7">
        <Flex direction="column" gap="6" className="workspace-content">
          <Flex direction="column" align="center" gap="3" className="chat-top">
            <Badge variant="surface" color="indigo">
              Beta
            </Badge>
            <Heading size="8" align="center" className="chat-title">
              Search the SOM network. Draft personalized outreach.
            </Heading>
            <Text size="4" color="gray" align="center" style={{ maxWidth: "780px" }}>
              Find relevant alumni with natural language, then refine your message before you send it.
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
