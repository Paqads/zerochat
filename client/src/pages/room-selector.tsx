import { useState } from "react";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { generateUserId } from "@/lib/crypto";

export default function RoomSelector() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [createForm, setCreateForm] = useState({
    roomName: "",
    username: "",
    passphrase: "",
  });

  const [joinForm, setJoinForm] = useState({
    roomId: "",
    username: "",
    passphrase: "",
  });

  const [showPassphrase, setShowPassphrase] = useState({
    create: false,
    join: false,
  });

  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !createForm.roomName.trim() ||
      !createForm.username.trim() ||
      !createForm.passphrase.trim()
    ) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    if (createForm.passphrase.length < 6) {
      toast({
        title: "Weak Passphrase",
        description: "Passphrase must be at least 6 characters",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);

    try {
      const userId = generateUserId();
      
      const res = await apiRequest(
        "POST",
        "/api/rooms/create",
        {
          roomName: createForm.roomName,
          passphrase: createForm.passphrase,
          createdBy: userId,
        },
      );

      const response = await res.json() as { roomId: string; roomName: string };

      sessionStorage.setItem(
        "chat-session",
        JSON.stringify({
          roomId: response.roomId,
          roomName: response.roomName,
          username: createForm.username,
          passphrase: createForm.passphrase,
          userId,
          isAdmin: true,
        }),
      );

      setLocation("/chat");
    } catch (error: any) {
      toast({
        title: "Error Creating Room",
        description: error.message || "Failed to create room",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !joinForm.roomId.trim() ||
      !joinForm.username.trim() ||
      !joinForm.passphrase.trim()
    ) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    setIsJoining(true);

    try {
      const res = await apiRequest(
        "POST",
        "/api/rooms/verify",
        {
          roomId: joinForm.roomId,
          passphrase: joinForm.passphrase,
        },
      );

      const response = await res.json() as { valid: boolean; roomName: string };

      if (!response.valid) {
        toast({
          title: "Invalid Passphrase",
          description: "The passphrase you entered is incorrect",
          variant: "destructive",
        });
        return;
      }

      const userId = generateUserId();

      sessionStorage.setItem(
        "chat-session",
        JSON.stringify({
          roomId: joinForm.roomId,
          roomName: response.roomName,
          username: joinForm.username,
          passphrase: joinForm.passphrase,
          userId,
          isAdmin: false,
        }),
      );

      setLocation("/chat");
    } catch (error: any) {
      toast({
        title: "Error Joining Room",
        description: error.message || "Failed to join room",
        variant: "destructive",
      });
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center gap-3 mb-4">
            <i
              className="fa-solid fa-lock text-4xl text-primary animate-pulse-glow"
              aria-hidden="true"
            />
          </div>
          <h1 className="text-3xl font-bold font-mono tracking-tight text-foreground">
            SECURE CHAT
          </h1>
          <p className="text-sm text-muted-foreground font-mono">
            Hacker-grade encrypted messaging
          </p>
          <div className="flex items-center justify-center gap-2 text-xs text-primary font-mono">
            <i className="fa-solid fa-shield-halved" aria-hidden="true" />
            <span>End-to-End AES-256 Encryption</span>
          </div>
        </div>

        <Card className="p-6 border-primary/20 shadow-lg shadow-primary/5">
          <Tabs defaultValue="create" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 font-mono">
              <TabsTrigger value="create" data-testid="tab-create-room">
                CREATE ROOM
              </TabsTrigger>
              <TabsTrigger value="join" data-testid="tab-join-room">
                JOIN ROOM
              </TabsTrigger>
            </TabsList>

            <TabsContent value="create" className="space-y-4">
              <form onSubmit={handleCreateRoom} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="room-name" className="text-xs uppercase tracking-wider font-mono">
                    Room Name
                  </Label>
                  <Input
                    id="room-name"
                    value={createForm.roomName}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, roomName: e.target.value })
                    }
                    placeholder="My Secure Room"
                    className="font-mono"
                    data-testid="input-room-name"
                    disabled={isCreating}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="create-username" className="text-xs uppercase tracking-wider font-mono">
                    Your Username
                  </Label>
                  <Input
                    id="create-username"
                    value={createForm.username}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, username: e.target.value })
                    }
                    placeholder="hacker01"
                    className="font-mono"
                    data-testid="input-create-username"
                    disabled={isCreating}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="create-passphrase" className="text-xs uppercase tracking-wider font-mono">
                    Room Passphrase
                  </Label>
                  <div className="relative">
                    <Input
                      id="create-passphrase"
                      type={showPassphrase.create ? "text" : "password"}
                      value={createForm.passphrase}
                      onChange={(e) =>
                        setCreateForm({ ...createForm, passphrase: e.target.value })
                      }
                      placeholder="Min 6 characters"
                      className="font-mono pr-10"
                      data-testid="input-create-passphrase"
                      disabled={isCreating}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowPassphrase({ ...showPassphrase, create: !showPassphrase.create })
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      data-testid="button-toggle-create-passphrase"
                      disabled={isCreating}
                    >
                      <i
                        className={`fa-solid ${showPassphrase.create ? "fa-eye-slash" : "fa-eye"} text-sm`}
                        aria-hidden="true"
                      />
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground font-mono">
                    Share this passphrase with trusted users only
                  </p>
                </div>

                <Button
                  type="submit"
                  className="w-full font-mono gap-2 text-base"
                  size="lg"
                  data-testid="button-create-room"
                  disabled={isCreating}
                >
                  {isCreating ? (
                    <>
                      <i className="fa-solid fa-spinner fa-spin text-sm" aria-hidden="true" />
                      CREATING...
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-plus text-sm" aria-hidden="true" />
                      CREATE SECURE ROOM
                    </>
                  )}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="join" className="space-y-4">
              <form onSubmit={handleJoinRoom} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="room-id" className="text-xs uppercase tracking-wider font-mono">
                    Room ID
                  </Label>
                  <Input
                    id="room-id"
                    value={joinForm.roomId}
                    onChange={(e) =>
                      setJoinForm({ ...joinForm, roomId: e.target.value })
                    }
                    placeholder="Paste room ID here"
                    className="font-mono"
                    data-testid="input-room-id"
                    disabled={isJoining}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="join-username" className="text-xs uppercase tracking-wider font-mono">
                    Your Username
                  </Label>
                  <Input
                    id="join-username"
                    value={joinForm.username}
                    onChange={(e) =>
                      setJoinForm({ ...joinForm, username: e.target.value })
                    }
                    placeholder="hacker02"
                    className="font-mono"
                    data-testid="input-join-username"
                    disabled={isJoining}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="join-passphrase" className="text-xs uppercase tracking-wider font-mono">
                    Room Passphrase
                  </Label>
                  <div className="relative">
                    <Input
                      id="join-passphrase"
                      type={showPassphrase.join ? "text" : "password"}
                      value={joinForm.passphrase}
                      onChange={(e) =>
                        setJoinForm({ ...joinForm, passphrase: e.target.value })
                      }
                      placeholder="Enter room passphrase"
                      className="font-mono pr-10"
                      data-testid="input-join-passphrase"
                      disabled={isJoining}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowPassphrase({ ...showPassphrase, join: !showPassphrase.join })
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      data-testid="button-toggle-join-passphrase"
                      disabled={isJoining}
                    >
                      <i
                        className={`fa-solid ${showPassphrase.join ? "fa-eye-slash" : "fa-eye"} text-sm`}
                        aria-hidden="true"
                      />
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full font-mono gap-2 text-base"
                  size="lg"
                  data-testid="button-join-room"
                  disabled={isJoining}
                >
                  {isJoining ? (
                    <>
                      <i className="fa-solid fa-spinner fa-spin text-sm" aria-hidden="true" />
                      JOINING...
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-arrow-right text-sm" aria-hidden="true" />
                      JOIN ROOM
                    </>
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </Card>

        <div className="text-center space-y-2">
          <p className="text-xs text-muted-foreground font-mono">
            Messages are encrypted in your browser and stored only in memory
          </p>
          <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground font-mono">
            <div className="flex items-center gap-1">
              <i className="fa-solid fa-server text-primary" aria-hidden="true" />
              <span>No Database</span>
            </div>
            <div className="flex items-center gap-1">
              <i className="fa-solid fa-fire text-primary" aria-hidden="true" />
              <span>Ephemeral</span>
            </div>
            <div className="flex items-center gap-1">
              <i className="fa-solid fa-lock text-primary" aria-hidden="true" />
              <span>E2E Encrypted</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
