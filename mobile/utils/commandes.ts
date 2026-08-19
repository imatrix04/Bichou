export const PREFIXE_COMMANDE = "/";

export type CommandeId = "important";

interface MessageParse {
  commande: CommandeId | null;
  contenu: string;
}

const COMMANDES_CONNUES: Record<string, CommandeId> = {
  important: "important",
};

/**
 * Extrait une éventuelle commande "/xxx" en tête de message.
 * "/important on part au ski" -> { commande: "important", contenu: "on part au ski" }
 * "/inconnue test"            -> { commande: null, contenu: "/inconnue test" } (inchangé)
 * "texte normal"              -> { commande: null, contenu: "texte normal" }
 */
export function parserCommande(texte: string): MessageParse {
  if (!texte.startsWith(PREFIXE_COMMANDE)) {
    return { commande: null, contenu: texte };
  }

  const finMot = texte.indexOf(" ");
  const mot = (finMot === -1 ? texte.slice(1) : texte.slice(1, finMot)).toLowerCase();
  const reste = finMot === -1 ? "" : texte.slice(finMot + 1).trim();

  const commande = COMMANDES_CONNUES[mot];
  if (!commande) {
    return { commande: null, contenu: texte };
  }

  return { commande, contenu: reste };
}