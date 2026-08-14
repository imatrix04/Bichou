import { randomUUID } from "node:crypto";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import type { Stockage, FichierATeleverser } from "./types.js";

const DOSSIER_BASE = path.resolve(process.cwd(), "uploads");

export class StockageDisque implements Stockage {
  async televerser(fichier: FichierATeleverser): Promise<string> {
    const maintenant = new Date();
    const annee = maintenant.getFullYear();
    const mois = String(maintenant.getMonth() + 1).padStart(2, "0");

    // Même structure de clé que ce qu'on aurait sur S3/Minio
    const cleObjet = `medias/${annee}/${mois}/${randomUUID()}.${fichier.extension}`;
    const cheminComplet = path.join(DOSSIER_BASE, cleObjet);

    await mkdir(path.dirname(cheminComplet), { recursive: true });
    await writeFile(cheminComplet, fichier.buffer);

    return cleObjet;
  }

  async obtenirUrl(cleObjet: string): Promise<string> {
    // En disque, l'URL passe par notre propre route protégée par JWT.
    // Avec Minio ce sera une URL signée pointant directement sur le bucket.
    return `/medias/${cleObjet}`;
  }

  async supprimer(cleObjet: string): Promise<void> {
    const cheminComplet = path.join(DOSSIER_BASE, cleObjet);
    await unlink(cheminComplet).catch(() => {
      // Fichier déjà absent : pas d'erreur
    });
  }
}

export const cheminFichier = (cleObjet: string) => path.join(DOSSIER_BASE, cleObjet);