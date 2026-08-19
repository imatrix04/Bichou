import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { recupererGalerie, ajouterPhotoGalerie, PhotoGalerieApi } from "../services/api";
import { MediaAttachment } from "../types/chat";

export function useGalerie() {
  const { token } = useAuth();
  const [photos, setPhotos] = useState<PhotoGalerieApi[]>([]);
  const [chargement, setChargement] = useState(true);
  const [chargementAncien, setChargementAncien] = useState(false);
  const [toutCharge, setToutCharge] = useState(false);
  const [enEnvoi, setEnEnvoi] = useState(false);

  const charger = useCallback(async () => {
    if (!token) return;
    setChargement(true);
    try {
      const resultat = await recupererGalerie(token);
      setPhotos(resultat);
      setToutCharge(resultat.length < 40);
    } finally {
      setChargement(false);
    }
  }, [token]);

  useEffect(() => {
    charger();
  }, [charger]);

  const chargerPlusAnciennes = useCallback(async () => {
    if (!token || chargementAncien || toutCharge || photos.length === 0) return;
    setChargementAncien(true);
    try {
      const derniere = photos[photos.length - 1];
      const resultat = await recupererGalerie(token, derniere.ajouteLe);
      if (resultat.length === 0) setToutCharge(true);
      setPhotos((prev) => [...prev, ...resultat]);
    } finally {
      setChargementAncien(false);
    }
  }, [token, chargementAncien, toutCharge, photos]);

  const ajouterPhotos = useCallback(
    async (medias: MediaAttachment[]) => {
      if (!token || medias.length === 0) return;
      setEnEnvoi(true);
      try {
        for (const media of medias) {
          if (!media.uri) continue;
          const photo = await ajouterPhotoGalerie(token, media.uri, media.mimeType ?? "image/jpeg");
          setPhotos((prev) => [photo, ...prev]);
        }
      } finally {
        setEnEnvoi(false);
      }
    },
    [token]
  );

  return { photos, chargement, chargementAncien, toutCharge, enEnvoi, chargerPlusAnciennes, ajouterPhotos };
}