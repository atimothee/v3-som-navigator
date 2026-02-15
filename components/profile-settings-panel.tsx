"use client";

import { Card, Flex, Heading, Text } from "@radix-ui/themes";

export function ProfileSettingsPanel() {
  return (
    <Card className="glass">
      <Flex direction="column" gap="3">
        <Heading size="5">Search Configuration</Heading>
        <Text size="2" color="gray">
          Super Search is configured automatically.
        </Text>
        <Text size="1" color="gray">
          If search is unavailable, contact your workspace administrator.
        </Text>
      </Flex>
    </Card>
  );
}
