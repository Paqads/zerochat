import { z } from "zod";

// Chat Room Schema
export const chatRoomSchema = z.object({
  id: z.string(),
  name: z.string(),
  createdBy: z.string(),
  createdAt: z.number(),
  userCount: z.number(),
});

export type ChatRoom = z.infer<typeof chatRoomSchema>;

// Message Schema
export const messageSchema = z.object({
  id: z.string(),
  roomId: z.string(),
  userId: z.string(),
  username: z.string(),
  content: z.string(),
  timestamp: z.number(),
  isSystem: z.boolean().optional(),
});

export type Message = z.infer<typeof messageSchema>;

// User Schema
export const userSchema = z.object({
  id: z.string(),
  username: z.string(),
  roomId: z.string(),
  isAdmin: z.boolean(),
  joinedAt: z.number(),
});

export type User = z.infer<typeof userSchema>;

// WebSocket Message Types
export type WSMessageType =
  | "join_room"
  | "leave_room"
  | "send_message"
  | "user_joined"
  | "user_left"
  | "message_broadcast"
  | "passphrase_changed"
  | "user_list_update"
  | "error";

export const wsMessageSchema = z.object({
  type: z.string(),
  payload: z.any(),
});

export type WSMessage = z.infer<typeof wsMessageSchema>;

// Form Schemas
export const createRoomSchema = z.object({
  roomName: z.string().min(3, "Room name must be at least 3 characters"),
  username: z.string().min(2, "Username must be at least 2 characters"),
  passphrase: z.string().min(6, "Passphrase must be at least 6 characters"),
});

export type CreateRoomInput = z.infer<typeof createRoomSchema>;

export const joinRoomSchema = z.object({
  roomId: z.string(),
  username: z.string().min(2, "Username must be at least 2 characters"),
  passphrase: z.string().min(6, "Passphrase must be at least 6 characters"),
});

export type JoinRoomInput = z.infer<typeof joinRoomSchema>;

export const changePassphraseSchema = z.object({
  newPassphrase: z.string().min(6, "Passphrase must be at least 6 characters"),
});

export type ChangePassphraseInput = z.infer<typeof changePassphraseSchema>;
