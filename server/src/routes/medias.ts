import { Router } from "express";
import multer from "multer";
import path from "node:path";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { authRequise } from "../auth/middleware.js";
import { stockage } from "../stockage/index.js";
import { cheminFichier } from "../stockage/disque.js";
import { verifierSignature } from "../stockage/signature.js";
import { genererVignette, lireDimensions } from "../stockage/vignette.js";

export const routeurMedias = Router();

const TAILLE_MAX = 50 * 1024 * 1024; // 50 Mo

const MIMES_AUTORISES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "video/mp4": "mp4",
  "video/quicktime": "mov",
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: TAILLE_MAX },
  fileFilter: (_req, file, cb) => {
    if (!MIMES_AUTORISES[file.mimetype]) {
      return cb(new Error(`Type non supporté : ${file.mimetype}`));
    }
    cb(null, true);
  },
});

// POST /medias/televerser — envoie le fichier, retourne sa clé
routeurMedias.post("/televerser", authRequise, upload.single("fichier"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ erreur: "Aucun fichier reçu" });
  }

  try {
    const extension = MIMES_AUTORISES[req.file.mimetype];

    const cleObjet = await stockage.televerser({
      buffer: req.file.buffer,
      mimeType: req.file.mimetype,
      extension,
    });

    // Vignette pour l'affichage en liste
    let cleVignette: string | null = null;
    const vignette = await genererVignette(req.file.buffer, req.file.mimetype);

    if (vignette) {
      cleVignette = await stockage.televerser({
        buffer: vignette.buffer,
        mimeType: "image/jpeg",
        extension: "jpg",
      });
    }

    // Dimensions réelles, plus fiables que celles envoyées par le client
    const dimensions = await lireDimensions(req.file.buffer);

    res.status(201).json({
      cleObjet,
      cleVignette,
      mimeType: req.file.mimetype,
      tailleOctets: req.file.size,
      largeur: dimensions?.largeur,
      hauteur: dimensions?.hauteur,
    });
  } catch (err) {
    console.error("Erreur téléversement :", err);
    res.status(500).json({ erreur: "Échec du téléversement" });
  }
});

// GET /medias/medias/... ?expire=...&signature=...
routeurMedias.get(/^\/(medias\/.+)$/, async (req, res) => {
  const cleObjet = req.params[0];

  if (cleObjet.includes("..")) {
    return res.status(400).json({ erreur: "Chemin invalide" });
  }

  if (!verifierSignature(cleObjet, req.query.expire, req.query.signature)) {
    return res.status(403).json({ erreur: "Lien invalide ou expiré" });
  }

  try {
    const chemin = cheminFichier(cleObjet);
    const infos = await stat(chemin);

    res.setHeader("Content-Length", infos.size);
    res.setHeader("Cache-Control", "private, max-age=3600");
    createReadStream(chemin).pipe(res);
  } catch (err) {
    res.status(404).json({ erreur: "Fichier introuvable" });
  }
});