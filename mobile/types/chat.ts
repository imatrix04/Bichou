export type UserId = string;

export interface User {
  id: UserId;
  displayName: string;
  avatarUrl?: string;
}

export type MessageStatus = "sending" | "sent" | "delivered" | "read" | "failed";

export type MediaType = "image" | "video";

export interface MediaAttachment {
  id: string;
  type: MediaType;
  url?: string;
  urlVignette?: string;
  uri?: string;
  mimeType?: string;
  width?: number;
  height?: number;
  durationMs?: number;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: UserId;
  text?: string;
  media?: MediaAttachment[];
  createdAt: string; // ISO string, sera un timestamp back plus tard
  status: MessageStatus;
}
