import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";

interface WSClient extends WebSocket {
  userId?: string;
  roomId?: string;
  username?: string;
  isAlive?: boolean;
}

export async function registerRoutes(app: Express): Promise<Server> {
  app.post("/api/rooms/create", async (req, res) => {
    try {
      const { roomName, passphrase, createdBy } = req.body;

      if (!roomName || !passphrase || !createdBy) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      if (passphrase.length < 6) {
        return res.status(400).json({ error: "Passphrase must be at least 6 characters" });
      }

      const room = await storage.createRoom(roomName, passphrase, createdBy);
      console.log(`[API] Created room: ${room.id} - ${room.name}`);

      res.json({ roomId: room.id, roomName: room.name });
    } catch (error) {
      console.error("Error creating room:", error);
      res.status(500).json({ error: "Failed to create room" });
    }
  });

  app.post("/api/rooms/verify", async (req, res) => {
    try {
      const { roomId, passphrase } = req.body;

      if (!roomId || !passphrase) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const room = await storage.getRoom(roomId);
      if (!room) {
        return res.status(404).json({ error: "Room not found" });
      }

      const isValid = await storage.verifyPassphrase(roomId, passphrase);

      res.json({ valid: isValid, roomName: room.name });
    } catch (error) {
      console.error("Error verifying passphrase:", error);
      res.status(500).json({ error: "Failed to verify passphrase" });
    }
  });

  const httpServer = createServer(app);

  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  const clients = new Map<string, WSClient>();

  function broadcastToRoom(roomId: string, message: any, excludeUserId?: string) {
    const messageStr = JSON.stringify(message);

    clients.forEach((client) => {
      if (
        client.roomId === roomId &&
        client.readyState === WebSocket.OPEN &&
        client.userId !== excludeUserId
      ) {
        client.send(messageStr);
      }
    });
  }

  async function sendUserListUpdate(roomId: string) {
    const users = await storage.getUsersByRoom(roomId);
    
    broadcastToRoom(roomId, {
      type: "user_list_update",
      payload: { users },
    });

    clients.forEach((client) => {
      if (client.roomId === roomId && client.readyState === WebSocket.OPEN) {
        client.send(
          JSON.stringify({
            type: "user_list_update",
            payload: { users },
          }),
        );
      }
    });
  }

  function heartbeat(this: WSClient) {
    this.isAlive = true;
  }

  const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
      const client = ws as WSClient;

      if (client.isAlive === false) {
        if (client.userId && client.roomId) {
          handleUserLeave(client.userId, client.roomId, client.username || "Unknown");
        }
        return client.terminate();
      }

      client.isAlive = false;
      client.ping();
    });
  }, 30000);

  wss.on("close", () => {
    clearInterval(interval);
  });

  async function handleUserLeave(userId: string, roomId: string, username: string) {
    await storage.removeUser(userId);
    clients.delete(userId);

    broadcastToRoom(roomId, {
      type: "user_left",
      payload: { userId, username },
    });

    await sendUserListUpdate(roomId);

    const remainingUsers = await storage.getUsersByRoom(roomId);
    console.log(`[WS] User ${username} left ${roomId}. Remaining users: ${remainingUsers.length}`);
    if (remainingUsers.length === 0) {
      console.log(`[WS] Deleting empty room ${roomId}`);
      await storage.deleteRoom(roomId);
    }
  }

  wss.on("connection", (ws: WSClient) => {
    ws.isAlive = true;
    ws.on("pong", heartbeat);

    ws.on("message", async (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        const { type, payload } = message;

        switch (type) {
          case "join_room": {
            const { roomId, username, passphrase, userId, isAdmin } = payload;
            console.log(`[WS] join_room attempt: roomId=${roomId}, username=${username}, userId=${userId}`);

            const existingUser = await storage.getUsernameInRoom(roomId, username);
            if (existingUser) {
              console.log(`[WS] Username already taken: ${username}`);
              ws.send(
                JSON.stringify({
                  type: "error",
                  payload: {
                    message: "Username already taken in this room",
                    fatal: true,
                  },
                }),
              );
              return;
            }

            const room = await storage.getRoom(roomId);
            console.log(`[WS] Room lookup: ${roomId} ->`, room ? `found (${room.name})` : 'NOT FOUND');
            if (!room) {
              ws.send(
                JSON.stringify({
                  type: "error",
                  payload: { message: "Room not found", fatal: true },
                }),
              );
              return;
            }

            const isValidPassphrase = await storage.verifyPassphrase(
              roomId,
              passphrase,
            );

            if (!isValidPassphrase) {
              ws.send(
                JSON.stringify({
                  type: "error",
                  payload: { message: "Invalid passphrase", fatal: true },
                }),
              );
              return;
            }

            const user = await storage.addUser({
              id: userId,
              username,
              roomId,
              isAdmin,
            });

            ws.userId = userId;
            ws.roomId = roomId;
            ws.username = username;
            clients.set(userId, ws);

            const messages = await storage.getMessagesByRoom(roomId);
            messages.forEach((msg) => {
              ws.send(
                JSON.stringify({
                  type: "message_broadcast",
                  payload: msg,
                }),
              );
            });

            broadcastToRoom(
              roomId,
              {
                type: "user_joined",
                payload: { userId, username },
              },
              userId,
            );

            await sendUserListUpdate(roomId);

            break;
          }

          case "send_message": {
            const { roomId, userId, username, content } = payload;

            const user = await storage.getUser(userId);
            if (!user || user.roomId !== roomId) {
              ws.send(
                JSON.stringify({
                  type: "error",
                  payload: { message: "Unauthorized" },
                }),
              );
              return;
            }

            const message = await storage.addMessage({
              roomId,
              userId,
              username,
              content,
              isSystem: false,
            });

            broadcastToRoom(roomId, {
              type: "message_broadcast",
              payload: message,
            });

            break;
          }

          case "change_passphrase": {
            const { roomId, userId, newPassphrase } = payload;

            const user = await storage.getUser(userId);
            if (!user || !user.isAdmin || user.roomId !== roomId) {
              ws.send(
                JSON.stringify({
                  type: "error",
                  payload: { message: "Unauthorized - Admin only" },
                }),
              );
              return;
            }

            console.log(`[WS] Changing passphrase for room ${roomId}`);
            await storage.updateRoomPassphrase(roomId, newPassphrase);

            const allUsers = await storage.getUsersByRoom(roomId);

            for (const u of allUsers) {
              const client = clients.get(u.id);
              if (!client || client.readyState !== WebSocket.OPEN) continue;

              if (u.id === userId) {
                client.send(
                  JSON.stringify({
                    type: "clear_history",
                    payload: {},
                  }),
                );
              } else {
                client.send(
                  JSON.stringify({
                    type: "clear_history",
                    payload: {},
                  }),
                );

                client.send(
                  JSON.stringify({
                    type: "passphrase_changed",
                    payload: {},
                  }),
                );

                setTimeout(() => {
                  if (client.readyState === WebSocket.OPEN) {
                    client.close(1000, "Passphrase changed");
                  }
                }, 200);

                await storage.removeUser(u.id);
                clients.delete(u.id);
              }
            }

            console.log(`[WS] Passphrase changed. Remaining users: 1 (admin)`);

            await sendUserListUpdate(roomId);

            break;
          }

          case "leave_room": {
            const { roomId, userId } = payload;

            const user = await storage.getUser(userId);
            if (user && user.roomId === roomId) {
              await handleUserLeave(userId, roomId, user.username);
            }

            break;
          }

          default:
            ws.send(
              JSON.stringify({
                type: "error",
                payload: { message: "Unknown message type" },
              }),
            );
        }
      } catch (error) {
        console.error("WebSocket error:", error);
        ws.send(
          JSON.stringify({
            type: "error",
            payload: { message: "Internal server error" },
          }),
        );
      }
    });

    ws.on("close", async () => {
      if (ws.userId && ws.roomId && ws.username) {
        const user = await storage.getUser(ws.userId);
        if (user) {
          await handleUserLeave(ws.userId, ws.roomId, ws.username);
        }
      }
    });

    ws.on("error", (error) => {
      console.error("WebSocket client error:", error);
    });
  });

  return httpServer;
}
