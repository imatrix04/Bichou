// utils/mediaPicker.ts
import * as ImagePicker from "expo-image-picker";
import { MediaAttachment, MediaType } from "../types/chat";

function toMediaAttachment(asset: ImagePicker.ImagePickerAsset): MediaAttachment {
  const type: MediaType = asset.type === "video" ? "video" : "image";
  return {
    id: `${Date.now()}-${Math.round(Math.random() * 1e6)}`,
    type,
    uri: asset.uri,
    width: asset.width,
    height: asset.height,
    durationMs: asset.duration ?? undefined,
  };
}

/**
 * Ouvre la galerie et laisse choisir une photo ou vidéo.
 * Retourne null si l'utilisateur annule ou refuse la permission.
 */
export async function pickFromLibrary(): Promise<MediaAttachment | null> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== "granted") {
    return null;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images", "videos"],
    quality: 0.7,
    allowsEditing: false,
  });

  if (result.canceled || result.assets.length === 0) {
    return null;
  }

  return toMediaAttachment(result.assets[0]);
}

/**
 * Ouvre la caméra pour prendre une photo directement.
 * Retourne null si l'utilisateur annule ou refuse la permission.
 */
export async function pickFromCamera(): Promise<MediaAttachment | null> {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== "granted") {
    return null;
  }

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ["images"],
    quality: 0.7,
  });

  if (result.canceled || result.assets.length === 0) {
    return null;
  }

  return toMediaAttachment(result.assets[0]);
}
