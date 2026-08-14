// screens/ChatScreen.tsx
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  FlatList,
  TextInput,
  TouchableOpacity,
  Text,
  Image,
  Modal,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "../contexts/AuthContext";
import { useChat } from "../hooks/useChat";
import { useAppTheme } from "../hooks/useAppTheme";
import MessageBubble from "../components/MessageBubble";
import { ChatMessage, MediaAttachment } from "../types/chat";
import { pickFromCamera, pickFromLibrary } from "../utils/mediaPicker";

export default function ChatScreen() {
  const { colors } = useAppTheme();
  const { utilisateur, seDeconnecter } = useAuth();
  const { messages, chargement, connecte, envoyerMessage, marquerCommeLus } = useChat();

  const [draft, setDraft] = useState("");
  const [pendingMedia, setPendingMedia] = useState<MediaAttachment | null>(null);
  const [viewerMedia, setViewerMedia] = useState<{ uri: string; width?: number; height?: number } | null>(null);
  const [showAttachOptions, setShowAttachOptions] = useState(false);
  const listRef = useRef<FlatList<ChatMessage>>(null);

  useEffect(() => {
    if (!chargement) marquerCommeLus();
  }, [chargement, messages.length, marquerCommeLus]);

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
    if (!trimmedText) return;

    envoyerMessage(trimmedText);
    setDraft("");
    setPendingMedia(null);

    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: true });
    });
  }, [draft, envoyerMessage]);

  const canSend = draft.trim().length > 0;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.headerBorder }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Bichou{connecte ? "" : " (hors ligne)"}
        </Text>
        <TouchableOpacity onPress={seDeconnecter}>
          <Ionicons name="log-out-outline" size={22} color={colors.accent} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        {chargement ? (
          <View style={styles.centre}>
            <ActivityIndicator size="large" color={colors.accent} />
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
                  const media = item.media?.find((m) => m.uri === uri);
                  setViewerMedia({ uri, width: media?.width, height: media?.height });
                }}
              />
            )}
            contentContainerStyle={styles.listContent}
            onContentSizeChange={() =>
              listRef.current?.scrollToEnd({ animated: false })
            }
          />
        )}

        {showAttachOptions && (
          <View style={styles.attachOptionsRow}>
            <TouchableOpacity
              style={[styles.attachOptionButton, { backgroundColor: colors.inputBackground }]}
              onPress={handlePickCamera}
            >
              <Ionicons name="camera-outline" size={22} color={colors.accent} />
              <Text style={[styles.attachOptionLabel, { color: colors.text }]}>Appareil photo</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.attachOptionButton, { backgroundColor: colors.inputBackground }]}
              onPress={handlePickLibrary}
            >
              <Ionicons name="image-outline" size={22} color={colors.accent} />
              <Text style={[styles.attachOptionLabel, { color: colors.text }]}>Galerie</Text>
            </TouchableOpacity>
          </View>
        )}

        {pendingMedia && (
          <View style={styles.previewRow}>
            <Image source={{ uri: pendingMedia.uri }} style={styles.previewThumb} />
            <TouchableOpacity
              style={[styles.previewRemove, { backgroundColor: colors.inputBackground }]}
              onPress={() => setPendingMedia(null)}
            >
              <Text style={[styles.previewRemoveText, { color: colors.text }]}>✕</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={[styles.inputBar, { borderTopColor: colors.headerBorder, backgroundColor: colors.background }]}>
          <TouchableOpacity
            style={[styles.attachButton, { backgroundColor: colors.inputBackground }]}
            onPress={toggleAttachOptions}
          >
            <Ionicons
              name={showAttachOptions ? "close" : "add"}
              size={22}
              color={colors.accent}
            />
          </TouchableOpacity>

          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]}
            placeholder="Écrire un message…"
            placeholderTextColor={colors.textSecondary}
            value={draft}
            onChangeText={setDraft}
            multiline
            blurOnSubmit={false}
            returnKeyType="send"
            onSubmitEditing={handleSend}
          />
          <TouchableOpacity
            style={[styles.sendButton, { backgroundColor: canSend ? colors.accent : colors.accentMuted }]}
            onPress={handleSend}
            disabled={!canSend}
          >
            <Text style={styles.sendButtonText}>Envoyer</Text>
          </TouchableOpacity>
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
                resizeMode="cover"
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
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  listContent: {
    paddingVertical: 12,
  },
  previewRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  previewThumb: {
    width: 64,
    height: 64,
    borderRadius: 8,
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
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  attachButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  input: {
    flex: 1,
    maxHeight: 100,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 15,
    marginRight: 8,
  },
  sendButton: {
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  sendButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 14,
  },
  attachOptionsRow: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingTop: 8,
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