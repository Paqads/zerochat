import { useState, KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface MessageInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  className?: string;
}

export function MessageInput({
  onSend,
  disabled = false,
  className,
}: MessageInputProps) {
  const [message, setMessage] = useState("");
  const maxLength = 2000;

  const handleSend = () => {
    const trimmed = message.trim();
    if (trimmed && !disabled) {
      onSend(trimmed);
      setMessage("");
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div
      className={cn(
        "border-t border-border bg-background p-4 space-y-3",
        className,
      )}
    >
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message... (Enter to send, Shift+Enter for new line)"
            disabled={disabled}
            maxLength={maxLength}
            className="resize-none min-h-[80px] max-h-32 font-mono text-sm focus-visible:ring-primary"
            data-testid="input-message"
          />
          <div className="absolute bottom-2 right-2 text-[10px] text-muted-foreground font-mono">
            {message.length}/{maxLength}
          </div>
        </div>

        <Button
          onClick={handleSend}
          disabled={!message.trim() || disabled}
          size="lg"
          className="min-w-[100px] font-mono gap-2"
          data-testid="button-send"
        >
          <i className="fa-solid fa-paper-plane text-sm" aria-hidden="true" />
          SEND
        </Button>
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
        <i className="fa-solid fa-keyboard text-xs" aria-hidden="true" />
        <span>Press Enter to send, Shift+Enter for new line</span>
      </div>
    </div>
  );
}
