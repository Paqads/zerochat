import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { useWebSocket } from "@/hooks/use-websocket";
import { encryptMessage, decryptMessage } from "@/lib/crypto";
import { ConnectionStatus } from "@/components/connection-status";
import { EncryptionBadge } from "@/components/encryption-badge";
import { MessageList } from "@/components/message-list";
import { MessageInput } from "@/components/message-input";
import { UserList } from "@/components/user-list";
import { PassphraseModal } from "@/components/passphrase-modal";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import type { Message, User, WSMessage } from "@shared/schema";
import { cn } from "@/lib/utils";

interface ChatSession {
  roomId: string;
  roomName: string;
  username: string;
  passphrase: string;
  userId: string;
  isAdmin: boolean;
}

export default function ChatRoom() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();

  const [session, setSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [showPassphraseModal, setShowPassphraseModal] = useState(false);
  const [showLeftSidebar, setShowLeftSidebar] = useState(true);
  const [copiedRoomId, setCopiedRoomId] = useState(false);
  const [copiedPassphrase, setCopiedPassphrase] = useState(false);
  const hasJoinedRef = useRef(false);
  const passphraseChangingRef = useRef(false);

  useEffect(() => {
    const sessionData = sessionStorage.getItem("chat-session");
    if (!sessionData) {
      setLocation("/");
      return;
    }

    try {
      const parsedSession: ChatSession = JSON.parse(sessionData);
      setSession(parsedSession);
    } catch {
      setLocation("/");
    }
  }, [setLocation]);

  const { status, lastMessage, sendMessage, disconnect } = useWebSocket(
    session ? "/ws" : null,
  );

  useEffect(() => {
    if (!session) return;

    if (status === "connected" && !hasJoinedRef.current) {
      hasJoinedRef.current = true;
      sendMessage({
        type: "join_room",
        payload: {
          roomId: session.roomId,
          username: session.username,
          passphrase: session.passphrase,
          userId: session.userId,
          isAdmin: session.isAdmin,
        },
      });
    }
  }, [status, session, sendMessage]);

  useEffect(() => {
    if (!lastMessage || !session) return;

    const msg = lastMessage as WSMessage;

    switch (msg.type) {
      case "message_broadcast": {
        if (passphraseChangingRef.current) {
          break;
        }

        const encryptedContent = msg.payload.content;
        const decryptedContent = decryptMessage(encryptedContent, session.passphrase);

        const newMessage: Message = {
          id: msg.payload.id,
          roomId: msg.payload.roomId,
          userId: msg.payload.userId,
          username: msg.payload.username,
          content: decryptedContent,
          timestamp: msg.payload.timestamp,
          isSystem: msg.payload.isSystem,
        };

        setMessages((prev) => [...prev, newMessage]);
        break;
      }

      case "user_joined": {
        if (passphraseChangingRef.current) {
          break;
        }

        const systemMessage: Message = {
          id: `system_${Date.now()}`,
          roomId: session.roomId,
          userId: "system",
          username: "System",
          content: `→ ${msg.payload.username} joined the room`,
          timestamp: Date.now(),
          isSystem: true,
        };
        setMessages((prev) => [...prev, systemMessage]);
        break;
      }

      case "user_left": {
        if (passphraseChangingRef.current) {
          break;
        }

        const systemMessage: Message = {
          id: `system_${Date.now()}`,
          roomId: session.roomId,
          userId: "system",
          username: "System",
          content: `← ${msg.payload.username} left the room`,
          timestamp: Date.now(),
          isSystem: true,
        };
        setMessages((prev) => [...prev, systemMessage]);
        break;
      }

      case "user_list_update": {
        setUsers(msg.payload.users);
        break;
      }

      case "clear_history": {
        setMessages([]);
        passphraseChangingRef.current = false;
        break;
      }

      case "passphrase_changed": {
        toast({
          title: "Passphrase Changed",
          description: "The room passphrase has been changed by admin. Disconnecting...",
          variant: "destructive",
        });
        sessionStorage.removeItem("chat-session");
        setTimeout(() => {
          disconnect();
          setLocation("/");
        }, 2000);
        break;
      }

      case "error": {
        toast({
          title: "Error",
          description: msg.payload.message || "An error occurred",
          variant: "destructive",
        });
        if (msg.payload.fatal) {
          sessionStorage.removeItem("chat-session");
          setTimeout(() => {
            disconnect();
            setLocation("/");
          }, 2000);
        }
        break;
      }
    }
  }, [lastMessage, session, toast, disconnect, setLocation]);

  const handleSendMessage = useCallback(
    (content: string) => {
      if (!session) return;

      const encryptedContent = encryptMessage(content, session.passphrase);

      sendMessage({
        type: "send_message",
        payload: {
          roomId: session.roomId,
          userId: session.userId,
          username: session.username,
          content: encryptedContent,
        },
      });
    },
    [session, sendMessage],
  );

  const handleChangePassphrase = useCallback(
    (newPassphrase: string) => {
      if (!session) return;

      passphraseChangingRef.current = true;

      sendMessage({
        type: "change_passphrase",
        payload: {
          roomId: session.roomId,
          userId: session.userId,
          newPassphrase,
        },
      });

      setShowPassphraseModal(false);

      toast({
        title: "Passphrase Changed",
        description: "Message history cleared. All users disconnected.",
      });

      const newSession: ChatSession = {
        ...session,
        passphrase: newPassphrase,
      };

      setSession(newSession);
      sessionStorage.setItem("chat-session", JSON.stringify(newSession));
    },
    [session, sendMessage, toast],
  );

  const handleLeaveRoom = () => {
    if (!session) return;

    sendMessage({
      type: "leave_room",
      payload: { roomId: session.roomId, userId: session.userId },
    });

    sessionStorage.removeItem("chat-session");
    disconnect();
    setLocation("/");
  };

  const copyToClipboard = (text: string, type: "roomId" | "passphrase") => {
    navigator.clipboard.writeText(text).then(() => {
      if (type === "roomId") {
        setCopiedRoomId(true);
        setTimeout(() => setCopiedRoomId(false), 2000);
      } else {
        setCopiedPassphrase(true);
        setTimeout(() => setCopiedPassphrase(false), 2000);
      }

      toast({
        title: "Copied!",
        description: `${type === "roomId" ? "Room ID" : "Passphrase"} copied to clipboard`,
      });
    });
  };

  if (!session) {
    return null;
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center justify-between p-3 gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowLeftSidebar(!showLeftSidebar)}
              className="lg:hidden"
              data-testid="button-toggle-sidebar"
            >
              <i className="fa-solid fa-bars" aria-hidden="true" />
            </Button>

            <div className="flex items-center gap-2 min-w-0">
              <i
                className="fa-solid fa-lock text-primary text-lg flex-shrink-0"
                aria-hidden="true"
              />
              <div className="min-w-0">
                <h1 className="font-mono font-bold text-lg truncate" data-testid="text-room-name">
                  {session.roomName}
                </h1>
                <p className="text-xs text-muted-foreground font-mono">
                  {users.length} {users.length === 1 ? "user" : "users"} online
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            <ConnectionStatus status={status} />
            <EncryptionBadge className="hidden sm:flex" />

            <Button
              variant="destructive"
              size="sm"
              onClick={handleLeaveRoom}
              className="font-mono gap-2"
              data-testid="button-leave-room"
            >
              <i className="fa-solid fa-right-from-bracket text-sm" aria-hidden="true" />
              <span className="hidden sm:inline">LEAVE</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <aside
          className={cn(
            "w-64 border-r border-border bg-card/30 overflow-y-auto transition-all duration-200",
            "lg:block",
            showLeftSidebar ? "block" : "hidden",
          )}
        >
          <div className="p-4 space-y-4">
            <Card className="p-4 space-y-3">
              <h3 className="text-sm font-semibold font-mono tracking-wider uppercase text-foreground">
                <i className="fa-solid fa-info-circle mr-2 text-primary" aria-hidden="true" />
                Room Info
              </h3>
              <Separator />

              <div className="space-y-2">
                <div>
                  <p className="text-xs text-muted-foreground font-mono uppercase mb-1">
                    Room ID
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="text-xs font-mono bg-muted px-2 py-1 rounded flex-1 truncate">
                      {session.roomId}
                    </code>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => copyToClipboard(session.roomId, "roomId")}
                      className="flex-shrink-0 h-7 w-7"
                      data-testid="button-copy-room-id"
                    >
                      <i
                        className={`fa-solid ${copiedRoomId ? "fa-check" : "fa-copy"} text-xs`}
                        aria-hidden="true"
                      />
                    </Button>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground font-mono uppercase mb-1">
                    Passphrase
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="text-xs font-mono bg-muted px-2 py-1 rounded flex-1 truncate">
                      {'•'.repeat(session.passphrase.length)}
                    </code>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => copyToClipboard(session.passphrase, "passphrase")}
                      className="flex-shrink-0 h-7 w-7"
                      data-testid="button-copy-passphrase"
                    >
                      <i
                        className={`fa-solid ${copiedPassphrase ? "fa-check" : "fa-copy"} text-xs`}
                        aria-hidden="true"
                      />
                    </Button>
                  </div>
                </div>
              </div>

              {session.isAdmin && (
                <>
                  <Separator />
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setShowPassphraseModal(true)}
                    className="w-full font-mono gap-2 text-xs"
                    data-testid="button-change-passphrase"
                  >
                    <i className="fa-solid fa-key text-xs" aria-hidden="true" />
                    CHANGE PASSPHRASE
                  </Button>
                </>
              )}
            </Card>

            <UserList users={users} currentUserId={session.userId} />
          </div>
        </aside>

        <main className="flex-1 flex flex-col min-w-0">
          <MessageList messages={messages} currentUserId={session.userId} />
          <MessageInput
            onSend={handleSendMessage}
            disabled={status !== "connected"}
          />
        </main>
      </div>

      <PassphraseModal
        open={showPassphraseModal}
        onClose={() => setShowPassphraseModal(false)}
        onConfirm={handleChangePassphrase}
      />
    </div>
  );
}
