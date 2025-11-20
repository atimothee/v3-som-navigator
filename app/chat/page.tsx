import { ChatPanel } from "@/components/chat-panel";
import { auth } from "@clerk/nextjs/server";
import { ArrowLeftIcon, LightningBoltIcon, MixerVerticalIcon, RocketIcon } from "@radix-ui/react-icons";
import { Badge, Box, Button, Card, Container, Flex, Grid, Heading, Separator, Text } from "@radix-ui/themes";
import Link from "next/link";
import { redirect } from "next/navigation";

const perks = [
  { icon: <LightningBoltIcon />, title: "Fast matches", body: "RAG-powered picks across roles, regions, and vibes." },
  { icon: <MixerVerticalIcon />, title: "Context aware", body: "LangChain retrieves alum clues and availability for you." },
  { icon: <RocketIcon />, title: "Outreach ready", body: "Get a short opener you can paste into email or LinkedIn." }
];

export default function ChatPage() {
  const { userId } = auth();
  if (!userId) {
    redirect("/sign-in?redirect_url=/chat");
  }

  return (
    <div className="chat-page">
      <Container size="3" px="5" py="6">
        <Flex direction="column" gap="5">
          <Flex justify="between" align="center">
            <Flex align="center" gap="3">
              <Button variant="ghost" size="2" asChild>
                <Link href="/">
                  <ArrowLeftIcon /> Home
                </Link>
              </Button>
              <Badge color="green" radius="full" variant="soft">
                SOM Network Navigator
              </Badge>
            </Flex>
            <Text size="2" color="gray">
              Free for a limited time only.
            </Text>
          </Flex>

          <Card className="glass chat-hero">
            <Grid columns={{ initial: "1", md: "5" }} gap="5" align="center">
              <Box className="chat-hero-copy" gridColumn={{ md: "span 2" }}>
                <Badge variant="surface" color="indigo">
                  Live assistant
                </Badge>
                <Heading size="7" mt="3" mb="2">
                  Talk to the Navigator.
                </Heading>
                <Text size="4" color="gray">
                  Ask for alum matches, outreach scripts, or guidance on mapping your next coffee chat.
                </Text>
                <Separator size="4" my="3" />
                <Flex gap="3" wrap="wrap">
                  {perks.map((perk) => (
                    <Flex key={perk.title} align="center" gap="2">
                      {perk.icon}
                      <Text size="2">{perk.title}</Text>
                    </Flex>
                  ))}
                </Flex>
              </Box>

              <Box gridColumn={{ md: "span 3" }}>
                <ChatPanel className="chat-panel-wide" placeholder="Who can help me explore climate finance roles in NYC?" />
              </Box>
            </Grid>
          </Card>

          <Grid columns={{ initial: "1", md: "3" }} gap="3">
            {perks.map((perk) => (
              <Card key={perk.title} variant="surface" className="glass">
                <Flex align="center" gap="2" mb="2">
                  {perk.icon}
                  <Text weight="bold">{perk.title}</Text>
                </Flex>
                <Text size="2" color="gray">
                  {perk.body}
                </Text>
              </Card>
            ))}
          </Grid>
        </Flex>
      </Container>
    </div>
  );
}
