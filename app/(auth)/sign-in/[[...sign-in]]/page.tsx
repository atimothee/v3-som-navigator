import { Container, Heading } from "@radix-ui/themes";
import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <Container size="2" py="8">
      <Heading size="7" mb="4">
        Sign in
      </Heading>
      <SignIn />
    </Container>
  );
}
