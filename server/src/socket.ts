import type { Server, Socket } from "socket.io";
import { verifierToken, type PayloadToken } from "./auth/jwt.js";
import { query, transaction } from "./db.js";
import { urlSignee } from "./stockage/url.js";
import { envoyerPushMessage } from "./notifications/push.js";

interface SocketAuthentifie extends Socket {
  utilisateur?: PayloadToken;
}

interface LigneMediaCreee {
  id: string;
  type: string;
  cle_objet: string;
  cle_vignette: string | null;
  mime_type: string;
  largeur: number | null;
  hauteur: number | null;
  duree_ms: number | null;
}

const utilisateursConnectes = new Map<string, Set<string>>();

function estConnecte(utilisateurId: string): boolean {
  return (utilisateursConnectes.get(utilisateurId)?.size ?? 0) > 0;
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
    
    if (!utilisateursConnectes.has(utilisateurId)) {
      utilisateursConnectes.set(utilisateurId, new Set());
    }
    utilisateursConnectes.get(utilisateurId)!.add(socket.id);

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

    // Envoi d'un message (texte et/ou médias)
    socket.on("message:envoyer", async (donnees, callback) => {
      const { conversationId, contenu, medias, idLocal } = donnees ?? {};

      const texte = typeof contenu === "string" ? contenu.trim() : "";
      const listeMedias = Array.isArray(medias) ? medias : [];

      if (typeof conversationId !== "string" || (!texte && listeMedias.length === 0)) {
        return callback?.({ ok: false, erreur: "Message vide" });
      }

      try {
        const participants = await query<{ utilisateur_id: string }>(
          `SELECT utilisateur_id FROM participation WHERE conversation_id = $1`,
          [conversationId]
        );

        if (!participants.some((p) => p.utilisateur_id === utilisateurId)) {
          return callback?.({ ok: false, erreur: "Accès refusé" });
        }

        const resultat = await transaction(async (client) => {
          const { rows } = await client.query(
            `INSERT INTO message (conversation_id, expediteur_id, contenu)
             VALUES ($1, $2, $3)
             RETURNING id, conversation_id, expediteur_id, contenu, envoye_le`,
            [conversationId, utilisateurId, texte || null]
          );

          const nouveau = rows[0];
          const mediasCrees: LigneMediaCreee[] = [];

          for (const media of listeMedias) {
            const { rows: ligneMedia } = await client.query<LigneMediaCreee>(
              `INSERT INTO media
                 (message_id, televerse_par, type, cle_objet, cle_vignette, mime_type,
                  taille_octets, largeur, hauteur, duree_ms)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
               RETURNING id, type, cle_objet, cle_vignette, mime_type, largeur, hauteur, duree_ms`,
              [
                nouveau.id,
                utilisateurId,
                media.type,
                media.cleObjet,
                media.cleVignette ?? null,
                media.mimeType,
                media.tailleOctets ?? 0,
                media.width ?? null,
                media.height ?? null,
                media.durationMs ?? null,
              ]
            );
            mediasCrees.push(ligneMedia[0]);
          }

          for (const dest of participants.filter((p) => p.utilisateur_id !== utilisateurId)) {
            await client.query(
              `INSERT INTO statut_lecture (message_id, utilisateur_id) VALUES ($1, $2)`,
              [nouveau.id, dest.utilisateur_id]
            );
          }

          return { message: nouveau, medias: mediasCrees };
        });

        const messageApi = {
          id: resultat.message.id,
          conversationId: resultat.message.conversation_id,
          senderId: resultat.message.expediteur_id,
          text: resultat.message.contenu ?? undefined,
          media: resultat.medias.length > 0
            ? resultat.medias.map((m) => ({
                id: m.id,
                type: m.type,
                url: urlSignee(m.cle_objet),
                urlVignette: m.cle_vignette ? urlSignee(m.cle_vignette) : undefined,
                mimeType: m.mime_type,
                width: m.largeur,
                height: m.hauteur,
                durationMs: m.duree_ms,
              }))
            : undefined,
          createdAt: resultat.message.envoye_le.toISOString(),
          status: "sent",
        };

        callback?.({ ok: true, message: messageApi, idLocal });
        socket.to(`conv:${conversationId}`).emit("message:nouveau", messageApi);

        for (const dest of participants) {
          if (dest.utilisateur_id === utilisateurId) continue;
          if (estConnecte(dest.utilisateur_id)) continue;

          const apercu = texte || (listeMedias.length > 0 ? "Nouvelle photo" : "Nouveau message");
          envoyerPushMessage(
            dest.utilisateur_id,
            socket.utilisateur!.login,
            apercu,
            { conversationId }
          ).catch((err) => console.error("Erreur push :", err));
        }
        
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

    socket.on("disconnect", async (raison) => {
      console.log(`Déconnecté : ${socket.utilisateur!.login} (${raison})`);

        const sockets = utilisateursConnectes.get(utilisateurId);
        sockets?.delete(socket.id);
        if (sockets && sockets.size === 0) {
          utilisateursConnectes.delete(utilisateurId);
        }

      // Coupe l'indicateur de frappe resté actif
      const conversations = await query<{ conversation_id: string }>(
        `SELECT conversation_id FROM participation WHERE utilisateur_id = $1`,
        [utilisateurId]
      ).catch(() => []);

      for (const { conversation_id } of conversations) {
        socket.to(`conv:${conversation_id}`).emit("frappe", {
          utilisateurId,
          actif: false,
        });
      }
    });
  });
}