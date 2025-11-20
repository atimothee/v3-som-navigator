import { ChatPanel } from "@/components/chat-panel";
import { somNetwork } from "@/data/network";
import { ArrowRightIcon, ChatBubbleIcon, RocketIcon } from "@radix-ui/react-icons";
import { Badge, Box, Button, Card, Container, Flex, Grid, Heading, Inset, Separator, Text } from "@radix-ui/themes";
import Link from "next/link";
import { ReactNode } from "react";

const stats = [
  { label: "Alums indexed", value: "6 curated starts", detail: "Expands with your data." },
  { label: "Coffee chats booked", value: "Fast recommendations", detail: "Outreach copy included." },
  { label: "Search styles", value: "Roles · regions · vibes", detail: "Bring your own tone." }
];

export default function Page() {
  return (
    <Container size="3" px="5" py="6">
      <Flex direction="column" gap="6" className="hero">
        <Flex direction={{ initial: "column", md: "row" }} gap="6" align="center">
          <Box flex="1">
            <Badge color="green" variant="soft" radius="full">
              SOM Network Navigator
            </Badge>
            <Heading size="9" mt="3" mb="3">
              Navigate the SOM network, one coffee chat at a time.
            </Heading>
            <Text size="4" color="gray">
              Your guide to effortless SOM coffee chats. Find the right alum, faster. Try a prompt right on this page,
              then dive deeper.
            </Text>

            <Flex gap="3" mt="4" wrap="wrap">
              <Button size="3" asChild>
                <Link href="/chat">Try the chatbot</Link>
              </Button>
              <Button variant="ghost" size="3" asChild>
                <Link href="https://chat-sdk.dev/" target="_blank">
                  See the SDK <ArrowRightIcon />
                </Link>
              </Button>
            </Flex>

            <Box mt="5" className="tagline-grid">
              <TaglineCard icon={<ChatBubbleIcon />} text="Your guide to effortless SOM coffee chats." />
              <TaglineCard icon={<RocketIcon />} text="Find the right alum, faster." />
              <TaglineCard icon={<ArrowRightIcon />} text="Navigate the SOM network with warm intros." />
            </Box>
          </Box>

          <Box flex="1" id="try" width="100%">
            <ChatPanel />
          </Box>
        </Flex>

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

        <Card className="glass">
          <Heading size="6" mb="3">
            A few people you can meet
          </Heading>
          <Grid columns={{ initial: "1", md: "3" }} gap="4">
            {somNetwork.map((profile) => (
              <Card key={profile.name} variant="surface">
                <Flex justify="between" align="center" mb="1">
                  <Text weight="bold">{profile.name}</Text>
                  <Badge color="indigo">{profile.location}</Badge>
                </Flex>
                <Text size="2" color="gray">
                  {profile.title} · {profile.gradYear}
                </Text>
                <Text as="p" size="2" mt="2">
                  {profile.summary}
                </Text>
                <Text as="p" size="2" mt="2" color="gray">
                  Interests: {profile.interests.join(", ")}
                </Text>
                <Text as="p" size="2" mt="1" color="gray">
                  Availability: {profile.availability}
                </Text>
              </Card>
            ))}
          </Grid>
        </Card>
      </Flex>
    </Container>
  );
}

function TaglineCard({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <Card variant="surface" className="glass">
      <Flex align="center" gap="2">
        {icon}
        <Text size="2">{text}</Text>
      </Flex>
    </Card>
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
