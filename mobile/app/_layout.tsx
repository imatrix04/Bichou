import { useState, useCallback, useEffect } from "react";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { AuthProvider } from "../contexts/AuthContext";
import VideoSplashScreen from "../components/VideoSplashScreen";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [videoTerminee, setVideoTerminee] = useState(false);

  const surLayoutRacinePret = useCallback(() => {
    SplashScreen.hideAsync();
  }, []);

  useEffect(() => {
    surLayoutRacinePret();
  }, [surLayoutRacinePret]);

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