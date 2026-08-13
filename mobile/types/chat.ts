// types/chat.ts
// Types alignés sur les futures entités du MCD (Utilisateur, Message, Média, Conversation)

export type UserId = "florent" | "caro";

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
  uri: string; // local uri en mock, url S3/Minio plus tard
  thumbnailUri?: string;
  width?: number;
  height?: number;
  durationMs?: number; // pour les vidéos
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
