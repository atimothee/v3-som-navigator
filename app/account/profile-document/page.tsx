import { ProfileSettingsPanel } from "@/components/profile-settings-panel";
import { requireYaleUser } from "@/lib/require-yale-user";
import { Container, Flex, Heading, Text } from "@radix-ui/themes";

export default async function ProfileDocumentPage() {
  await requireYaleUser();

  return (
    <Container size="3" px={{ initial: "3", md: "6" }} py="7">
      <Flex direction="column" gap="4">
        <div>
          <Heading size="8">Profile Settings</Heading>
          <Text as="p" size="3" color="gray" mt="2">
            Manage settings used to personalize search and outreach.
          </Text>
        </div>

        <ProfileSettingsPanel />
      </Flex>
    </Container>
  );
}
