import { Router } from "express";
import { query, transaction } from "../db.js";
import { hasherMotDePasse, verifierMotDePasse } from "../auth/password.js";
import { genererToken } from "../auth/jwt.js";
import { authRequise } from "../auth/middleware.js";

export const routeurAuth = Router();

const NB_UTILISATEURS_MAX = 2;

interface LigneUtilisateur {
  id: string;
  login: string;
  mot_de_passe_hash: string;
  nom_affiche: string;
  avatar_url: string | null;
}

routeurAuth.post("/register", async (req, res) => {
  const { login, motDePasse, nomAffiche } = req.body ?? {};

  if (typeof login !== "string" || login.trim().length < 3) {
    return res.status(400).json({ erreur: "Login trop court (3 caractères minimum)" });
  }
  if (typeof motDePasse !== "string" || motDePasse.length < 8) {
    return res.status(400).json({ erreur: "Mot de passe trop court (8 caractères minimum)" });
  }
  if (typeof nomAffiche !== "string" || nomAffiche.trim().length === 0) {
    return res.status(400).json({ erreur: "Nom d'affichage requis" });
  }

  try {
    const [{ total }] = await query<{ total: string }>(
      "SELECT COUNT(*) AS total FROM utilisateur"
    );

    if (Number(total) >= NB_UTILISATEURS_MAX) {
      return res.status(403).json({ erreur: "Inscriptions fermées" });
    }

    const hash = await hasherMotDePasse(motDePasse);

    const utilisateur = await transaction(async (client) => {
      const { rows } = await client.query<LigneUtilisateur>(
        `INSERT INTO utilisateur (login, mot_de_passe_hash, nom_affiche)
         VALUES ($1, $2, $3)
         RETURNING id, login, nom_affiche, avatar_url`,
        [login.trim().toLowerCase(), hash, nomAffiche.trim()]
      );

      const nouveau = rows[0];

      // S'assure qu'une conversation existe (le premier inscrit la crée)
      const { rows: conversations } = await client.query<{ id: string }>(
        `SELECT id FROM conversation ORDER BY cree_le LIMIT 1`
      );

      let conversationId: string;

      if (conversations.length === 0) {
        const { rows: creee } = await client.query<{ id: string }>(
          `INSERT INTO conversation (titre) VALUES ($1) RETURNING id`,
          ["Nous deux"]
        );
        conversationId = creee[0].id;
      } else {
        conversationId = conversations[0].id;
      }

      // Rattache le nouvel utilisateur à cette conversation
      await client.query(
        `INSERT INTO participation (utilisateur_id, conversation_id)
         VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [nouveau.id, conversationId]
      );

      return nouveau;
    });

    const token = genererToken({
      utilisateurId: utilisateur.id,
      login: utilisateur.login,
    });

    res.status(201).json({
      token,
      utilisateur: {
        id: utilisateur.id,
        login: utilisateur.login,
        nomAffiche: utilisateur.nom_affiche,
        avatarUrl: utilisateur.avatar_url,
      },
    });
  } catch (err: any) {
    if (err?.code === "23505") {
      return res.status(409).json({ erreur: "Ce login est déjà pris" });
    }
    console.error("Erreur register :", err);
    res.status(500).json({ erreur: "Erreur serveur" });
  }
});

routeurAuth.post("/login", async (req, res) => {
  const { login, motDePasse } = req.body ?? {};

  if (typeof login !== "string" || typeof motDePasse !== "string") {
    return res.status(400).json({ erreur: "Login et mot de passe requis" });
  }

  try {
    const [utilisateur] = await query<LigneUtilisateur>(
      `SELECT id, login, mot_de_passe_hash, nom_affiche, avatar_url
       FROM utilisateur WHERE login = $1`,
      [login.trim().toLowerCase()]
    );

    // Message identique que le login existe ou non, pour ne pas révéler
    // quels comptes sont créés
    if (!utilisateur) {
      return res.status(401).json({ erreur: "Identifiants incorrects" });
    }

    const valide = await verifierMotDePasse(motDePasse, utilisateur.mot_de_passe_hash);

    if (!valide) {
      return res.status(401).json({ erreur: "Identifiants incorrects" });
    }

    const token = genererToken({
      utilisateurId: utilisateur.id,
      login: utilisateur.login,
    });

    res.json({
      token,
      utilisateur: {
        id: utilisateur.id,
        login: utilisateur.login,
        nomAffiche: utilisateur.nom_affiche,
        avatarUrl: utilisateur.avatar_url,
      },
    });
  } catch (err) {
    console.error("Erreur login :", err);
    res.status(500).json({ erreur: "Erreur serveur" });
  }
});

routeurAuth.get("/moi", authRequise, async (req, res) => {
  try {
    const [utilisateur] = await query<LigneUtilisateur>(
      `SELECT id, login, nom_affiche, avatar_url
       FROM utilisateur WHERE id = $1`,
      [req.utilisateur!.utilisateurId]
    );

    if (!utilisateur) {
      return res.status(404).json({ erreur: "Utilisateur introuvable" });
    }

    res.json({
      id: utilisateur.id,
      login: utilisateur.login,
      nomAffiche: utilisateur.nom_affiche,
      avatarUrl: utilisateur.avatar_url,
    });
  } catch (err) {
    console.error("Erreur /moi :", err);
    res.status(500).json({ erreur: "Erreur serveur" });
  }
});