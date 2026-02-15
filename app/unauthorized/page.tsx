import { Button, Container, Flex, Heading, Text } from "@radix-ui/themes";
import { SignOutButton, SignedIn, SignedOut } from "@clerk/nextjs";
import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <Container size="2" py="8">
      <Heading size="7" mb="3">
        Access limited to yale.edu accounts
      </Heading>
      <Text as="p" size="4" color="gray" mb="4">
        Please sign in with your Yale email address to use the SOM Network Navigator.
      </Text>
      <Flex gap="3" wrap="wrap">
        <SignedIn>
          <SignOutButton redirectUrl="/sign-in">
            <Button>Sign out and sign in again</Button>
          </SignOutButton>
        </SignedIn>
        <SignedOut>
          <Button asChild variant="soft">
            <Link href="/sign-in">Go to sign in</Link>
          </Button>
        </SignedOut>
      </Flex>
    </Container>
  );
}
