import { Container, Heading, Text } from "@radix-ui/themes";
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
      <Link href="/sign-in">Go to sign in</Link>
    </Container>
  );
}
