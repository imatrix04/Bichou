// services/socket.ts
import { io, type Socket } from "socket.io-client";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL;

let socket: Socket | null = null;

export function connecterSocket(token: string): Socket {
  if (socket?.connected) return socket;

  socket = io(BASE_URL, {
    auth: { token },
    transports: ["websocket"],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });

  return socket;
}

export function deconnecterSocket() {
  socket?.disconnect();
  socket = null;
}

export function obtenirSocket(): Socket | null {
  return socket;
}