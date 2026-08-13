import type { Request, Response, NextFunction } from "express";
import { verifierToken, type PayloadToken } from "./jwt.js";

declare global {
  namespace Express {
    interface Request {
      utilisateur?: PayloadToken;
    }
  }
}

export function authRequise(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ erreur: "Token manquant" });
  }

  const payload = verifierToken(header.slice(7));

  if (!payload) {
    return res.status(401).json({ erreur: "Token invalide ou expiré" });
  }

  req.utilisateur = payload;
  next();
}