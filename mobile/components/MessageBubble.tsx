// components/MessageBubble.tsx
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { ChatMessage } from "../types/chat";
import { useAppTheme } from "../hooks/useAppTheme";

import { urlComplete } from "../services/api";

interface Props {
  message: ChatMessage;
  isOwnMessage: boolean;
  onMediaPress?: (uri: string) => void;
}

// Même palette rose gold que ChatScreen.tsx — à terme, ça peut migrer
// dans useAppTheme.ts pour être partagé sans duplication.
const ROSE = {
  gold: "#C08A94",
  goldDeep: "#9C5B66",
};

function StatusIcon({ status, colors }: { status: ChatMessage["status"]; colors: ReturnType<typeof useAppTheme>["colors"] }) {
  switch (status) {
    case "sending":
      return <Ionicons name="time-outline" size={13} color={colors.statusDefault} />;
    case "sent":
      return <Ionicons name="checkmark" size={14} color={colors.statusDefault} />;
    case "delivered":
      return <Ionicons name="checkmark-done" size={14} color={colors.statusDefault} />;
    case "read":
      // Touche romantique : un message lu devient un petit cœur plein
      // plutôt qu'un double-check classique.
      return <Ionicons name="heart" size={13} color={ROSE.gold} />;
    case "failed":
      return <Ionicons name="alert-circle" size={14} color={colors.statusFailed} />;
    default:
      return null;
  }
}

export default function MessageBubble({ message, isOwnMessage, onMediaPress }: Props) {
  const { colors } = useAppTheme();

  return (
    <View style={[styles.container, isOwnMessage ? styles.containerRight : styles.containerLeft]}>
      <View
        style={[
          styles.bubble,
          {
            backgroundColor: isOwnMessage ? ROSE.gold : colors.bubbleOther,
            shadowColor: isOwnMessage ? ROSE.goldDeep : "#000",
          },
          isOwnMessage ? styles.bubbleOwnShape : styles.bubbleOtherShape,
        ]}
      >
        {message.media?.map((m) => {
          // En liste on affiche la vignette ; le plein écran charge l'original
          const source = m.urlVignette
            ? urlComplete(m.urlVignette)
            : m.url
            ? urlComplete(m.url)
            : m.uri;

          const sourcePleineTaille = m.url ? urlComplete(m.url) : m.uri;

          if (!source) return null;

          return (
            <TouchableOpacity
              key={m.id}
              activeOpacity={0.85}
              onPress={() =>
                m.type === "image" && sourcePleineTaille && onMediaPress?.(sourcePleineTaille)
              }
            >
              <Image
                source={{ uri: source }}
                style={styles.media}
                contentFit="cover"
                cachePolicy="disk"
                transition={150}
              />
            </TouchableOpacity>
          );
        })}

        {message.text ? (
          <Text style={[styles.text, { color: isOwnMessage ? "#FFFFFF" : colors.textOther }]}>
            {message.text}
          </Text>
        ) : null}

        <View style={styles.footerRow}>
          <Text style={[styles.time, { color: isOwnMessage ? "rgba(255,255,255,0.75)" : colors.textSecondary }]}>
            {new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </Text>
          {isOwnMessage && (
            <View style={styles.statusIcon}>
              <StatusIcon status={message.status} colors={colors} />
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    marginHorizontal: 10,
    flexDirection: "row",
  },
  containerLeft: {
    justifyContent: "flex-start",
  },
  containerRight: {
    justifyContent: "flex-end",
  },
  bubble: {
    maxWidth: "78%",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 9,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 2,
  },
  bubbleOwnShape: {
    borderBottomRightRadius: 6,
  },
  bubbleOtherShape: {
    borderBottomLeftRadius: 6,
  },
  text: {
    fontSize: 15,
    lineHeight: 20,
  },
  media: {
    width: 220,
    height: 150,
    borderRadius: 14,
    marginBottom: 6,
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-end",
    marginTop: 4,
    gap: 4,
  },
  time: {
    fontSize: 10,
  },
  statusIcon: {
    marginLeft: 2,
  },
});