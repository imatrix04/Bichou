import type { ChatMessage } from "../types/chat";

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
  avant?: string
): Promise<ChatMessage[]> {
  const url = new URL(`${BASE_URL}/messages/${conversationId}`);
  if (avant) url.searchParams.set("avant", avant);

  const reponse = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!reponse.ok) {
    throw new ApiError("Impossible de charger les messages", reponse.status);
  }

  const donnees = await reponse.json();
  return donnees.messages;
}