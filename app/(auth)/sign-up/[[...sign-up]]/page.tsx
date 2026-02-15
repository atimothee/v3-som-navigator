import { Container, Heading } from "@radix-ui/themes";
import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <Container size="2" py="8">
      <Heading size="7" mb="4">
        Create your account
      </Heading>
      <SignUp forceRedirectUrl="/onboarding/profile-document" fallbackRedirectUrl="/onboarding/profile-document" />
    </Container>
  );
}
