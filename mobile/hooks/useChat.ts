// hooks/useChat.ts
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { connecterSocket, deconnecterSocket } from "../services/socket";
import { recupererConversations, recupererMessages } from "../services/api";
import type { ChatMessage } from "../types/chat";

export function useChat() {
  const { token, utilisateur } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [chargement, setChargement] = useState(true);
  const [connecte, setConnecte] = useState(false);
  const socketRef = useRef<ReturnType<typeof connecterSocket> | null>(null);

  // Chargement initial : conversation + historique
  useEffect(() => {
    if (!token) return;

    let annule = false;

    (async () => {
      try {
        const conversations = await recupererConversations(token);
        if (annule || conversations.length === 0) return;

        const conv = conversations[0];
        const historique = await recupererMessages(token, conv.id);

        if (annule) return;
        setConversationId(conv.id);
        setMessages(historique);
      } catch (err) {
        console.error("Erreur chargement chat :", err);
      } finally {
        if (!annule) setChargement(false);
      }
    })();

    return () => {
      annule = true;
    };
  }, [token]);

  // Connexion WebSocket
  useEffect(() => {
    if (!token) return;

    const socket = connecterSocket(token);
    socketRef.current = socket;

    socket.on("connect", () => setConnecte(true));
    socket.on("disconnect", () => setConnecte(false));

    socket.on("message:nouveau", (message: ChatMessage) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === message.id)) return prev;
        return [...prev, message];
      });
    });

    socket.on("message:statut", ({ messageIds, statut }) => {
      setMessages((prev) =>
        prev.map((m) => (messageIds.includes(m.id) ? { ...m, status: statut } : m))
      );
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("message:nouveau");
      socket.off("message:statut");
      deconnecterSocket();
      socketRef.current = null;
    };
  }, [token]);

  const envoyerMessage = useCallback(
    (contenu: string) => {
      const socket = socketRef.current;
      if (!socket || !conversationId || !utilisateur) return;

      const idLocal = `local-${Date.now()}`;

      // Affichage optimiste : le message apparaît immédiatement
      const optimiste: ChatMessage = {
        id: idLocal,
        conversationId,
        senderId: utilisateur.id,
        text: contenu,
        createdAt: new Date().toISOString(),
        status: "sending",
      };

      setMessages((prev) => [...prev, optimiste]);

      socket.emit("message:envoyer", { conversationId, contenu, idLocal }, (reponse: any) => {
        if (reponse?.ok) {
          // Remplace le message local par la version serveur
          setMessages((prev) =>
            prev.map((m) => (m.id === idLocal ? reponse.message : m))
          );
        } else {
          setMessages((prev) =>
            prev.map((m) => (m.id === idLocal ? { ...m, status: "failed" } : m))
          );
        }
      });
    },
    [conversationId, utilisateur]
  );

  // Marque comme lus les messages reçus non lus
  const marquerCommeLus = useCallback(() => {
    const socket = socketRef.current;
    if (!socket || !conversationId || !utilisateur) return;

    const nonLus = messages
      .filter((m) => m.senderId !== utilisateur.id && m.status !== "read")
      .map((m) => m.id);

    if (nonLus.length > 0) {
      socket.emit("message:lu", { conversationId, messageIds: nonLus });
    }
  }, [messages, conversationId, utilisateur]);

  return {
    messages,
    chargement,
    connecte,
    conversationId,
    envoyerMessage,
    marquerCommeLus,
  };
}