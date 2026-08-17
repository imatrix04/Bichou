import { Router } from "express";
import { query, transaction } from "../db.js";
import { authRequise } from "../auth/middleware.js";
import { urlSignee } from "../stockage/url.js";

export const routeurMessages = Router();

interface LigneMessage {
  id: string;
  conversation_id: string;
  expediteur_id: string;
  contenu: string | null;
  envoye_le: Date;
  edite_le: Date | null;
  supprime: boolean;
  medias: unknown;
  lu_le: Date | null;
  remis_le: Date | null;
}

// Transforme une ligne SQL en objet conforme au type ChatMessage du front
function versMessageApi(ligne: LigneMessage, utilisateurCourantId: string) {
  const estAMoi = ligne.expediteur_id === utilisateurCourantId;

  let statut: string;
  if (!estAMoi) {
    statut = "read";
  } else if (ligne.lu_le) {
    statut = "read";
  } else if (ligne.remis_le) {
    statut = "delivered";
  } else {
    statut = "sent";
  }

  const medias = Array.isArray(ligne.medias) && ligne.medias.length > 0
    ? (ligne.medias as any[]).map((m) => ({
        id: m.id,
        type: m.type,
        url: urlSignee(m.cleObjet),
        urlVignette: m.cleVignette ? urlSignee(m.cleVignette) : undefined,
        mimeType: m.mimeType,
        width: m.width,
        height: m.height,
        durationMs: m.durationMs,
      }))
    : undefined;

  return {
    id: ligne.id,
    conversationId: ligne.conversation_id,
    senderId: ligne.expediteur_id,
    text: ligne.contenu ?? undefined,
    media: medias,
    createdAt: ligne.envoye_le.toISOString(),
    status: statut,
    supprime: ligne.supprime,
  };
}

// GET /messages/:conversationId?avant=<iso>&limite=50
routeurMessages.get("/:conversationId", authRequise, async (req, res) => {
  const { conversationId } = req.params;
  const utilisateurId = req.utilisateur!.utilisateurId;
  const limite = Math.min(Number(req.query.limite) || 50, 100);
  const avant = typeof req.query.avant === "string" ? req.query.avant : null;

  try {
    // Vérifie que l'utilisateur participe bien à cette conversation
    const participation = await query(
      `SELECT 1 FROM participation
       WHERE utilisateur_id = $1 AND conversation_id = $2`,
      [utilisateurId, conversationId]
    );

    if (participation.length === 0) {
      return res.status(403).json({ erreur: "Accès refusé à cette conversation" });
    }

    const lignes = await query<LigneMessage>(
      `SELECT
         m.id, m.conversation_id, m.expediteur_id, m.contenu,
         m.envoye_le, m.edite_le, m.supprime,
         sl.lu_le, sl.remis_le,
         COALESCE(
           json_agg(
             json_build_object(
               'id', md.id,
               'type', md.type,
               'cleObjet', md.cle_objet,
               'cleVignette', md.cle_vignette,
               'mimeType', md.mime_type,
               'width', md.largeur,
               'height', md.hauteur,
               'durationMs', md.duree_ms
             ) ORDER BY md.cree_le
           ) FILTER (WHERE md.id IS NOT NULL),
           '[]'
         ) AS medias
       FROM message m
       LEFT JOIN media md ON md.message_id = m.id
       LEFT JOIN statut_lecture sl
         ON sl.message_id = m.id AND sl.utilisateur_id <> m.expediteur_id
       WHERE m.conversation_id = $1
         AND ($2::timestamptz IS NULL OR m.envoye_le < $2::timestamptz)
       GROUP BY m.id, sl.lu_le, sl.remis_le
       ORDER BY m.envoye_le DESC
       LIMIT $3`,
      [conversationId, avant, limite]
    );

    // On renvoie du plus ancien au plus récent (sens d'affichage)
    const messages = lignes.reverse().map((l) => versMessageApi(l, utilisateurId));

    res.json({ messages });
  } catch (err) {
    console.error("Erreur GET messages :", err);
    res.status(500).json({ erreur: "Erreur serveur" });
  }
});

// POST /messages/:conversationId
routeurMessages.post("/:conversationId", authRequise, async (req, res) => {
  const { conversationId } = req.params;
  const utilisateurId = req.utilisateur!.utilisateurId;
  const { contenu } = req.body ?? {};

  if (typeof contenu !== "string" || contenu.trim().length === 0) {
    return res.status(400).json({ erreur: "Message vide" });
  }

  try {
    const participants = await query<{ utilisateur_id: string }>(
      `SELECT utilisateur_id FROM participation WHERE conversation_id = $1`,
      [conversationId]
    );

    if (!participants.some((p) => p.utilisateur_id === utilisateurId)) {
      return res.status(403).json({ erreur: "Accès refusé à cette conversation" });
    }

    const message = await transaction(async (client) => {
      const { rows } = await client.query<LigneMessage>(
        `INSERT INTO message (conversation_id, expediteur_id, contenu)
         VALUES ($1, $2, $3)
         RETURNING id, conversation_id, expediteur_id, contenu,
                   envoye_le, edite_le, supprime`,
        [conversationId, utilisateurId, contenu.trim()]
      );

      const nouveau = rows[0];

      // Une ligne de statut par destinataire (donc pas pour l'expéditeur)
      const destinataires = participants.filter((p) => p.utilisateur_id !== utilisateurId);

      for (const dest of destinataires) {
        await client.query(
          `INSERT INTO statut_lecture (message_id, utilisateur_id)
           VALUES ($1, $2)`,
          [nouveau.id, dest.utilisateur_id]
        );
      }

      return nouveau;
    });

    res.status(201).json({
      message: versMessageApi({ ...message, medias: [], lu_le: null, remis_le: null }, utilisateurId),
    });
  } catch (err) {
    console.error("Erreur POST message :", err);
    res.status(500).json({ erreur: "Erreur serveur" });
  }
});

interface LigneConversation {
  id: string;
  titre: string | null;
  cree_le: Date;
  autre_utilisateur_id: string | null;
  autre_nom_affiche: string | null;
  autre_avatar_url: string | null;
  autre_derniere_connexion: Date | null;
}

routeurMessages.get("/conversations/mes", authRequise, async (req, res) => {
  try {
    const utilisateurId = req.utilisateur!.utilisateurId;

    const lignes = await query<LigneConversation>(
      `SELECT c.id, c.titre, c.cree_le,
              u.id AS autre_utilisateur_id,
              u.nom_affiche AS autre_nom_affiche,
              u.avatar_url AS autre_avatar_url,
              u.derniere_connexion AS autre_derniere_connexion
       FROM conversation c
       JOIN participation p
         ON p.conversation_id = c.id AND p.utilisateur_id = $1
       LEFT JOIN participation p_autre
         ON p_autre.conversation_id = c.id AND p_autre.utilisateur_id <> $1
       LEFT JOIN utilisateur u ON u.id = p_autre.utilisateur_id
       ORDER BY c.cree_le`,
      [utilisateurId]
    );

    const conversations = lignes.map((l) => ({
      id: l.id,
      titre: l.titre,
      cree_le: l.cree_le,
      autreUtilisateur: l.autre_utilisateur_id
        ? {
            id: l.autre_utilisateur_id,
            nomAffiche: l.autre_nom_affiche,
            avatarUrl: l.autre_avatar_url,
            derniereConnexion: l.autre_derniere_connexion
              ? l.autre_derniere_connexion.toISOString()
              : null,
          }
        : null,
    }));

    res.json({ conversations });
  } catch (err) {
    console.error("Erreur conversations :", err);
    res.status(500).json({ erreur: "Erreur serveur" });
  }
});