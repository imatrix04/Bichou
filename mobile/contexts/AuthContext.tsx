// contexts/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { Platform } from "react-native";
import {
  connexion as apiConnexion,
  inscription as apiInscription,
  recupererProfil,
  type UtilisateurApi,
} from "../services/api";
import { lire, ecrire, supprimer } from "../utils/stockageSecurise";
import { enregistrerPourNotifications } from "../services/notifications";
import { enregistrerAppareil } from "../services/api";

const CLE_TOKEN = "bichou_token";

interface AuthContextValeur {
  utilisateur: UtilisateurApi | null;
  token: string | null;
  chargement: boolean;
  seConnecter: (login: string, motDePasse: string) => Promise<void>;
  sInscrire: (login: string, motDePasse: string, nomAffiche: string) => Promise<void>;
  seDeconnecter: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValeur | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [utilisateur, setUtilisateur] = useState<UtilisateurApi | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [chargement, setChargement] = useState(true);

  // Au démarrage : on relit le token stocké et on vérifie qu'il est encore valide
  useEffect(() => {
    (async () => {
      try {
        const tokenStocke = await lire(CLE_TOKEN);
        if (!tokenStocke) return;

        const profil = await recupererProfil(tokenStocke);
        setToken(tokenStocke);
        setUtilisateur(profil);
        synchroniserPushToken(tokenStocke);
      } catch {
        // Token expiré ou serveur injoignable : on repart sur l'écran de connexion
        await supprimer(CLE_TOKEN);
      } finally {
        setChargement(false);
      }
    })();
  }, []);

  const seConnecter = useCallback(async (login: string, motDePasse: string) => {
    const { token: nouveauToken, utilisateur: profil } = await apiConnexion(login, motDePasse);
    await ecrire(CLE_TOKEN, nouveauToken);
    setToken(nouveauToken);
    setUtilisateur(profil);
    synchroniserPushToken(nouveauToken);
  }, []);

  const sInscrire = useCallback(
    async (login: string, motDePasse: string, nomAffiche: string) => {
      const { token: nouveauToken, utilisateur: profil } = await apiInscription(
        login,
        motDePasse,
        nomAffiche
      );
      await ecrire(CLE_TOKEN, nouveauToken);
      setToken(nouveauToken);
      setUtilisateur(profil);
      synchroniserPushToken(nouveauToken);
    },
    []
  );

  const seDeconnecter = useCallback(async () => {
    await supprimer(CLE_TOKEN);
    setToken(null);
    setUtilisateur(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ utilisateur, token, chargement, seConnecter, sInscrire, seDeconnecter }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const contexte = useContext(AuthContext);
  if (!contexte) {
    throw new Error("useAuth doit être utilisé dans un AuthProvider");
  }
  return contexte;
}

async function synchroniserPushToken(token: string) {
  try {
    const tokenPush = await enregistrerPourNotifications();
    if (tokenPush) {
      await enregistrerAppareil(token, tokenPush, Platform.OS);
    }
  } catch (err) {
    console.error("Erreur enregistrement push :", err);
  }
}