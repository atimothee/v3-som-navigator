"use client";

import { trackEvent } from "@/lib/analytics";
import { useChat, type Message } from "ai/react";
import { Button, Card, Flex, Text, TextArea } from "@radix-ui/themes";
import clsx from "clsx";
import { FormEvent, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";

type Props = {
  placeholder?: string;
  className?: string;
  prefillText?: string;
  prefillNonce?: number;
  autoSendText?: string;
  autoSendNonce?: number;
};

const prompts = [
  "Who can help me with a climate finance internship in NYC?",
  "I'm exploring product management in New York City-who should I meet?",
  "Looking for alum advice on launching a B2B SaaS pilot."
];

export function ChatPanel({
  placeholder,
  className,
  prefillText,
  prefillNonce,
  autoSendText,
  autoSendNonce
}: Props) {
  const { messages, input, handleInputChange, handleSubmit, isLoading, setInput, append } = useChat({
    api: "/api/chat"
  });
  const [expanded, setExpanded] = useState(false);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [showNewReply, setShowNewReply] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const prevMessageCountRef = useRef(0);
  const lastAutoSendNonceRef = useRef<number | null>(null);

  const scrollToBottom = () => {
    const node = scrollRef.current;
    if (!node) return;
    node.scrollTo({ top: node.scrollHeight, behavior: "smooth" });
  };

  useEffect(() => {
    if (!prefillText || !prefillNonce) return;
    setInput(prefillText);
    setExpanded(true);
  }, [prefillNonce, prefillText, setInput]);

  useEffect(() => {
    if (!autoSendText || !autoSendNonce) return;
    if (lastAutoSendNonceRef.current === autoSendNonce) return;
    if (isLoading) return;

    lastAutoSendNonceRef.current = autoSendNonce;
    setExpanded(true);
    setShowNewReply(false);
    setInput("");

    trackEvent("Chat Query Submitted", {
      prompt: autoSendText,
      messageCount: messages.length + 1
    });

    void append({
      role: "user",
      content: autoSendText
    });
  }, [append, autoSendNonce, autoSendText, isLoading, messages.length, setInput]);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;

    const handleResize = () => {
      if (typeof window === "undefined") return;
      setIsDesktop(window.matchMedia("(min-width: 768px)").matches);
    };
    handleResize();
    window.addEventListener("resize", handleResize);

    const handleScroll = () => {
      const threshold = 150;
      const nearBottom = node.scrollHeight - node.scrollTop - node.clientHeight <= threshold;
      setIsNearBottom(nearBottom);
      if (nearBottom) {
        setShowNewReply(false);
      }
    };

    handleScroll();
    node.addEventListener("scroll", handleScroll);
    return () => {
      node.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    const prevCount = prevMessageCountRef.current;
    const newMessageCount = messages.length;
    const node = scrollRef.current;
    const lastMessage = messages[newMessageCount - 1];
    const isNewAssistantMessage = lastMessage?.role === "assistant" && newMessageCount > prevCount;

    if (node && isNewAssistantMessage) {
      if (isNearBottom) {
        scrollToBottom();
      } else {
        setShowNewReply(true);
      }
    }

    prevMessageCountRef.current = newMessageCount;
  }, [isNearBottom, messages]);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const prompt = input.trim();
    if (prompt) {
      trackEvent("Chat Query Submitted", {
        prompt,
        messageCount: messages.length + 1
      });
    }
    setShowNewReply(false);
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

      <div className="chat-scroll" ref={scrollRef}>
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
                  trackEvent("Prompt Prefilled", { prompt });
                }}
              >
                {prompt}
              </Button>
            ))}
          </Flex>
          <Flex align="center" gap="2">
            {isLoading ? (
              <span className="inline-loading">
                <span className="spinner" aria-hidden />
                <Text size="1" color="gray">
                  Generating...
                </Text>
              </span>
            ) : null}
            <Button type="submit" disabled={!input.trim() || isLoading}>
              Send
            </Button>
          </Flex>
        </Flex>

        <Text as="p" size="1" color="gray" mt="2">
          Tip: Add details and context. Navigator won&apos;t remember your last question.
        </Text>
        <Text as="p" size="1" color="gray" mt="2">
          Found issue?{" "}
          <a href="https://forms.gle/pjzU8X8eKQ4YMRrq9" target="_blank" rel="noreferrer" style={{ textDecoration: "underline" }}>
            Give us feedback
          </a>
          .
        </Text>
      </form>

      {isLoading && isDesktop ? (
        <div className="floating-pill loading-pill" role="status" aria-live="polite">
          <span className="spinner" aria-hidden />
          <Text size="1">Assistant responding...</Text>
        </div>
      ) : null}

      {showNewReply && !isNearBottom ? (
        <Button
          className="floating-pill new-reply-pill"
          size="1"
          variant="solid"
          onClick={() => {
            scrollToBottom();
            setShowNewReply(false);
          }}
        >
          New reply - Jump to latest
        </Button>
      ) : null}
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
