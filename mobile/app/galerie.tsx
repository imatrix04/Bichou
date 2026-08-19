// app/galerie.tsx
import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";

import { useAppTheme } from "../hooks/useAppTheme";
import { useGalerie } from "../hooks/useGalerie";
import { pickMultipleFromLibrary } from "../utils/mediaPicker";
import { ACCENTS, ACCENT_ACTIF } from "../theme/accents";
import { PhotoGalerieApi } from "../services/api";

const ROSE = ACCENTS[ACCENT_ACTIF];
const LARGEUR_ECRAN = Dimensions.get("window").width;
const COLONNES = 3;
const TAILLE_VIGNETTE = LARGEUR_ECRAN / COLONNES;

type ItemListe =
  | { type: "entete"; id: string; libelle: string }
  | { type: "photo"; id: string; photo: PhotoGalerieApi };

function formatDateEntete(iso: string): string {
  const date = new Date(iso);
  const aujourdhui = new Date();
  const hier = new Date();
  hier.setDate(hier.getDate() - 1);

  if (date.toDateString() === aujourdhui.toDateString()) return "Aujourd'hui";
  if (date.toDateString() === hier.toDateString()) return "Hier";
  return date.toLocaleDateString([], { day: "2-digit", month: "long", year: "numeric" });
}

function regrouperParDate(photos: PhotoGalerieApi[]): ItemListe[] {
  const items: ItemListe[] = [];
  let dernierGroupe: string | null = null;

  for (const photo of photos) {
    const libelle = formatDateEntete(photo.ajouteLe);
    if (libelle !== dernierGroupe) {
      items.push({ type: "entete", id: `entete-${photo.id}`, libelle });
      dernierGroupe = libelle;
    }
    items.push({ type: "photo", id: photo.id, photo });
  }

  return items;
}

export default function GalerieScreen() {
  const router = useRouter();
  const { colors, isDark } = useAppTheme();
  const { photos, chargement, chargementAncien, toutCharge, enEnvoi, chargerPlusAnciennes, ajouterPhotos } =
    useGalerie();

  const [photoOuverte, setPhotoOuverte] = useState<PhotoGalerieApi | null>(null);

  const items = useMemo(() => regrouperParDate(photos), [photos]);

  const handleAjouter = useCallback(async () => {
    const medias = await pickMultipleFromLibrary(20);
    if (medias.length > 0) {
      await ajouterPhotos(medias);
    }
  }, [ajouterPhotos]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: ROSE.gold }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color={ROSE.goldDeep} />
        </TouchableOpacity>
        <View style={styles.headerTitleRow}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Galerie</Text>
          <Ionicons name="heart" size={14} color={ROSE.gold} style={styles.headerHeart} />
        </View>
        <TouchableOpacity onPress={handleAjouter} disabled={enEnvoi} hitSlop={10}>
          {enEnvoi ? (
            <ActivityIndicator size="small" color={ROSE.goldDeep} />
          ) : (
            <Ionicons name="add-circle-outline" size={26} color={ROSE.goldDeep} />
          )}
        </TouchableOpacity>
      </View>

      {chargement ? (
        <View style={styles.centre}>
          <ActivityIndicator size="large" color={ROSE.gold} />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.centre}>
          <Ionicons name="images-outline" size={48} color={colors.textSecondary} />
          <Text style={[styles.videTexte, { color: colors.textSecondary }]}>
            Aucune photo pour l'instant
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          numColumns={COLONNES}
          onEndReached={chargerPlusAnciennes}
          onEndReachedThreshold={0.4}
          contentContainerStyle={styles.listContent}
          ListFooterComponent={
            chargementAncien ? (
              <View style={styles.chargementAncien}>
                <ActivityIndicator size="small" color={ROSE.gold} />
              </View>
            ) : null
          }
          renderItem={({ item }) => {
            if (item.type === "entete") {
              return (
                <View style={styles.enteteSection}>
                  <Text style={[styles.enteteTexte, { color: colors.textSecondary }]}>
                    {item.libelle}
                  </Text>
                </View>
              );
            }

            const source = item.photo.urlVignette ?? item.photo.url;

            return (
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => setPhotoOuverte(item.photo)}
                style={styles.vignetteWrapper}
              >
                <Image
                  source={{ uri: source }}
                  style={styles.vignette}
                  contentFit="cover"
                  cachePolicy="disk"
                  transition={150}
                />
              </TouchableOpacity>
            );
          }}
        />
      )}

      <Modal
        visible={photoOuverte !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setPhotoOuverte(null)}
      >
        <View style={styles.viewerBackdrop}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setPhotoOuverte(null)}
          />
          {photoOuverte && (
            <>
              <Image
                source={{ uri: photoOuverte.url }}
                style={styles.viewerImage}
                contentFit="contain"
                cachePolicy="disk"
              />
              <View style={styles.viewerInfo}>
                <Text style={styles.viewerInfoTexte}>
                  Ajoutée par {photoOuverte.ajouteParNom} ·{" "}
                  {new Date(photoOuverte.ajouteLe).toLocaleDateString([], {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  })}
                </Text>
              </View>
            </>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  headerTitleRow: { flexDirection: "row", alignItems: "center" },
  headerTitle: { fontSize: 17, fontWeight: "700" },
  headerHeart: { marginLeft: 5 },
  centre: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  videTexte: { fontSize: 14 },
  listContent: { paddingBottom: 20 },
  enteteSection: { width: "100%", paddingHorizontal: 12, paddingVertical: 8 },
  enteteTexte: { fontSize: 13, fontWeight: "700" },
  vignetteWrapper: { width: TAILLE_VIGNETTE, height: TAILLE_VIGNETTE, padding: 1.5 },
  vignette: { width: "100%", height: "100%", borderRadius: 4 },
  chargementAncien: { paddingVertical: 16 },
  viewerBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
    alignItems: "center",
    justifyContent: "center",
  },
  viewerImage: { width: "100%", height: "80%" },
  viewerInfo: { position: "absolute", bottom: 40, alignItems: "center" },
  viewerInfoTexte: { color: "#FFFFFF", fontSize: 13 },
});