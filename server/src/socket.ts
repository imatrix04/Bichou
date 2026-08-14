import type { Server, Socket } from "socket.io";
import { verifierToken, type PayloadToken } from "./auth/jwt.js";
import { query, transaction } from "./db.js";

interface SocketAuthentifie extends Socket {
  utilisateur?: PayloadToken;
}

export function configurerSocket(io: Server) {
  // Middleware d'authentification : rejette toute connexion sans token valide
  io.use((socket: SocketAuthentifie, next) => {
    const token = socket.handshake.auth?.token;

    if (typeof token !== "string") {
      return next(new Error("Token manquant"));
    }

    const payload = verifierToken(token);

    if (!payload) {
      return next(new Error("Token invalide"));
    }

    socket.utilisateur = payload;
    next();
  });

  io.on("connection", async (socket: SocketAuthentifie) => {
    const utilisateurId = socket.utilisateur!.utilisateurId;
    console.log(`Connecté : ${socket.utilisateur!.login}`);

    // L'utilisateur rejoint une room par conversation à laquelle il participe
    try {
      const conversations = await query<{ conversation_id: string }>(
        `SELECT conversation_id FROM participation WHERE utilisateur_id = $1`,
        [utilisateurId]
      );

      for (const { conversation_id } of conversations) {
        socket.join(`conv:${conversation_id}`);
      }
    } catch (err) {
      console.error("Erreur rooms :", err);
    }

    // Tout ce qui était en attente passe à "remis"
    try {
      await query(
        `UPDATE statut_lecture SET remis_le = NOW()
         WHERE utilisateur_id = $1 AND remis_le IS NULL`,
        [utilisateurId]
      );
    } catch (err) {
      console.error("Erreur marquage remis :", err);
    }

    // Envoi d'un message
    socket.on("message:envoyer", async (donnees, callback) => {
      const { conversationId, contenu, idLocal } = donnees ?? {};

      if (typeof conversationId !== "string" || typeof contenu !== "string" || !contenu.trim()) {
        return callback?.({ ok: false, erreur: "Données invalides" });
      }

      try {
        const participants = await query<{ utilisateur_id: string }>(
          `SELECT utilisateur_id FROM participation WHERE conversation_id = $1`,
          [conversationId]
        );

        if (!participants.some((p) => p.utilisateur_id === utilisateurId)) {
          return callback?.({ ok: false, erreur: "Accès refusé" });
        }

        const message = await transaction(async (client) => {
          const { rows } = await client.query(
            `INSERT INTO message (conversation_id, expediteur_id, contenu)
             VALUES ($1, $2, $3)
             RETURNING id, conversation_id, expediteur_id, contenu, envoye_le`,
            [conversationId, utilisateurId, contenu.trim()]
          );

          const nouveau = rows[0];

          for (const dest of participants.filter((p) => p.utilisateur_id !== utilisateurId)) {
            await client.query(
              `INSERT INTO statut_lecture (message_id, utilisateur_id) VALUES ($1, $2)`,
              [nouveau.id, dest.utilisateur_id]
            );
          }

          return nouveau;
        });

        const messageApi = {
          id: message.id,
          conversationId: message.conversation_id,
          senderId: message.expediteur_id,
          text: message.contenu,
          createdAt: message.envoye_le.toISOString(),
          status: "sent",
        };

        // Accusé de réception à l'expéditeur : il remplace son message optimiste
        // par la version serveur (vrai id, vraie date)
        callback?.({ ok: true, message: messageApi, idLocal });

        // Diffusion aux autres participants
        socket.to(`conv:${conversationId}`).emit("message:nouveau", messageApi);
      } catch (err) {
        console.error("Erreur envoi :", err);
        callback?.({ ok: false, erreur: "Erreur serveur" });
      }
    });

    // Marquer des messages comme lus
    socket.on("message:lu", async (donnees) => {
      const { conversationId, messageIds } = donnees ?? {};

      if (!Array.isArray(messageIds) || messageIds.length === 0) return;

      try {
        await query(
          `UPDATE statut_lecture
           SET lu_le = NOW(), remis_le = COALESCE(remis_le, NOW())
           WHERE utilisateur_id = $1 AND message_id = ANY($2::uuid[]) AND lu_le IS NULL`,
          [utilisateurId, messageIds]
        );

        // Prévient l'expéditeur que ses messages ont été lus
        socket.to(`conv:${conversationId}`).emit("message:statut", {
          messageIds,
          statut: "read",
        });
      } catch (err) {
        console.error("Erreur marquage lu :", err);
      }
    });

    // Indicateur "est en train d'écrire"
    socket.on("frappe", ({ conversationId, actif }) => {
      socket.to(`conv:${conversationId}`).emit("frappe", {
        utilisateurId,
        actif: Boolean(actif),
      });
    });

    socket.on("disconnect", (raison) => {
      console.log(`Déconnecté : ${socket.utilisateur!.login} (${raison})`);
    });
  });
}