// data/mockMessages.ts
// Données factices pour développer l'UI du chat avant que le back FastAPI soit prêt.
// Le jour où l'API est branchée, ce fichier disparaît et est remplacé par un appel
// dans services/chatService.ts (fetch initial + écoute WebSocket).

import { ChatMessage, User } from "../types/chat";

export const CURRENT_USER_ID = "florent";

export const users: Record<string, User> = {
  florent: { id: "florent", displayName: "Florent" },
  caro: { id: "caro", displayName: "Caro" },
};

export const mockMessages: ChatMessage[] = [
  {
    id: "m1",
    conversationId: "conv-main",
    senderId: "caro",
    text: "Coucou ! T'en es où sur l'appli ? 😄",
    createdAt: "2026-08-13T08:12:00.000Z",
    status: "read",
  },
  {
    id: "m2",
    conversationId: "conv-main",
    senderId: "florent",
    text: "Je viens de finir l'écran de chat avec des messages mockés, ça rend bien !",
    createdAt: "2026-08-13T08:13:30.000Z",
    status: "read",
  },
  {
    id: "m3",
    conversationId: "conv-main",
    senderId: "caro",
    text: "Nice, hâte de voir ça tourner sur mon tel",
    createdAt: "2026-08-13T08:14:05.000Z",
    status: "read",
  },
  {
    id: "m4",
    conversationId: "conv-main",
    senderId: "florent",
    text: "Regarde, j'ai mis une vraie image mockée en dessous",
    media: [
      {
        id: "med1",
        type: "image",
        uri: "https://picsum.photos/seed/coupapp/600/400",
        width: 600,
        height: 400,
      },
    ],
    createdAt: "2026-08-13T08:15:40.000Z",
    status: "delivered",
  },
  {
    id: "m5",
    conversationId: "conv-main",
    senderId: "caro",
    text: "Trop beau ❤️",
    createdAt: "2026-08-13T08:16:02.000Z",
    status: "sent",
  },
];
