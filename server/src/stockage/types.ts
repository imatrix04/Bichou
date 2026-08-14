export interface FichierATeleverser {
  buffer: Buffer;
  mimeType: string;
  extension: string;
}

export interface Stockage {
  /** Dépose un fichier et retourne sa clé d'objet */
  televerser(fichier: FichierATeleverser): Promise<string>;

  /** Retourne une URL permettant d'accéder au fichier */
  obtenirUrl(cleObjet: string): Promise<string>;

  /** Supprime un fichier */
  supprimer(cleObjet: string): Promise<void>;
}