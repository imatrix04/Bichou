// screens/AuthScreen.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../contexts/AuthContext";
import { useAppTheme } from "../hooks/useAppTheme";

export default function AuthScreen() {
  const { colors } = useAppTheme();
  const { seConnecter, sInscrire } = useAuth();

  const [modeInscription, setModeInscription] = useState(false);
  const [login, setLogin] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [nomAffiche, setNomAffiche] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  const valider = async () => {
    setErreur(null);
    setEnCours(true);
    try {
      if (modeInscription) {
        await sInscrire(login, motDePasse, nomAffiche);
      } else {
        await seConnecter(login, motDePasse);
      }
    } catch (err: any) {
      setErreur(err.message ?? "Une erreur est survenue");
    } finally {
      setEnCours(false);
    }
  };

  const champsRemplis = modeInscription
    ? login.trim() && motDePasse && nomAffiche.trim()
    : login.trim() && motDePasse;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.contenu}>
          <Text style={[styles.titre, { color: colors.text }]}>Bichou</Text>
          <Text style={[styles.sousTitre, { color: colors.textSecondary }]}>
            {modeInscription ? "Créer un compte" : "Se connecter"}
          </Text>

          {modeInscription && (
            <TextInput
              style={[styles.champ, { backgroundColor: colors.inputBackground, color: colors.text }]}
              placeholder="Nom affiché"
              placeholderTextColor={colors.textSecondary}
              value={nomAffiche}
              onChangeText={setNomAffiche}
              autoCapitalize="words"
            />
          )}

          <TextInput
            style={[styles.champ, { backgroundColor: colors.inputBackground, color: colors.text }]}
            placeholder="Identifiant"
            placeholderTextColor={colors.textSecondary}
            value={login}
            onChangeText={setLogin}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <TextInput
            style={[styles.champ, { backgroundColor: colors.inputBackground, color: colors.text }]}
            placeholder="Mot de passe"
            placeholderTextColor={colors.textSecondary}
            value={motDePasse}
            onChangeText={setMotDePasse}
            secureTextEntry
            autoCapitalize="none"
          />

          {erreur && (
            <Text style={[styles.erreur, { color: colors.statusFailed }]}>{erreur}</Text>
          )}

          <TouchableOpacity
            style={[
              styles.bouton,
              { backgroundColor: champsRemplis && !enCours ? colors.accent : colors.accentMuted },
            ]}
            onPress={valider}
            disabled={!champsRemplis || enCours}
          >
            {enCours ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.boutonTexte}>
                {modeInscription ? "Créer mon compte" : "Se connecter"}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.bascule}
            onPress={() => {
              setModeInscription((prev) => !prev);
              setErreur(null);
            }}
          >
            <Text style={[styles.basculeTexte, { color: colors.accent }]}>
              {modeInscription
                ? "J'ai déjà un compte"
                : "Créer un compte"}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  contenu: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  titre: {
    fontSize: 34,
    fontWeight: "600",
    textAlign: "center",
  },
  sousTitre: {
    fontSize: 15,
    textAlign: "center",
    marginTop: 6,
    marginBottom: 32,
  },
  champ: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    marginBottom: 12,
  },
  erreur: {
    fontSize: 13,
    marginBottom: 12,
    textAlign: "center",
  },
  bouton: {
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 8,
    minHeight: 50,
    justifyContent: "center",
  },
  boutonTexte: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
  bascule: {
    marginTop: 20,
    alignItems: "center",
  },
  basculeTexte: {
    fontSize: 14,
  },
});