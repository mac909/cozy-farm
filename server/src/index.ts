import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { Server, matchMaker } from "colyseus";
import express from "express";
import { FARM_ROOM, SERVER_PORT } from "../../shared/constants";
import { newWorld } from "../../shared/world/world";
import { resolveDataDir } from "./persistence/dataDir";
import { SaveLoadError } from "./persistence/errors";
import { SaveStore } from "./persistence/saveStore";
import { WORLD_ID, WORLD_SAVE, worldFromSave } from "./persistence/worldSave";
import { FarmRoom } from "./rooms/FarmRoom";
import { LiveWorld, setLiveWorld } from "./world/liveWorld";

const port = Number(process.env.PORT ?? SERVER_PORT);
const clientDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../dist/client");

/**
 * Loads the world before anyone can join. A save that won't load stops the server: starting a
 * fresh world instead would overwrite the farm with the next save.
 */
function loadWorld(): LiveWorld {
  const store = new SaveStore(resolveDataDir(), WORLD_SAVE);
  const loaded = store.load(WORLD_ID);
  if (loaded.status === "none") {
    console.log(`No save yet in ${store.file}: starting a new world.`);
    const live = new LiveWorld(store, newWorld());
    // Saved straight away, so the first backup has something in it.
    live.saveNow();
    return live;
  }
  const from = loaded.migratedFrom ? ` (upgraded from save version ${loaded.migratedFrom})` : "";
  console.log(`Loaded the world saved at ${loaded.savedAt} from ${store.file}${from}.`);
  return new LiveWorld(store, worldFromSave(loaded.save));
}

let live: LiveWorld;
try {
  live = loadWorld();
} catch (error) {
  if (error instanceof SaveLoadError) {
    console.error(`\n${error.message}\nThe game server has stopped so the farm isn't replaced by a new one.\n`);
    process.exit(1);
  }
  throw error;
}
setLiveWorld(live);

const app = express();
app.get("/health", (_req, res) => {
  res.send("ok");
});
// The built game. In dev, Vite serves it instead and this folder may not exist.
app.use(express.static(clientDir));

const httpServer = createServer(app);
const gameServer = new Server({ transport: new WebSocketTransport({ server: httpServer }) });
gameServer.define(FARM_ROOM, FarmRoom);
// Everyone leaves on shutdown (docker stop, Ctrl+C), which saves; this saves once more and closes the database.
gameServer.onShutdown(() => live.close());

await gameServer.listen(port);
// The one shared world, made now and kept for as long as the server runs, so the clock and the farm live in one place.
await matchMaker.createRoom(FARM_ROOM, {});
console.log(`Game server listening on port ${port}`);
