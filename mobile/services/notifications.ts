// services/notifications.ts
import Constants from "expo-constants";
import { Platform } from "react-native";

export async function enregistrerPourNotifications(): Promise<string | null> {
  // Push web nécessite une config VAPID à part — non prévu pour Bichou
  if (Platform.OS === "web") {
    return null;
  }

  // Expo Go ne supporte plus les push Android depuis le SDK 53 — on skip
  if (Constants.appOwnership === "expo") {
    console.log("Notifications push indisponibles dans Expo Go — utilise un dev build.");
    return null;
  }

  const Notifications = await import("expo-notifications");

  const { status: statutExistant } = await Notifications.getPermissionsAsync();
  let statut = statutExistant;

  if (statut !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    statut = status;
  }

  if (statut !== "granted") return null;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
    });
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
  return token;
}

export async function viderNotifications(): Promise<void> {
  if (Platform.OS === "web") return;
  if (Constants.appOwnership === "expo") return;

  const Notifications = await import("expo-notifications");
  await Notifications.dismissAllNotificationsAsync();
  await Notifications.setBadgeCountAsync(0);
}