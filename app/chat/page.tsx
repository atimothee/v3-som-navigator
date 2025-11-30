import { ChatPanel } from "@/components/chat-panel";
import { LightningBoltIcon, MixerVerticalIcon, RocketIcon } from "@radix-ui/react-icons";
import { Badge, Box, Container, Flex, Grid, Heading, Separator, Text } from "@radix-ui/themes";
import Link from "next/link";

const perks = [
  { icon: <LightningBoltIcon />, title: "Fast matches", body: "RAG-powered picks across roles, regions, and vibes." },
  { icon: <MixerVerticalIcon />, title: "Context aware", body: "LangChain retrieves alum clues and availability for you." },
  { icon: <RocketIcon />, title: "Outreach ready", body: "Get a short opener you can paste into email or LinkedIn." }
];

export default function ChatPage() {
  return (
    <div className="chat-page">
      <Container size="4" px={{ initial: "3", md: "6" }} py="7">
        <Flex direction="column" gap="6">
          <Flex direction="column" align="center" gap="3" className="chat-top">
            <Badge variant="surface" color="indigo">
              Beta Version
            </Badge>
            <Heading size="8" align="center" className="chat-title">
              Talk to the SOM Navigator
            </Heading>
            <Text size="4" color="gray" align="center" style={{ maxWidth: "780px" }}>
              Find the right alum to contact, copy an opener, and prep your coffee chat in minutes.
            </Text>
            <Text size="2" color="gray" align="center">
              Share feedback <Link href="https://forms.gle/pjzU8X8eKQ4YMRrq9" target="_blank" rel="noreferrer">here</Link>.
            </Text>
          </Flex>

          <Box className="chat-spotlight">
            <Box className="chat-panel-wrap">
              <ChatPanel className="chat-panel-wide" placeholder="Who can help me explore climate finance roles in NYC?" />
            </Box>
          </Box>

          <Separator size="4" />

          <Box className="context-strip">
            <Grid columns={{ initial: "1", md: "3" }} gap="3">
              {perks.map((perk) => (
                <Flex key={perk.title} align="center" gap="2">
                  <span className="context-icon">{perk.icon}</span>
                  <Text size="2" weight="bold">
                    {perk.title}
                  </Text>
                  <Text size="2" color="gray">
                    {perk.body}
                  </Text>
                </Flex>
              ))}
            </Grid>
          </Box>
        </Flex>
      </Container>
    </div>
  );
}
