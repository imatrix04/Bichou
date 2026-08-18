// utils/mediaPicker.ts
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as MediaLibrary from "expo-media-library";
import { MediaAttachment, MediaType } from "../types/chat";

function toMediaAttachment(asset: ImagePicker.ImagePickerAsset): MediaAttachment {
  const type: MediaType = asset.type === "video" ? "video" : "image";
  return {
    id: `${Date.now()}-${Math.round(Math.random() * 1e6)}`,
    type,
    uri: asset.uri,
    mimeType: asset.mimeType ?? (type === "video" ? "video/mp4" : "image/jpeg"),
    width: asset.width,
    height: asset.height,
    durationMs: asset.duration ?? undefined,
  };
}

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

export async function enregistrerImageDansGalerie(uri: string): Promise<boolean> {
  const { status } = await MediaLibrary.requestPermissionsAsync();
  if (status !== "granted") {
    return false;
  }

  const nomFichier = uri.split("/").pop()?.split("?")[0] ?? `bichou-${Date.now()}.jpg`;
  const cheminLocal = FileSystem.cacheDirectory + nomFichier;

  const { uri: uriTelechargee } = await FileSystem.downloadAsync(uri, cheminLocal);
  await MediaLibrary.saveToLibraryAsync(uriTelechargee);

  return true;
}
