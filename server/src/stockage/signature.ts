import { createHmac } from "node:crypto";
import { config } from "../config.js";

// Les URL sont valides pendant une fenêtre alignée sur des tranches fixes.
// Deux appels dans la même tranche produisent la MÊME url, ce qui permet
// au cache disque du client de fonctionner.
const TAILLE_FENETRE_MS = 24 * 60 * 60 * 1000; // 1 jour
const NB_FENETRES_VALIDITE = 3; // l'url reste valable ~3 jours

function calculerSignature(cleObjet: string, expiration: number): string {
  return createHmac("sha256", config.jwtSecret)
    .update(`${cleObjet}:${expiration}`)
    .digest("hex");
}

/** Expiration alignée sur la tranche courante : stable pendant 24h */
function expirationStable(): number {
  const fenetreCourante = Math.floor(Date.now() / TAILLE_FENETRE_MS);
  return (fenetreCourante + NB_FENETRES_VALIDITE) * TAILLE_FENETRE_MS;
}

export function signerCle(cleObjet: string): { expire: number; signature: string } {
  const expire = expirationStable();
  return { expire, signature: calculerSignature(cleObjet, expire) };
}

export function verifierSignature(
  cleObjet: string,
  expire: unknown,
  signature: unknown
): boolean {
  if (typeof signature !== "string") return false;

  const expiration = Number(expire);
  if (!Number.isFinite(expiration) || expiration < Date.now()) return false;

  const attendue = calculerSignature(cleObjet, expiration);
  if (attendue.length !== signature.length) return false;

  let difference = 0;
  for (let i = 0; i < attendue.length; i++) {
    difference |= attendue.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return difference === 0;
}