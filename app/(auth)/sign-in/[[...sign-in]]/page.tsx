import { Container, Heading } from "@radix-ui/themes";
import { SignIn } from "@clerk/nextjs";

type SignInPageProps = {
  searchParams?: {
    redirect_url?: string;
  };
};

function resolveRedirectUrl(redirectUrl?: string) {
  if (!redirectUrl) {
    return "/";
  }

  return redirectUrl.startsWith("/") ? redirectUrl : "/";
}

export default function SignInPage({ searchParams }: SignInPageProps) {
  const redirectUrl = resolveRedirectUrl(searchParams?.redirect_url);

  return (
    <Container size="2" py="8">
      <Heading size="7" mb="4">
        Sign in
      </Heading>
      <SignIn forceRedirectUrl={redirectUrl} fallbackRedirectUrl={redirectUrl} />
    </Container>
  );
}
