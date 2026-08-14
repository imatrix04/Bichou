import { StockageDisque } from "./disque.js";
import type { Stockage } from "./types.js";

// Le jour où on passe à Minio, c'est la seule ligne à changer ici
export const stockage: Stockage = new StockageDisque();

export type { Stockage, FichierATeleverser } from "./types.js";