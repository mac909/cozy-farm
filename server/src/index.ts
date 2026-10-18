import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { Server } from "colyseus";
import express from "express";
import { FARM_ROOM, SERVER_PORT } from "../../shared/constants";
import { FarmRoom } from "./rooms/FarmRoom";

const port = Number(process.env.PORT ?? SERVER_PORT);
const clientDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../dist/client");

const app = express();
app.get("/health", (_req, res) => {
  res.send("ok");
});
// The built game. In dev, Vite serves it instead and this folder may not exist.
app.use(express.static(clientDir));

const httpServer = createServer(app);
const gameServer = new Server({ transport: new WebSocketTransport({ server: httpServer }) });
gameServer.define(FARM_ROOM, FarmRoom);

await gameServer.listen(port);
console.log(`Game server listening on port ${port}`);
