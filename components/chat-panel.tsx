"use client";

import { useChat, type Message } from "ai/react";
import { Button, Card, Flex, Text, TextArea } from "@radix-ui/themes";
import clsx from "clsx";
import { FormEvent, useState } from "react";

type Props = {
  placeholder?: string;
  className?: string;
};

const prompts = [
  "Who can help me with a climate finance internship in NYC?",
  "I'm exploring mobility partnerships in London—who should I meet?",
  "Looking for alum advice on launching a B2B SaaS pilot."
];

export function ChatPanel({ placeholder, className }: Props) {
  const { messages, input, handleInputChange, handleSubmit, isLoading, setInput } = useChat({
    api: "/api/chat"
  });
  const [expanded, setExpanded] = useState(false);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    handleSubmit(event);
  };

  return (
    <Card className={clsx("glass", "chat-shell", expanded && "chat-shell-expanded", className)} size="4">
      <Flex justify="between" align="center" mb="4">
        <div>
          <Text weight="bold">Try the navigator</Text>
          <Text as="p" size="2" color="gray">
            Ask for a match, a warm intro script, or availability.
          </Text>
        </div>
        {isLoading ? <div className="pulse" aria-label="model typing" /> : null}
      </Flex>

      <div className="chat-scroll">
        {messages.length === 0 ? (
          <Card variant="surface" className="message assistant" mb="3">
            <Text size="2" color="gray">
              Ready to map your next SOM coffee chat. Ask anything—roles, regions, or how to phrase the outreach.
            </Text>
          </Card>
        ) : (
          messages.map((message) => <MessageBubble key={message.id} message={message} />)
        )}
      </div>

      <form onSubmit={onSubmit}>
        <TextArea
          placeholder={placeholder ?? prompts[Math.floor(Math.random() * prompts.length)]}
          value={input}
          onChange={handleInputChange}
          rows={expanded ? 5 : 2}
          className="chat-textarea"
          onFocus={() => setExpanded(true)}
          onBlur={() => {
            // Collapse only when the field is empty to mirror chat-sdk UX.
            if (!input.trim()) {
              setExpanded(false);
            }
          }}
          style={{ marginBottom: 12 }}
        />

        <Flex gap="3" align="center" justify="between">
          <Flex gap="2">
            {prompts.slice(0, 2).map((prompt) => (
              <Button
                key={prompt}
                size="1"
                variant="ghost"
                onClick={(e) => {
                  e.preventDefault();
                  setInput(prompt);
                  setExpanded(true);
                }}
              >
                {prompt}
              </Button>
            ))}
          </Flex>
          <Button type="submit" disabled={!input.trim() || isLoading}>
            Send
          </Button>
        </Flex>
      </form>
    </Card>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  return (
    <Card
      variant="surface"
      className={clsx("message", isUser ? "user" : "assistant")}
      mb="3"
      aria-label={`${message.role} message`}
    >
      <Text weight="bold" size="2" color="gray">
        {isUser ? "You" : "Navigator"}
      </Text>
      <Text as="p" size="2" style={{ whiteSpace: "pre-wrap", marginTop: 6 }}>
        {message.content}
      </Text>
    </Card>
  );
}
