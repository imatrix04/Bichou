import sharp from "sharp";

export const LARGEUR_VIGNETTE = 400;

export interface VignetteGeneree {
  buffer: Buffer;
  largeur: number;
  hauteur: number;
}

/** Crée une version réduite d'une image. Retourne null si ce n'est pas une image. */
export async function genererVignette(
  buffer: Buffer,
  mimeType: string
): Promise<VignetteGeneree | null> {
  if (!mimeType.startsWith("image/")) return null;

  try {
    const image = sharp(buffer).rotate(); // rotate() applique l'orientation EXIF

    const redimensionnee = image
      .resize(LARGEUR_VIGNETTE, null, { withoutEnlargement: true })
      .jpeg({ quality: 75, mozjpeg: true });

    const resultat = await redimensionnee.toBuffer({ resolveWithObject: true });

    return {
      buffer: resultat.data,
      largeur: resultat.info.width,
      hauteur: resultat.info.height,
    };
  } catch (err) {
    console.error("Échec génération vignette :", err);
    return null;
  }
}

/** Dimensions réelles de l'image d'origine */
export async function lireDimensions(
  buffer: Buffer
): Promise<{ largeur: number; hauteur: number } | null> {
  try {
    const meta = await sharp(buffer).rotate().metadata();
    if (!meta.width || !meta.height) return null;
    return { largeur: meta.width, hauteur: meta.height };
  } catch {
    return null;
  }
}   