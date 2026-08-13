import React from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { useAuth } from "../contexts/AuthContext";
import { useAppTheme } from "../hooks/useAppTheme";
import AuthScreen from "../screens/AuthScreen";
import ChatScreen from "../screens/ChatScreen";

export default function Index() {
  const { utilisateur, chargement } = useAuth();
  const { colors } = useAppTheme();

  if (chargement) {
    return (
      <View style={[styles.centre, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return utilisateur ? <ChatScreen /> : <AuthScreen />;
}

const styles = StyleSheet.create({
  centre: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});