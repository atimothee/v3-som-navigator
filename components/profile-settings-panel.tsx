"use client";

import { Card, Flex, Heading, Text } from "@radix-ui/themes";

export function ProfileSettingsPanel() {
  return (
    <Card className="glass">
      <Flex direction="column" gap="3">
        <Heading size="5">Workspace Configuration</Heading>
        <Text size="2" color="gray">
          Alumni search and draft generation are configured automatically.
        </Text>
        <Text size="1" color="gray">
          If the workspace is unavailable, contact your workspace administrator.
        </Text>
      </Flex>
    </Card>
  );
}
