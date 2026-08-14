import { signerCle } from "./signature.js";

/** Construit l'URL signée complète pour un média */
export function urlSignee(cleObjet: string): string {
  const { expire, signature } = signerCle(cleObjet);
  return `/medias/${cleObjet}?expire=${expire}&signature=${signature}`;
}