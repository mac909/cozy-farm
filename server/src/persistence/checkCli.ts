// Checks a save database file without changing it, and says which worlds are in it. Exits with 1 if
// it's damaged or a world won't load. scripts/restore-farm.ps1 runs it on a backup, in a throwaway
// container from the farm's image, before restoring it:
//   node --import tsx server/src/persistence/checkCli.ts /tmp/cozy-farm-2026-10-17_040000.sqlite
import { SaveLoadError, messageOf } from "./errors";
import { checkSaveFile } from "./saveStore";
import { WORLD_SAVE } from "./worldSave";

const file = process.argv[2];
if (!file) {
  console.error("Usage: node --import tsx server/src/persistence/checkCli.ts <saves.sqlite>");
  process.exit(2);
}

try {
  const worlds = checkSaveFile(file, WORLD_SAVE);
  for (const world of worlds) {
    console.log(`World "${world.worldId}" loads (save version ${world.version}, saved ${world.savedAt}).`);
  }
  if (worlds.length === 0) console.log("It has no worlds in it yet.");
} catch (error) {
  console.error(error instanceof SaveLoadError ? error.summary : messageOf(error));
  process.exitCode = 1;
}
