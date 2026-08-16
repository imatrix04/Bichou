import { Router } from "express";
import { query } from "../db.js";
import { authRequise } from "../auth/middleware.js";

export const routeurAppareils = Router();

routeurAppareils.post("/", authRequise, async (req, res) => {
  const { tokenPush, plateforme } = req.body ?? {};
  const utilisateurId = req.utilisateur!.utilisateurId;

  if (typeof tokenPush !== "string" || typeof plateforme !== "string") {
    return res.status(400).json({ erreur: "tokenPush et plateforme requis" });
  }

  try {
    // token_push est UNIQUE : upsert au cas où l'appareil change de compte
    // (réinstallation, ou les deux comptes sur le même téléphone en dev)
    await query(
      `INSERT INTO appareil (utilisateur_id, token_push, plateforme, vu_le)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (token_push)
       DO UPDATE SET utilisateur_id = EXCLUDED.utilisateur_id, vu_le = NOW()`,
      [utilisateurId, tokenPush, plateforme]
    );

    res.status(204).end();
  } catch (err) {
    console.error("Erreur enregistrement token push :", err);
    res.status(500).json({ erreur: "Erreur serveur" });
  }
});