"use client";

import { useChat, type Message } from "ai/react";
import { Button, Card, Flex, Text, TextArea } from "@radix-ui/themes";
import clsx from "clsx";
import { FormEvent, useState } from "react";
import ReactMarkdown from "react-markdown";

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
              Ready to map your next SOM coffee chat. Ask anything: roles, regions, or how to phrase the outreach.
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

        <Flex gap="3" align="center" justify="between" wrap="wrap">
          <Flex gap="2" wrap="wrap">
            {prompts.slice(0, 2).map((prompt) => (
              <Button
                key={prompt}
                size="1"
                variant="soft"
                color="gray"
                radius="full"
                className="prompt-chip"
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
      <div className="message-content">
        <MarkdownContent content={message.content} />
      </div>
    </Card>
  );
}

function MarkdownContent({ content }: { content: Message["content"] }) {
  if (typeof content === "string") {
    return <ReactMarkdown>{content}</ReactMarkdown>;
  }

  if (Array.isArray(content)) {
    const chunks = content as Array<{ text?: unknown }>;
    const text = chunks
      .map((chunk) => (typeof chunk.text === "string" ? chunk.text : ""))
      .join(" ");
    return <ReactMarkdown>{text}</ReactMarkdown>;
  }

  return <Text size="2">{String(content)}</Text>;
}
