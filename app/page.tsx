import { Badge, Box, Button, Card, Container, Flex, Grid, Heading, Inset, Separator, Text } from "@radix-ui/themes";
import { SignedIn, SignedOut } from "@clerk/nextjs";
import Link from "next/link";

const stats = [
  { label: "10k+ alums indexed", value: "Natural-language people search", detail: "Describe who you want to meet. No filter maze required." },
  {
    label: "Personalized outreach",
    value: "Drafts tuned to your profile",
    detail: "Generate opener text grounded in your resume or LinkedIn PDF."
  },
  {
    label: "Modern GenAI Stack",
    value: "Effortless AI assistance",
    detail: "Grounded LLM workflows surface the right alumni faster and generate high-quality outreach drafts that are ready to send."
  }
];

export default async function Page() {
  return (
    <div className="home-page">
      <Container size="4" px="6" py="7">
        <Flex direction="column" gap="6" className="home-content">
          <Box className="home-hero">
            <Box className="home-hero-content">
              <Badge className="home-badge" color="indigo" variant="surface" radius="full">
                Yale SOM Network Navigator
              </Badge>
              <Heading size="9" mt="3" mb="3">
                Find the right SOM alumni. Draft outreach that gets replies.
              </Heading>
              <Text size="4" color="gray">
                Search the SOM network in plain English, then generate personalized outreach in minutes.
              </Text>
              <Box className="home-access-note" mt="3">
                <Text as="p" size="1" className="home-access-label">
                  Access
                </Text>
                <Text as="p" size="2" className="home-access-text">
                  Available only to people with @yale.edu email addresses.
                </Text>
              </Box>

              <Flex gap="3" mt="4" wrap="wrap">
                <SignedIn>
                  <Button size="3" className="home-cta" asChild>
                    <Link href="/workspace">Open workspace</Link>
                  </Button>
                </SignedIn>
                <SignedOut>
                  <Button size="3" className="home-cta" asChild>
                    <Link href="/sign-in?redirect_url=%2Fworkspace">Try it now</Link>
                  </Button>
                </SignedOut>
              </Flex>
            </Box>
          </Box>

          <Separator size="4" />

          <Grid columns={{ initial: "1", md: "3" }} gap="4">
            {stats.map((item) => (
              <Card key={item.label} className="glass">
                <Text size="2" color="gray">
                  {item.label}
                </Text>
                <Heading size="6" mt="2">
                  {item.value}
                </Heading>
                <Text size="3" color="gray">
                  {item.detail}
                </Text>
              </Card>
            ))}
          </Grid>

          <Card className="glass">
            <Inset clip="padding-box" side="top" pb="current">
              <Container px="5" py="5">
                <Heading size="6" mb="3">
                  How it works
                </Heading>
                <Grid columns={{ initial: "1", md: "3" }} gap="4">
                  <Step title="1. Describe target alumni" body="Use plain language: role, industry, geography, and outreach goal." />
                  <Step title="2. Retrieve signal with RAG" body="Embed each query, retrieve high-signal context from a vector database, and ground LLM outputs in that evidence." />
                  <Step title="3. Draft personalized outreach" body="Generate a concise opener tailored to your background and the selected profile." />
                </Grid>
              </Container>
            </Inset>
          </Card>

        </Flex>
      </Container>
    </div>
  );
}

function Step({ title, body }: { title: string; body: string }) {
  return (
    <Card variant="ghost">
      <Heading size="4" mb="2">
        {title}
      </Heading>
      <Text size="3" color="gray">
        {body}
      </Text>
    </Card>
  );
}
