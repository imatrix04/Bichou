// components/MessageBubble.tsx
import React, { useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { ChatMessage } from "../types/chat";
import { useAppTheme } from "../hooks/useAppTheme";
import { urlComplete } from "../services/api";
import { ACCENTS, ACCENT_ACTIF } from "../theme/accents";
import { parserCommande } from "../utils/commandes";

const ROSE = ACCENTS[ACCENT_ACTIF];

interface Props {
  message: ChatMessage;
  isOwnMessage: boolean;
  onMediaPress?: (uri: string) => void;
}

function renderTexteAvecGras(texte: string, baseStyle: any, isOwnMessage: boolean) {
  const parties = texte.split(/(\*\*[^*]+\*\*)/g);
  return parties.map((partie, i) => {
    if (partie.startsWith("**") && partie.endsWith("**")) {
      return (
        <Text
          key={i}
          style={[
            baseStyle,
            {
              fontWeight: "700",
              color: isOwnMessage ? "#FDE8D8" : ROSE.goldDeep,
            },
          ]}
        >
          {partie.slice(2, -2)}
        </Text>
      );
    }
    return partie ? (
      <Text key={i} style={baseStyle}>
        {partie}
      </Text>
    ) : null;
  });
}

function StatusIcon({ status, colors }: { status: ChatMessage["status"]; colors: ReturnType<typeof useAppTheme>["colors"] }) {
  switch (status) {
    case "sending":
      return <Ionicons name="time-outline" size={13} color={colors.statusDefault} />;
    case "sent":
      return <Ionicons name="checkmark" size={14} color={colors.statusDefault} />;
    case "delivered":
      return <Ionicons name="checkmark-done" size={14} color={colors.statusDefault} />;
    case "read":
      return <Ionicons name="heart" size={13} color={colors.statusDefault} />;
    case "failed":
      return <Ionicons name="alert-circle" size={14} color={colors.statusFailed} />;
    default:
      return null;
  }
}

function useAnimationPulsation(actif: boolean) {
  const valeur = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!actif) return;
    const boucle = Animated.loop(
      Animated.sequence([
        Animated.timing(valeur, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(valeur, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    );
    boucle.start();
    return () => boucle.stop();
  }, [actif, valeur]);

  return valeur;
}

export default function MessageBubble({ message, isOwnMessage, onMediaPress }: Props) {
  const { colors } = useAppTheme();

  const { commande, contenu } = message.text
    ? parserCommande(message.text)
    : { commande: null, contenu: message.text ?? "" };
  const estImportant = commande === "important";

  const pulsation = useAnimationPulsation(estImportant);
  const echelle = pulsation.interpolate({ inputRange: [0, 1], outputRange: [1, 1.025] });
  const lueur = pulsation.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.85] });

  return (
    <View style={[styles.container, isOwnMessage ? styles.containerRight : styles.containerLeft]}>
      <Animated.View
        style={[
          styles.bubble,
          estImportant && styles.bubbleImportant,
          {
            backgroundColor: isOwnMessage ? ROSE.gold : colors.bubbleOther,
            shadowColor: isOwnMessage ? ROSE.goldDeep : "#000",
            borderColor: estImportant ? ROSE.goldDeep : "transparent",
            transform: estImportant ? [{ scale: echelle }] : undefined,
          },
          isOwnMessage ? styles.bubbleOwnShape : styles.bubbleOtherShape,
        ]}
      >
        {estImportant && (
          <Animated.View
            pointerEvents="none"
            style={[styles.lueurImportant, { opacity: lueur, borderColor: ROSE.gold }]}
          />
        )}

        {estImportant && (
          <View style={styles.enTeteImportant}>
            <Ionicons name="sparkles" size={13} color={isOwnMessage ? "#FFFFFF" : ROSE.goldDeep} />
            <Text style={[styles.labelImportant, { color: isOwnMessage ? "#FFFFFF" : ROSE.goldDeep }]}>
              IMPORTANT
            </Text>
            <Ionicons name="sparkles" size={13} color={isOwnMessage ? "#FFFFFF" : ROSE.goldDeep} />
          </View>
        )}

        {message.media?.map((m) => {
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

        {contenu ? (
          <Text
            style={[
              estImportant ? styles.textImportant : styles.text,
              { color: isOwnMessage ? "#FFFFFF" : colors.textOther },
            ]}
          >
            {renderTexteAvecGras(
              contenu,
              estImportant ? styles.textImportant : styles.text,
              isOwnMessage
            )}
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
      </Animated.View>
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
    bubbleImportant: {
    borderWidth: 1.5,
    paddingVertical: 12,
    overflow: "hidden",
  },
  lueurImportant: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
    borderWidth: 2,
  },
  enTeteImportant: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginBottom: 4,
  },
  labelImportant: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  textImportant: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "700",
    textAlign: "center",
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