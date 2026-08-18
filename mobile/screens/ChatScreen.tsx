// screens/ChatScreen.tsx
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  FlatList,
  TextInput,
  TouchableOpacity,
  Text,
  Modal,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";

import { useAuth } from "../contexts/AuthContext";
import { useChat } from "../hooks/useChat";
import { useAppTheme } from "../hooks/useAppTheme";
import MessageBubble from "../components/MessageBubble";
import { ChatMessage, MediaAttachment } from "../types/chat";
import { pickFromCamera, pickFromLibrary } from "../utils/mediaPicker";
import { urlComplete } from "../services/api";

// Palette romantique rose poudré / rose gold — pensée comme un accent
// posé par-dessus le thème clair/sombre existant (colors.*), pas en
// remplacement des couleurs fonctionnelles (fond, texte).
// Si tu veux la rendre réutilisable ailleurs, ça peut migrer dans
// useAppTheme.ts plus tard.
const ROSE = {
  blush: "#F7E1E4", // rose très clair, pour les puces/chips
  blushDark: "#3A2C30", // équivalent sombre du blush pour le dark mode
  petal: "#F2C6CC", // rose doux, bordures
  gold: "#C08A94", // rose gold principal
  goldDeep: "#9C5B66", // rose gold plus soutenu (texte, icônes actives)
};

export default function ChatScreen() {
  const { colors, isDark } = useAppTheme();
  const { utilisateur, seDeconnecter } = useAuth();
  const {
    messages, chargement, chargementAncien, toutCharge, connecte, autreUtilisateur, autreEnLigne, enTrainDEcrire,
    envoyerMessage, marquerCommeLus, signalerFrappe, chargerPlusAnciens,
  } = useChat();


  function formatDerniereConnexion(iso: string): string {
    const date = new Date(iso);
    const maintenant = new Date();
    const memejour = date.toDateString() === maintenant.toDateString();
    const heure = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    if (memejour) return `vue à ${heure}`;
    return `vue le ${date.toLocaleDateString([], { day: "2-digit", month: "2-digit" })} à ${heure}`;
  }

  const nomEnTete = autreUtilisateur?.nomAffiche ?? "Bichou";

  const [draft, setDraft] = useState("");
  const [pendingMedia, setPendingMedia] = useState<MediaAttachment | null>(null);
  const [viewerMedia, setViewerMedia] = useState<{ uri: string; width?: number; height?: number } | null>(null);
  const [showAttachOptions, setShowAttachOptions] = useState(false);
  const listRef = useRef<FlatList<ChatMessage>>(null);

  const chipBackground = isDark ? ROSE.blushDark : ROSE.blush;

  useEffect(() => {
    if (!chargement) marquerCommeLus();
  }, [chargement, connecte, messages.length, marquerCommeLus]);

  const dernierIdEnTeteRef = useRef<string | null>(null);
  useEffect(() => {
    const idEnTete = messages[0]?.id ?? null;
    if (idEnTete && idEnTete !== dernierIdEnTeteRef.current) {
      const premierRendu = dernierIdEnTeteRef.current === null;
      dernierIdEnTeteRef.current = idEnTete;
      listRef.current?.scrollToOffset({ offset: 0, animated: !premierRendu });
    }
  }, [messages]);

  const toggleAttachOptions = useCallback(() => {
    setShowAttachOptions((prev) => !prev);
  }, []);

  const handlePickCamera = useCallback(async () => {
    setShowAttachOptions(false);
    const media = await pickFromCamera();
    if (media) setPendingMedia(media);
  }, []);

  const handlePickLibrary = useCallback(async () => {
    setShowAttachOptions(false);
    const media = await pickFromLibrary();
    if (media) setPendingMedia(media);
  }, []);

  const handleSend = useCallback(() => {
      const trimmedText = draft.trim();
      if (!trimmedText && !pendingMedia) return;

      envoyerMessage(trimmedText, pendingMedia ?? undefined);
      setDraft("");
      setPendingMedia(null);
    }, [draft, pendingMedia, envoyerMessage]);

  const canSend = draft.trim().length > 0 || pendingMedia !== null;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: ROSE.gold }]}>
        <View style={styles.headerTitleRow}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{nomEnTete}</Text>
          <Ionicons name="heart" size={14} color={ROSE.gold} style={styles.headerHeart} />
          {!autreEnLigne && (
            <Text style={[styles.headerStatus, { color: colors.textSecondary }]}>
              {autreUtilisateur?.derniereConnexion
                ? formatDerniereConnexion(autreUtilisateur.derniereConnexion)
                : "hors ligne"}
            </Text>
          )}
        </View>
        <TouchableOpacity onPress={seDeconnecter}>
          <Ionicons name="log-out-outline" size={22} color={ROSE.goldDeep} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        {chargement ? (
          <View style={styles.centre}>
            <ActivityIndicator size="large" color={ROSE.gold} />
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <MessageBubble
                message={item}
                isOwnMessage={item.senderId === utilisateur?.id}
                onMediaPress={(uri) => {
                  const media = item.media?.find(
                    (m) => (m.url ? urlComplete(m.url) : m.uri) === uri
                  );
                  setViewerMedia({ uri, width: media?.width, height: media?.height });
                }}
              />
            )}
            contentContainerStyle={styles.listContent}
            inverted
            onEndReached={chargerPlusAnciens}
            onEndReachedThreshold={0.3}
            ListFooterComponent={
              chargementAncien ? (
                <View style={styles.chargementAncien}>
                  <ActivityIndicator size="small" color={ROSE.gold} />
                </View>
              ) : null
            }
            maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
          />
        )}

        {enTrainDEcrire && (
          <View style={styles.frappeRow}>
            <Ionicons name="heart" size={11} color={ROSE.goldDeep} style={styles.frappeHeart} />
            <Text style={[styles.frappeTexte, { color: ROSE.goldDeep }]}>
              en train d'écrire…
            </Text>
          </View>
        )}

        {showAttachOptions && (
          <View style={styles.attachOptionsRow}>
            <TouchableOpacity
              style={[styles.attachOptionButton, { backgroundColor: chipBackground }]}
              onPress={handlePickCamera}
            >
              <Ionicons name="camera-outline" size={20} color={ROSE.goldDeep} />
              <Text style={[styles.attachOptionLabel, { color: colors.text }]}>Appareil photo</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.attachOptionButton, { backgroundColor: chipBackground }]}
              onPress={handlePickLibrary}
            >
              <Ionicons name="image-outline" size={20} color={ROSE.goldDeep} />
              <Text style={[styles.attachOptionLabel, { color: colors.text }]}>Galerie</Text>
            </TouchableOpacity>
          </View>
        )}

        {pendingMedia && (
          <View style={styles.previewRow}>
            <Image source={{ uri: pendingMedia.uri }} style={[styles.previewThumb, { borderColor: ROSE.petal }]} />
            <TouchableOpacity
              style={[styles.previewRemove, { backgroundColor: chipBackground }]}
              onPress={() => setPendingMedia(null)}
            >
              <Text style={[styles.previewRemoveText, { color: ROSE.goldDeep }]}>✕</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={[styles.inputBar, { backgroundColor: colors.background }]}>
          <View style={[styles.inputCard, { backgroundColor: colors.inputBackground, shadowColor: ROSE.goldDeep }]}>
            <TouchableOpacity
              style={[styles.attachButton, { backgroundColor: chipBackground }]}
              onPress={toggleAttachOptions}
            >
              <Ionicons
                name={showAttachOptions ? "close" : "add"}
                size={20}
                color={ROSE.goldDeep}
              />
            </TouchableOpacity>

            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="Écrire un mot doux…"
              placeholderTextColor={colors.textSecondary}
              value={draft}
              onChangeText={(texte) => {
                setDraft(texte);
                signalerFrappe();
              }}
              multiline
              blurOnSubmit={false}
              returnKeyType="send"
              onSubmitEditing={handleSend}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                { backgroundColor: canSend ? ROSE.gold : chipBackground },
              ]}
              onPress={handleSend}
              disabled={!canSend}
            >
              <Ionicons
                name="heart"
                size={17}
                color={canSend ? "#FFFFFF" : ROSE.goldDeep}
              />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      <Modal
        visible={viewerMedia !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setViewerMedia(null)}
      >
        <TouchableOpacity
          style={styles.viewerBackdrop}
          activeOpacity={1}
          onPress={() => setViewerMedia(null)}
        >
          {viewerMedia && (
            <View
              style={[
                styles.viewerImageWrapper,
                {
                  aspectRatio:
                    viewerMedia.width && viewerMedia.height
                      ? viewerMedia.width / viewerMedia.height
                      : 1,
                },
              ]}
            >
              <Image
                source={{ uri: viewerMedia.uri }}
                style={styles.viewerImage}
                contentFit="cover"
                cachePolicy="disk"
              />
            </View>
          )}
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  centre: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderBottomWidth: 1.5,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  headerHeart: {
    marginLeft: 6,
  },
  headerStatus: {
    marginLeft: 8,
    fontSize: 12,
    fontStyle: "italic",
  },
  listContent: {
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  previewRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  chargementAncien: {
    paddingVertical: 12,
    alignItems: "center",
  },
  previewThumb: {
    width: 64,
    height: 64,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  previewRemove: {
    marginLeft: 10,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  previewRemoveText: {
    fontSize: 13,
  },
  inputBar: {
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: 10,
  },
  inputCard: {
    flexDirection: "row",
    alignItems: "flex-end",
    borderRadius: 26,
    paddingHorizontal: 8,
    paddingVertical: 6,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 3,
  },
  attachButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 6,
  },
  input: {
    flex: 1,
    maxHeight: 100,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 15,
    marginRight: 6,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  frappeRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 4,
  },
  frappeHeart: {
    marginRight: 5,
  },
  frappeTexte: {
    fontSize: 12,
    fontStyle: "italic",
  },
  attachOptionsRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingTop: 10,
    gap: 10,
  },
  attachOptionButton: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
    gap: 6,
  },
  attachOptionLabel: {
    fontSize: 13,
    fontWeight: "500",
  },
  viewerBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  viewerImageWrapper: {
    width: "92%",
    maxHeight: "80%",
    borderRadius: 20,
    overflow: "hidden",
    alignSelf: "center",
  },
  viewerImage: {
    width: "100%",
    height: "100%",
  },
});