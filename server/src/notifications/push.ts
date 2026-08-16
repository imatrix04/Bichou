import { Expo, type ExpoPushMessage } from "expo-server-sdk";
import { query } from "../db.js";

const expo = new Expo();

export async function envoyerPushMessage(
  destinataireId: string,
  titre: string,
  corps: string,
  donnees?: Record<string, unknown>
) {
  const appareils = await query<{ token_push: string }>(
    `SELECT token_push FROM appareil WHERE utilisateur_id = $1`,
    [destinataireId]
  );

  const messages: ExpoPushMessage[] = appareils
    .filter((a) => Expo.isExpoPushToken(a.token_push))
    .map((a) => ({
      to: a.token_push,
      sound: "default",
      title: titre,
      body: corps,
      data: donnees,
    }));

  if (messages.length === 0) return;

  for (const chunk of expo.chunkPushNotifications(messages)) {
    try {
      const tickets = await expo.sendPushNotificationsAsync(chunk);
      console.log("Tickets push :", JSON.stringify(tickets, null, 2));
    } catch (err) {
      console.error("Erreur envoi push :", err);
    }
  }
}