import jwt from "jsonwebtoken";
import { config } from "../config.js";

export interface PayloadToken {
  utilisateurId: string;
  login: string;
}

const DUREE_TOKEN = "30d";

export function genererToken(payload: PayloadToken): string {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: DUREE_TOKEN });
}

export function verifierToken(token: string): PayloadToken | null {
  try {
    return jwt.verify(token, config.jwtSecret) as PayloadToken;
  } catch {
    return null;
  }
}