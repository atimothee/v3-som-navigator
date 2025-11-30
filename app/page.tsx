import { Badge, Box, Button, Card, Container, Flex, Grid, Heading, Inset, Separator, Text } from "@radix-ui/themes";
import Link from "next/link";

const stats = [
  { label: "10k+ alums indexed", value: "Alums at your fingertips", detail: "Thousands indexed; expands with your data." },
  {
    label: "Coffee chats",
    value: "Outreach-ready copy",
    detail: "Get a match and a paste-ready note so you can book faster."
  },
  {
    label: "Plain language",
    value: "No filters needed",
    detail: "Type your goal, vibe, or draft opener. We pick up the intent."
  }
];

export default function Page() {
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
                Navigate the Yale SOM network, with AI assistance.
              </Heading>
              <Text size="4" color="gray">
                Your guide to effortless SOM coffee chats. Find the right alum, faster. Try a prompt, then dive deeper.
              </Text>

              <Flex gap="3" mt="4" wrap="wrap">
                <Button size="3" className="home-cta" asChild>
                  <Link href="/chat">Try the chatbot</Link>
                </Button>
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
                  <Step title="1. Ask anything" body="Describe your goal, a role, a region, or the vibe you want." />
                  <Step title="2. RAG with LangChain" body="We embed the SOM network profiles into a vector store and retrieve context for the model." />
                  <Step title="3. Outreach-ready replies" body="You get suggested matches, availability, and a short intro line to copy." />
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
