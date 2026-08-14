// utils/stockageSecurise.ts
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

// Sur web, SecureStore n'existe pas : on retombe sur localStorage.
// Moins sûr, mais le web n'est qu'un environnement de développement ici.
export async function lire(cle: string): Promise<string | null> {
  if (Platform.OS === "web") {
    return localStorage.getItem(cle);
  }
  return SecureStore.getItemAsync(cle);
}

export async function ecrire(cle: string, valeur: string): Promise<void> {
  if (Platform.OS === "web") {
    localStorage.setItem(cle, valeur);
    return;
  }
  await SecureStore.setItemAsync(cle, valeur);
}

export async function supprimer(cle: string): Promise<void> {
  if (Platform.OS === "web") {
    localStorage.removeItem(cle);
    return;
  }
  await SecureStore.deleteItemAsync(cle);
}