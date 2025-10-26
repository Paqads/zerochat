import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";

interface ChatRoom {
  id: string;
  name: string;
  passphraseHash: string;
  createdBy: string;
  createdAt: number;
}

interface User {
  id: string;
  username: string;
  roomId: string;
  isAdmin: boolean;
  joinedAt: number;
}

interface Message {
  id: string;
  roomId: string;
  userId: string;
  username: string;
  content: string;
  timestamp: number;
  isSystem?: boolean;
}

export interface IStorage {
  createRoom(name: string, passphrase: string, createdBy: string): Promise<ChatRoom>;
  getRoom(roomId: string): Promise<ChatRoom | undefined>;
  verifyPassphrase(roomId: string, passphrase: string): Promise<boolean>;
  updateRoomPassphrase(roomId: string, newPassphrase: string): Promise<void>;
  deleteRoom(roomId: string): Promise<void>;

  addUser(user: Omit<User, "joinedAt">): Promise<User>;
  getUser(userId: string): Promise<User | undefined>;
  getUsersByRoom(roomId: string): Promise<User[]>;
  removeUser(userId: string): Promise<void>;
  getUsernameInRoom(roomId: string, username: string): Promise<User | undefined>;

  addMessage(message: Omit<Message, "id" | "timestamp">): Promise<Message>;
  getMessagesByRoom(roomId: string): Promise<Message[]>;
}

export class MemStorage implements IStorage {
  private rooms: Map<string, ChatRoom>;
  private users: Map<string, User>;
  private messages: Map<string, Message>;

  constructor() {
    this.rooms = new Map();
    this.users = new Map();
    this.messages = new Map();
  }

  async createRoom(
    name: string,
    passphrase: string,
    createdBy: string,
  ): Promise<ChatRoom> {
    const id = randomUUID();
    const passphraseHash = await bcrypt.hash(passphrase, 10);

    const room: ChatRoom = {
      id,
      name,
      passphraseHash,
      createdBy,
      createdAt: Date.now(),
    };

    this.rooms.set(id, room);
    return room;
  }

  async getRoom(roomId: string): Promise<ChatRoom | undefined> {
    return this.rooms.get(roomId);
  }

  async verifyPassphrase(roomId: string, passphrase: string): Promise<boolean> {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    return bcrypt.compare(passphrase, room.passphraseHash);
  }

  async updateRoomPassphrase(
    roomId: string,
    newPassphrase: string,
  ): Promise<void> {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const passphraseHash = await bcrypt.hash(newPassphrase, 10);
    room.passphraseHash = passphraseHash;
    this.rooms.set(roomId, room);

    const messagesToClear = Array.from(this.messages.values()).filter(
      (m) => m.roomId === roomId,
    );
    messagesToClear.forEach((m) => this.messages.delete(m.id));
  }

  async deleteRoom(roomId: string): Promise<void> {
    this.rooms.delete(roomId);
    
    const usersToRemove = Array.from(this.users.values()).filter(
      (u) => u.roomId === roomId,
    );
    usersToRemove.forEach((u) => this.users.delete(u.id));

    const messagesToRemove = Array.from(this.messages.values()).filter(
      (m) => m.roomId === roomId,
    );
    messagesToRemove.forEach((m) => this.messages.delete(m.id));
  }

  async addUser(user: Omit<User, "joinedAt">): Promise<User> {
    const fullUser: User = {
      ...user,
      joinedAt: Date.now(),
    };
    this.users.set(user.id, fullUser);
    return fullUser;
  }

  async getUser(userId: string): Promise<User | undefined> {
    return this.users.get(userId);
  }

  async getUsersByRoom(roomId: string): Promise<User[]> {
    return Array.from(this.users.values()).filter((u) => u.roomId === roomId);
  }

  async removeUser(userId: string): Promise<void> {
    this.users.delete(userId);
  }

  async getUsernameInRoom(
    roomId: string,
    username: string,
  ): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (u) => u.roomId === roomId && u.username === username,
    );
  }

  async addMessage(
    message: Omit<Message, "id" | "timestamp">,
  ): Promise<Message> {
    const id = randomUUID();
    const fullMessage: Message = {
      ...message,
      id,
      timestamp: Date.now(),
    };

    this.messages.set(id, fullMessage);
    return fullMessage;
  }

  async getMessagesByRoom(roomId: string): Promise<Message[]> {
    return Array.from(this.messages.values())
      .filter((m) => m.roomId === roomId)
      .sort((a, b) => a.timestamp - b.timestamp);
  }
}

export const storage = new MemStorage();
