import { Router } from "express";
import multer from "multer";
import { authRequise } from "../auth/middleware.js";
import { query } from "../db.js";
import { stockage } from "../stockage/index.js";
import { genererVignette, lireDimensions } from "../stockage/vignette.js";
import { urlSignee } from "../stockage/url.js";

export const routeurGalerie = Router();

const TAILLE_MAX = 50 * 1024 * 1024; // 50 Mo

const MIMES_AUTORISES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
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

interface LignePhoto {
  id: string;
  cle_objet: string;
  cle_vignette: string | null;
  mime_type: string;
  largeur: number | null;
  hauteur: number | null;
  ajoute_par: string;
  ajoute_le: Date;
  nom_affiche: string;
}

function versPhotoApi(ligne: LignePhoto) {
  return {
    id: ligne.id,
    url: urlSignee(ligne.cle_objet),
    urlVignette: ligne.cle_vignette ? urlSignee(ligne.cle_vignette) : undefined,
    mimeType: ligne.mime_type,
    width: ligne.largeur ?? undefined,
    height: ligne.hauteur ?? undefined,
    ajoutePar: ligne.ajoute_par,
    ajouteParNom: ligne.nom_affiche,
    ajouteLe: ligne.ajoute_le.toISOString(),
  };
}

// GET /galerie?avant=<iso>&limite=40
routeurGalerie.get("/", authRequise, async (req, res) => {
  const limite = Math.min(Number(req.query.limite) || 40, 100);
  const avant = typeof req.query.avant === "string" ? req.query.avant : null;

  try {
    const lignes = await query<LignePhoto>(
      `SELECT g.*, u.nom_affiche
       FROM photo_galerie g
       JOIN utilisateur u ON u.id = g.ajoute_par
       WHERE ($1::timestamptz IS NULL OR g.ajoute_le < $1)
       ORDER BY g.ajoute_le DESC
       LIMIT $2`,
      [avant, limite]
    );

    res.json({ photos: lignes.map(versPhotoApi) });
  } catch (err) {
    console.error("Erreur récupération galerie :", err);
    res.status(500).json({ erreur: "Échec de la récupération" });
  }
});

// POST /galerie — upload direct d'une photo dans la galerie
routeurGalerie.post("/", authRequise, upload.single("fichier"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ erreur: "Aucun fichier reçu" });
  }

  const utilisateurId = req.utilisateur!.utilisateurId;

  try {
    const extension = MIMES_AUTORISES[req.file.mimetype];

    const cleObjet = await stockage.televerser({
      buffer: req.file.buffer,
      mimeType: req.file.mimetype,
      extension,
    });

    let cleVignette: string | null = null;
    const vignette = await genererVignette(req.file.buffer, req.file.mimetype);
    if (vignette) {
      cleVignette = await stockage.televerser({
        buffer: vignette.buffer,
        mimeType: "image/jpeg",
        extension: "jpg",
      });
    }

    const dimensions = await lireDimensions(req.file.buffer);

    const [ligne] = await query<LignePhoto>(
      `INSERT INTO photo_galerie (cle_objet, cle_vignette, mime_type, taille_octets, largeur, hauteur, ajoute_par)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *, (SELECT nom_affiche FROM utilisateur WHERE id = $7) AS nom_affiche`,
      [
        cleObjet,
        cleVignette,
        req.file.mimetype,
        req.file.size,
        dimensions?.largeur,
        dimensions?.hauteur,
        utilisateurId,
      ]
    );

    res.status(201).json(versPhotoApi(ligne));
  } catch (err) {
    console.error("Erreur ajout photo galerie :", err);
    res.status(500).json({ erreur: "Échec de l'ajout" });
  }
});

export default routeurGalerie;