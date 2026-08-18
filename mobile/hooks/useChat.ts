// hooks/useChat.ts
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
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
  const [autreEnLigne, setAutreEnLigne] = useState(false);
  const [enTrainDEcrire, setEnTrainDEcrire] = useState(false);
  const timerFrappeRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const socketRef = useRef<ReturnType<typeof connecterSocket> | null>(null);

  const statutsEnAttenteRef = useRef<Map<string, ChatMessage["status"]>>(new Map());
  const conversationIdRef = useRef<string | null>(null);
  const autreUtilisateurIdRef = useRef<string | null>(null);

  const resynchroniser = useCallback(async () => {
    const convId = conversationIdRef.current;
    if (!token || !convId) return;

    try {
      const recents = await recupererMessages(token, convId, undefined, 20);
      setMessages((prev) => {
        const idsExistants = new Set(prev.map((m) => m.id));
        const nouveaux = recents.filter((m) => !idsExistants.has(m.id)).reverse();
        return nouveaux.length > 0 ? [...nouveaux, ...prev] : prev;
      });
    } catch (err) {
      console.error("Erreur resynchronisation :", err);
    }
  }, [token]);

  // Chargement initial (conversation + historique), PUIS connexion WebSocket.
  // On attend d'avoir chargé autreUtilisateur avant d'ouvrir le socket, pour
  // que autreUtilisateurIdRef soit déjà renseigné quand le serveur nous
  // envoie l'état de présence initial — pas de race condition possible.
  useEffect(() => {
    if (!token) return;

    let annule = false;
    let socket: ReturnType<typeof connecterSocket> | null = null;

    (async () => {
      try {
        const conversations = await recupererConversations(token);
        if (annule || conversations.length === 0) return;

        const conv = conversations[0];
        const historique = await recupererMessages(token, conv.id, undefined, 20);

        if (annule) return;

        conversationIdRef.current = conv.id;
        autreUtilisateurIdRef.current = conv.autreUtilisateur?.id ?? null;

        setConversationId(conv.id);
        setAutreUtilisateur(conv.autreUtilisateur);
        // Liste inversée : le plus récent en premier
        setMessages(historique.reverse());
      } catch (err) {
        console.error("Erreur chargement chat :", err);
      } finally {
        if (!annule) setChargement(false);
      }

      if (annule) return;

      // autreUtilisateurIdRef est déjà à jour à ce stade (ou null s'il n'y
      // a pas de conversation / pas d'autre participant).
      socket = connecterSocket(token);
      socketRef.current = socket;

      socket.on("connect", () => {
        setConnecte(true);
        resynchroniser();
      });
      socket.on("disconnect", () => setConnecte(false));

      socket.on("presence:maj", ({ utilisateurId, enLigne }: { utilisateurId: string; enLigne: boolean }) => {
        if (utilisateurId === autreUtilisateurIdRef.current) {
          setAutreEnLigne(enLigne);
        }
      });

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
        setMessages((prev) => {
          const idsPresents = new Set(prev.map((m) => m.id));
          for (const id of messageIds as string[]) {
            if (!idsPresents.has(id)) statutsEnAttenteRef.current.set(id, statut);
          }
          return prev.map((m) => (messageIds.includes(m.id) ? { ...m, status: statut } : m));
        });
      });
    })();

    return () => {
      annule = true;
      if (socket) {
        socket.off("connect");
        socket.off("disconnect");
        socket.off("presence:maj");
        socket.off("message:nouveau");
        socket.off("message:statut");
        socket.off("frappe");
        deconnecterSocket();
      }
      socketRef.current = null;
    };
  }, [token, resynchroniser]);

  useEffect(() => {
    const abonnement = AppState.addEventListener("change", (etat) => {
      if (etat === "active") resynchroniser();
    });
    return () => abonnement.remove();
  }, [resynchroniser]);

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
              const statutEnAttente = statutsEnAttenteRef.current.get(reponse.message.id);
              statutsEnAttenteRef.current.delete(reponse.message.id);
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === idLocal
                    ? { ...reponse.message, status: statutEnAttente ?? reponse.message.status }
                    : m
                )
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
    autreEnLigne,
    conversationId,
    autreUtilisateur,
    enTrainDEcrire,
    envoyerMessage,
    marquerCommeLus,
    signalerFrappe,
    chargerPlusAnciens,
  };
}