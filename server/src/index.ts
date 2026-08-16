import express from "express";
import cors from "cors";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { config } from "./config.js";
import { pool } from "./db.js";
import { configurerSocket } from "./socket.js";

import { routeurAuth } from "./routes/auth.js";
import { routeurMessages } from "./routes/messages.js";
import { routeurMedias } from "./routes/medias.js";
import { routeurAppareils } from "./routes/appareils.js";

const app = express();
app.use(cors());
app.use(express.json());

app.use("/auth", routeurAuth);
app.use("/messages", routeurMessages);
app.use("/medias", routeurMedias);
app.use("/appareils", routeurAppareils);

app.get("/health", async (_req, res) => {
  try {
    const result = await pool.query("SELECT NOW() AS maintenant");
    res.json({ ok: true, db: result.rows[0].maintenant });
  } catch (err) {
    console.error("Erreur DB :", err);
    res.status(500).json({ ok: false, erreur: String(err) });
  }
});

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*" },
});

configurerSocket(io);

httpServer.listen(config.port, () => {
  console.log(`Serveur démarré sur http://localhost:${config.port}`);
});