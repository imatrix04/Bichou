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