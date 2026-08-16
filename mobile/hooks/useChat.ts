// hooks/useChat.ts
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { connecterSocket, deconnecterSocket } from "../services/socket";
import {
  recupererConversations,
  recupererMessages,
  televerserMedia,
  type AutreUtilisateurApi,
} from "../services/api";
import type { ChatMessage, MediaAttachment } from "../types/chat";

export function useChat() {
  const { token, utilisateur } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [autreUtilisateur, setAutreUtilisateur] = useState<AutreUtilisateurApi | null>(null);
  const [chargement, setChargement] = useState(true);
  const [chargementAncien, setChargementAncien] = useState(false);
  const [toutCharge, setToutCharge] = useState(false);
  const [connecte, setConnecte] = useState(false);
  const [enTrainDEcrire, setEnTrainDEcrire] = useState(false);
  const timerFrappeRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
        const historique = await recupererMessages(token, conv.id, undefined, 20);

        if (annule) return;
        setConversationId(conv.id);
        setAutreUtilisateur(conv.autreUtilisateur);
        // Liste inversée : le plus récent en premier
        setMessages(historique.reverse());
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

    socket.on("frappe", ({ actif }: { actif: boolean }) => {
      setEnTrainDEcrire(actif);
    });

    socket.on("message:nouveau", (message: ChatMessage) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === message.id)) return prev;
        return [message, ...prev];
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
      socket.off("frappe");
      deconnecterSocket();
      socketRef.current = null;
    };
  }, [token]);

  const chargerPlusAnciens = useCallback(async () => {
    if (!token || !conversationId || chargementAncien || toutCharge) return;
    if (messages.length === 0) return;

    setChargementAncien(true);

    try {
      // Liste inversée : le plus ancien est en dernière position
      const lePlusAncien = messages[messages.length - 1];
      const anciens = await recupererMessages(
        token,
        conversationId,
        lePlusAncien.createdAt,
        20
      );

      if (anciens.length === 0) {
        setToutCharge(true);
      } else {
        setMessages((prev) => {
          const idsExistants = new Set(prev.map((m) => m.id));
          const nouveaux = anciens.reverse().filter((m) => !idsExistants.has(m.id));
          return [...prev, ...nouveaux];
        });
      }
    } catch (err) {
      console.error("Erreur chargement historique :", err);
    } finally {
      setChargementAncien(false);
    }
  }, [token, conversationId, messages, chargementAncien, toutCharge]);

  const signalerFrappe = useCallback(() => {
    const socket = socketRef.current;
    if (!socket || !conversationId) return;

    socket.emit("frappe", { conversationId, actif: true });

    // On annule le signal après 2s d'inactivité
    if (timerFrappeRef.current) clearTimeout(timerFrappeRef.current);
    timerFrappeRef.current = setTimeout(() => {
      socket.emit("frappe", { conversationId, actif: false });
    }, 2000);
  }, [conversationId]);

  const envoyerMessage = useCallback(
    async (contenu: string, media?: MediaAttachment) => {
      const socket = socketRef.current;
      if (!socket || !conversationId || !utilisateur || !token) return;

      const idLocal = `local-${Date.now()}`;

      const optimiste: ChatMessage = {
        id: idLocal,
        conversationId,
        senderId: utilisateur.id,
        text: contenu || undefined,
        media: media ? [media] : undefined,
        createdAt: new Date().toISOString(),
        status: "sending",
      };

      setMessages((prev) => [optimiste, ...prev]);

      try {
        let mediasPayload: unknown[] = [];

        if (media?.uri) {
          const televerse = await televerserMedia(
            token,
            media.uri,
            media.mimeType ?? "image/jpeg"
          );

          mediasPayload = [
            {
              type: media.type,
              cleObjet: televerse.cleObjet,
              cleVignette: televerse.cleVignette,
              mimeType: televerse.mimeType,
              tailleOctets: televerse.tailleOctets,
              width: televerse.largeur ?? media.width,
              height: televerse.hauteur ?? media.height,
              durationMs: media.durationMs,
            },
          ];
        }

        socket.emit(
          "message:envoyer",
          { conversationId, contenu, medias: mediasPayload, idLocal },
          (reponse: any) => {
            if (reponse?.ok) {
              setMessages((prev) =>
                prev.map((m) => (m.id === idLocal ? reponse.message : m))
              );
            } else {
              setMessages((prev) =>
                prev.map((m) => (m.id === idLocal ? { ...m, status: "failed" } : m))
              );
            }
          }
        );
      } catch (err) {
        console.error("Erreur envoi média :", err);
        setMessages((prev) =>
          prev.map((m) => (m.id === idLocal ? { ...m, status: "failed" } : m))
        );
      }
    },
    [conversationId, utilisateur, token]
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
    chargementAncien,
    toutCharge,
    connecte,
    conversationId,
    autreUtilisateur,
    enTrainDEcrire,
    envoyerMessage,
    marquerCommeLus,
    signalerFrappe,
    chargerPlusAnciens,
  };
}