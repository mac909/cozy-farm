// Writes a checked, consistent copy of the save database to the given path. scripts/backup-farm.ps1
// runs it in a throwaway container next to the real farm:
//   node --import tsx server/src/persistence/snapshotCli.ts /tmp/saves.sqlite
import { resolveDataDir } from "./dataDir";
import { messageOf } from "./errors";
import { snapshotSaves } from "./saveStore";
import { WORLD_SAVE } from "./worldSave";

const dest = process.argv[2];
if (!dest) {
  console.error("Usage: node --import tsx server/src/persistence/snapshotCli.ts <copy.sqlite>");
  process.exit(2);
}

try {
  const worlds = snapshotSaves(resolveDataDir(), dest, WORLD_SAVE);
  for (const world of worlds) {
    console.log(`Copied world "${world.worldId}" (save version ${world.version}, saved ${world.savedAt}).`);
  }
  if (worlds.length === 0) console.log("Copied the save database, which has no worlds in it yet.");
} catch (error) {
  console.error(messageOf(error));
  process.exitCode = 1;
}
