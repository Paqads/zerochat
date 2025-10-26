import { useEffect, useRef } from "react";
import type { Message } from "@shared/schema";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface MessageListProps {
  messages: Message[];
  currentUserId: string;
  className?: string;
}

function getUserColor(username: string): string {
  const colors = [
    "text-green-400",
    "text-cyan-400",
    "text-blue-400",
    "text-purple-400",
    "text-pink-400",
    "text-yellow-400",
  ];
  const hash = username.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
}

export function MessageList({
  messages,
  currentUserId,
  className,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "instant" });
  }, [messages]);

  return (
    <div
      className={cn(
        "flex-1 overflow-y-auto space-y-3 p-4 scroll-smooth",
        className,
      )}
      data-testid="list-messages"
    >
      {messages.length === 0 ? (
        <div className="flex items-center justify-center h-full">
          <div className="text-center space-y-2">
            <i
              className="fa-solid fa-message text-4xl text-muted-foreground/50"
              aria-hidden="true"
            />
            <p className="text-muted-foreground font-mono text-sm">
              No messages yet. Start the conversation!
            </p>
          </div>
        </div>
      ) : (
        <>
          {messages.map((message) => {
            if (message.isSystem) {
              return (
                <div
                  key={message.id}
                  className="flex items-center justify-center animate-fade-in"
                  data-testid={`message-system-${message.id}`}
                >
                  <div className="px-4 py-2 rounded-md bg-muted/30 border border-border/50">
                    <p className="text-xs text-muted-foreground font-mono italic text-center">
                      {message.content}
                    </p>
                  </div>
                </div>
              );
            }

            const isOwnMessage = message.userId === currentUserId;
            const colorClass = getUserColor(message.username);

            return (
              <div
                key={message.id}
                className={cn(
                  "flex flex-col gap-1 animate-fade-in",
                  isOwnMessage && "items-end",
                )}
                data-testid={`message-${message.id}`}
              >
                <div className="flex items-baseline gap-2">
                  <span
                    className={cn(
                      "font-mono text-xs font-semibold",
                      colorClass,
                    )}
                  >
                    {message.username}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {format(message.timestamp, "HH:mm")}
                  </span>
                </div>
                <div
                  className={cn(
                    "px-4 py-2 rounded-md border-l-2 max-w-[80%] break-words",
                    isOwnMessage
                      ? "bg-primary/10 border-l-primary"
                      : "bg-card border-l-border",
                  )}
                >
                  <p className="text-sm font-mono leading-relaxed text-foreground whitespace-pre-wrap">
                    {message.content}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </>
      )}
    </div>
  );
}
