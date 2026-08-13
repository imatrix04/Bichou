// contexts/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import * as SecureStore from "expo-secure-store";
import {
  connexion as apiConnexion,
  inscription as apiInscription,
  recupererProfil,
  type UtilisateurApi,
} from "../services/api";

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
        const tokenStocke = await SecureStore.getItemAsync(CLE_TOKEN);
        if (!tokenStocke) return;

        const profil = await recupererProfil(tokenStocke);
        setToken(tokenStocke);
        setUtilisateur(profil);
      } catch {
        // Token expiré ou serveur injoignable : on repart sur l'écran de connexion
        await SecureStore.deleteItemAsync(CLE_TOKEN);
      } finally {
        setChargement(false);
      }
    })();
  }, []);

  const seConnecter = useCallback(async (login: string, motDePasse: string) => {
    const { token: nouveauToken, utilisateur: profil } = await apiConnexion(login, motDePasse);
    await SecureStore.setItemAsync(CLE_TOKEN, nouveauToken);
    setToken(nouveauToken);
    setUtilisateur(profil);
  }, []);

  const sInscrire = useCallback(
    async (login: string, motDePasse: string, nomAffiche: string) => {
      const { token: nouveauToken, utilisateur: profil } = await apiInscription(
        login,
        motDePasse,
        nomAffiche
      );
      await SecureStore.setItemAsync(CLE_TOKEN, nouveauToken);
      setToken(nouveauToken);
      setUtilisateur(profil);
    },
    []
  );

  const seDeconnecter = useCallback(async () => {
    await SecureStore.deleteItemAsync(CLE_TOKEN);
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