// theme/accents.ts

export type AccentId = "rose"; // futur: "rose" | "ocean" | "sunset" | ...

export interface AccentPalette {
  blush: string;
  blushDark: string;
  petal: string;
  gold: string;
  goldDeep: string;
}

export const ACCENTS: Record<AccentId, AccentPalette> = {
  rose: {
    blush: "#F7E1E4",
    blushDark: "#3A2C30",
    petal: "#F2C6CC",
    gold: "#C08A94",
    goldDeep: "#9C5B66",
  },
};

// Fixe pour l'instant — deviendra un choix utilisateur stocké (contexte/DB) plus tard
export const ACCENT_ACTIF: AccentId = "rose";