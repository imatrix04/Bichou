import { useState, useCallback, useEffect } from "react";
import { AppState, AppStateStatus } from "react-native";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { AuthProvider } from "../contexts/AuthContext";
import VideoSplashScreen from "../components/VideoSplashScreen";
import { viderNotifications } from "../services/notifications";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [videoTerminee, setVideoTerminee] = useState(false);

  const surLayoutRacinePret = useCallback(() => {
    SplashScreen.hideAsync();
  }, []);

  useEffect(() => {
    surLayoutRacinePret();
  }, [surLayoutRacinePret]);

  useEffect(() => {
    viderNotifications();

    const abonnement = AppState.addEventListener("change", (etat: AppStateStatus) => {
      if (etat === "active") {
        viderNotifications();
      }
    });

    return () => abonnement.remove();
  }, []);

  if (!videoTerminee) {
    return <VideoSplashScreen onFinish={() => setVideoTerminee(true)} />;
  }

  return (
    <AuthProvider>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
      </Stack>
    </AuthProvider>
  );
}