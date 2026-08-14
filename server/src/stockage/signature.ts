import { createHmac } from "node:crypto";
import { config } from "../config.js";

const DUREE_VALIDITE_MS = 60 * 60 * 1000; // 1 heure

/** Calcule la signature d'une clé d'objet pour une date d'expiration donnée */
function calculerSignature(cleObjet: string, expiration: number): string {
  return createHmac("sha256", config.jwtSecret)
    .update(`${cleObjet}:${expiration}`)
    .digest("hex");
}

/** Retourne les paramètres de requête à ajouter à l'URL */
export function signerCle(cleObjet: string): { expire: number; signature: string } {
  const expire = Date.now() + DUREE_VALIDITE_MS;
  return { expire, signature: calculerSignature(cleObjet, expire) };
}

/** Vérifie qu'une signature est valide et non expirée */
export function verifierSignature(
  cleObjet: string,
  expire: unknown,
  signature: unknown
): boolean {
  if (typeof signature !== "string") return false;

  const expiration = Number(expire);
  if (!Number.isFinite(expiration) || expiration < Date.now()) return false;

  const attendue = calculerSignature(cleObjet, expiration);

  // Comparaison à temps constant pour éviter les attaques temporelles
  if (attendue.length !== signature.length) return false;

  let difference = 0;
  for (let i = 0; i < attendue.length; i++) {
    difference |= attendue.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return difference === 0;
}