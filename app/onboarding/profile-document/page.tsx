import { ProfileDocumentManager } from "@/components/profile-document-manager";
import { requireYaleUser } from "@/lib/require-yale-user";
import { Container, Flex, Heading, Text } from "@radix-ui/themes";

export default async function OnboardingProfileDocumentPage() {
  await requireYaleUser();

  return (
    <Container size="3" py="7" px="4">
      <Flex direction="column" gap="4">
        <Heading size="7">Optional: personalize outreach with your profile</Heading>
        <Text size="3" color="gray">
          Upload a resume or LinkedIn PDF now, or skip and do it later from your account.
        </Text>
        <ProfileDocumentManager mode="onboarding" />
      </Flex>
    </Container>
  );
}
