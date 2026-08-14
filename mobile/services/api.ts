import { Platform } from "react-native";
import type { ChatMessage } from "../types/chat";
import * as FileSystem from "expo-file-system/legacy";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL;

if (!BASE_URL) {
  throw new Error(
    "EXPO_PUBLIC_API_URL manquante — vérifie ton fichier .env à la racine de mobile/"
  );
}

export interface UtilisateurApi {
  id: string;
  login: string;
  nomAffiche: string;
  avatarUrl: string | null;
}

interface ReponseAuth {
  token: string;
  utilisateur: UtilisateurApi;
}

export interface ConversationApi {
  id: string;
  titre: string | null;
  cree_le: string;
}

export interface MediaTeleverse {
  cleObjet: string;
  cleVignette: string | null;
  mimeType: string;
  tailleOctets: number;
  largeur?: number;
  hauteur?: number;
}

export class ApiError extends Error {
  constructor(message: string, public statut: number) {
    super(message);
  }
}

async function post<T>(chemin: string, corps: unknown, token?: string): Promise<T> {
  const reponse = await fetch(`${BASE_URL}${chemin}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(corps),
  });

  const donnees = await reponse.json().catch(() => ({}));

  if (!reponse.ok) {
    throw new ApiError(donnees.erreur ?? "Erreur réseau", reponse.status);
  }

  return donnees as T;
}

export async function connexion(login: string, motDePasse: string): Promise<ReponseAuth> {
  return post<ReponseAuth>("/auth/login", { login, motDePasse });
}

export async function inscription(
  login: string,
  motDePasse: string,
  nomAffiche: string
): Promise<ReponseAuth> {
  return post<ReponseAuth>("/auth/register", { login, motDePasse, nomAffiche });
}

export async function recupererProfil(token: string): Promise<UtilisateurApi> {
  const reponse = await fetch(`${BASE_URL}/auth/moi`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!reponse.ok) {
    const donnees = await reponse.json().catch(() => ({}));
    throw new ApiError(donnees.erreur ?? "Session expirée", reponse.status);
  }

  return reponse.json();
}

export async function recupererConversations(token: string): Promise<ConversationApi[]> {
  const reponse = await fetch(`${BASE_URL}/messages/conversations/mes`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!reponse.ok) {
    throw new ApiError("Impossible de charger les conversations", reponse.status);
  }

  const donnees = await reponse.json();
  return donnees.conversations;
}

export async function recupererMessages(
  token: string,
  conversationId: string,
  avant?: string,
  limite = 20
): Promise<ChatMessage[]> {
  const url = new URL(`${BASE_URL}/messages/${conversationId}`);
  if (avant) url.searchParams.set("avant", avant);
  url.searchParams.set("limite", String(limite));

  const reponse = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!reponse.ok) {
    throw new ApiError("Impossible de charger les messages", reponse.status);
  }

  const donnees = await reponse.json();
  return donnees.messages;
}

export async function televerserMedia(
  token: string,
  uri: string,
  mimeType: string
): Promise<MediaTeleverse> {
  const extension = mimeType.split("/")[1] ?? "jpg";

  if (Platform.OS !== "web") {
    const resultat = await FileSystem.uploadAsync(
      `${BASE_URL}/medias/televerser`,
      uri,
      {
        httpMethod: "POST",
        uploadType: FileSystem.FileSystemUploadType.MULTIPART,
        fieldName: "fichier",
        mimeType,
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (resultat.status < 200 || resultat.status >= 300) {
      let message = "Échec du téléversement";
      try {
        message = JSON.parse(resultat.body).erreur ?? message;
      } catch {}
      throw new ApiError(message, resultat.status);
    }

    return JSON.parse(resultat.body);
  }

  const formData = new FormData();
  const blobReponse = await fetch(uri);
  const blob = await blobReponse.blob();
  formData.append("fichier", blob, `media.${extension}`);

  const reponse = await fetch(`${BASE_URL}/medias/televerser`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  if (!reponse.ok) {
    const donnees = await reponse.json().catch(() => ({}));
    throw new ApiError(donnees.erreur ?? "Échec du téléversement", reponse.status);
  }

  return reponse.json();
}

/** Construit l'URL complète d'un média à partir de sa clé */
export function urlComplete(chemin: string): string {
  return `${BASE_URL}${chemin}`;
}