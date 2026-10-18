# Cozy Farm

A cozy 2D pixel-art farming game for a couple to play together: real time, in the browser, on laptops and phones, connected through Tailscale. Seaside village setting. One developer (a web dev) builds and maintains it with Claude doing most of the coding; the other player only plays.

Read [docs/DESIGN.md](docs/DESIGN.md) (what the game is and the decisions so far) and [docs/ROADMAP.md](docs/ROADMAP.md) (what's done and what's next) before starting a feature.

## How we work

- Claude writes most of the code. The developer steers, tests, and judges how things feel. Briefly explain non-obvious decisions in chat.
- One feature per session. Use plan mode for anything bigger than a small change.
- Before calling a feature done: `npm run typecheck`, `npm test`, and check it in the browser pane. Two tabs means two players; open the second at http://127.0.0.1:5173 so it keeps its own saved name and look. The pane shows one tab at a time and hidden tabs pause their game loop, so check the other tab's view after switching to it. Use the mobile viewport to check the touch layout. If the pane is hidden, the game's animation frames stop; add `?loop=timer` to the URL (dev only) to run it on timers instead.
- When a design decision is made or changed, update docs/DESIGN.md. Tick items off in docs/ROADMAP.md as they land.
- Commit after each working step, with a message that says what changed for the players.
- `main` is backed up to the private GitHub repo mac909/cozy-farm (`origin`). After committing or merging on `main`, run `git push`. Never push session or worktree branches, and never make the repo public: it has the developer's network details, and asset licenses may forbid redistribution.

## Stack

- **Client** (`client/`): Phaser 3 + TypeScript, bundled by Vite.
- **Server** (`server/`): Colyseus 0.16 on Node, run with tsx. Serves the built client and hosts the one shared world room.
- **Shared** (`shared/`): sync schema, map data, constants, and pure game logic used by both sides.
- **Tests**: Vitest, mainly for `shared/`.
- **Hosting**: one Docker container on the developer's Windows PC. Players connect through Tailscale (see Network below).

## Network

- The real farm's address is **https://msi.tailbddd5f.ts.net** (`msi` is the PC in the tailnet `tailbddd5f.ts.net`). `tailscale serve` on the PC publishes it: Tailscale holds the HTTPS certificate and forwards to the farm on localhost:8080, WebSockets included (the client switches to `wss:` by itself). The setting was made with `--bg`, so it lasts across reboots. `tailscale serve status` shows it; `tailscale serve reset` removes it. HTTPS certificates are switched on for the tailnet on the admin console's DNS page.
- The old address still works: **http://100.82.139.111:8080** (the PC's Tailscale IP). Always include `http://` with it: browsers otherwise try HTTPS, which that address doesn't serve, and fail.
- Players install the game on their phone's home screen from the HTTPS address (steps in README.md). It then opens full screen, using `client/public/manifest.webmanifest`, the icons next to it, and the Apple meta tags in `client/index.html`. There's no service worker; the game needs the server anyway. A home-screen app keeps its own storage, so it asks for a name and look again the first time it opens. Manifest changes reach phones with the next `npm run farm:up`.
- Every device needs the Tailscale app switched on. It works at home and away.
- The home router (Spectrum) blocks Wi-Fi devices from reaching each other, so `192.168.1.x` addresses don't work from phones. Tailscale goes through its relay instead (about 50–150 ms).
- Windows Firewall: the Wi-Fi and Tailscale networks are set to Private, the "Docker Desktop Backend" rule allows Private, and a "Cozy Farm (port 8080)" rule allows the local subnet. Changing firewall rules needs an admin window, so the developer runs those commands.
- Security Center still lists an old, uninstalled Norton as the firewall. Ignore it; Windows Firewall is the one in effect.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Game server on :2567 and Vite on :5173. Open http://localhost:5173. It saves to `data-dev/` (never the real farm). In the browser console, `dev.nextDay()`, `dev.setTime("23:50")` and `dev.addCoins(100)` skip ahead for testing. |
| `npm run dev:fresh` | Deletes the dev save (`data-dev/`) and starts `npm run dev` with a brand-new world |
| `npm test` | Unit tests |
| `npm run typecheck` | TypeScript check across client, server, and shared |
| `npm run build` | Builds the client into `dist/client` |
| `npm run sprites` | Checks `tools/sprites/` and re-renders our own sprites into `client/public/assets/custom/` |
| `npm run farm:up` | Rebuilds and (re)starts the **real farm** container on :8080 |
| `npm run farm:logs` / `npm run farm:down` | Follow its logs / stop it |
| `npm run farm:backup` | Copies the real farm's save into `%OneDrive%\CozyFarm\backups`, keeping the newest 14. `scripts/backup-farm.ps1` has the nightly scheduled-task command. |
| `npm run farm:restore` | Asks which backup to restore (or `-- <path>`), checks that it loads, then swaps it in and restarts the farm. The replaced save stays in the volume as `saves.before-restore-<date>_<time>.sqlite`; `scripts/restore-farm.ps1` says how to undo. |

## Editing the map

The village is a [Tiled](https://www.mapeditor.org/) map, `shared/world/village.json`. The client draws it, and the server reads its size, spawn point, collisions and farmland from the same file.

- Install Tiled (free): `winget install Tiled.Tiled`. Open `shared/world/village.json` and save with Ctrl+S; it stays JSON.
- Layers, top to bottom:
  - `Above`: tree tops and palm fronds, drawn over the characters. Any tile layer with the bool property `aboveCharacters` set does this.
  - `Decor` (trunks, fence, dock, boat), `Details` (flowers, grass tufts), `Ground` (grass, sand, sea). Every other tile layer is drawn too, under the characters, in Tiled's order.
  - `Collision`, hidden in the game: paint the red marker wherever nobody can walk. Only feet collide, so block a tree's trunk row, not its top.
  - `Farmland`, hidden in the game: the green marker where farming is allowed.
  - `Objects`, found by name: the `spawn` point (also where you wake up, in front of the tent's door); rectangles for the `shippingCrate`, the `tent` (48×48, the pack's camp tent) and the `seedStand`, which the game draws at those spots; and `ripple` points on the sea. `Collision` is painted under the bottom row of each, so you can walk behind their tops. Moving one means moving its rectangle and its `Collision` together.
- Terrain brush: open View → Views and Toolbars → Terrain Sets, pick "Beach" in `beach-terrain`, and paint Grass, Sand or Sea; Tiled picks the edge tiles. Keep sand between grass and sea: there are no grass-to-sea tiles.
- Anything new that should block the way (a tree, a fence) also needs `Collision` painted under it.
- New tilesets: 16×16 tiles, the image inside `client/public/assets/`, and embedded in the map (tick "Embed in map" when creating it, or press Embed Tileset in the Tilesets panel), because Phaser can't read separate `.tsx` files. Keep Map → Map Properties → Tile Layer Format on CSV.
- Run `npm test` after saving: it checks the map loads, the spawn is walkable and in front of the tent, the whole farm field, the shipping crate, the tent and the seed stand can be reached, and every tileset image exists. `npm run dev` picks up the change when the page reloads.

## Rules

- **The server owns the world.** Anything shared (crops, items, money, furniture, the clock) changes only in the server room, in response to client messages. Clients send intents ("water tile 12,4"), not results. One exception: each client moves its own character locally and reports its position.
- **Game rules are pure functions in `shared/`**, with tests and no Phaser or Colyseus imports. Rooms and scenes call them.
- **Content is data.** Define crops, items, furniture, critters, and maps in data files under `shared/`, never inline in logic.
- **Touch first.** Every action must work with one thumb on a phone as well as with a keyboard. HUD and controls go in `UIScene` (camera zoom 1). The world goes in `WorldScene` (integer zoom only, so the pixels stay crisp).
- **Pixel art:** 16×16 tiles, `pixelArt: true`. The art is the Ninja Adventure pack (CC0) in `client/public/assets/ninja-adventure/`, plus our own sprites in `client/public/assets/custom/`, drawn as data in `tools/sprites/` (see its README for style rules and sheet layouts). `client/src/art/assets.ts` loads it all and names the texture keys; character sheets are 4 columns (facing down, up, left, right) with the walk cycle in rows 0–3. The village is a Tiled map (see Editing the map below). The dev-only page `/art-preview.html` shows our sprites next to the pack. Need more from the pack? It's free on itch.io (link in `CREDITS.md`); copy in only the files the game uses.
- **Protect the real farm.** It runs in Docker on :8080, with saves in the `farm-data` volume. Never run `docker compose down -v`, never delete that volume, and never point dev at it. Dev uses its own ports and, from Milestone 2, its own `data-dev/` folder. Test the farm scripts by pointing their `-Container`, `-Volume` and `-Image` options at throwaway ones.
- **Saves are versioned** (from Milestone 2). Every save carries a `version`. Changing the format means adding a migration, never breaking old saves. The save layer is `server/src/persistence/`: SQLite through Node's built-in `node:sqlite`, in the folder named by `DATA_DIR` (`data-dev/` in dev, the farm-data volume in Docker). The world's save format and its migrations are in `worldSave.ts`. If a save won't load, the server must stop rather than start a fresh world over it.
- **Two trusted players.** No accounts, passwords, or anti-cheat. Validate messages only enough to avoid crashes or corrupt state (types, bounds).
- **Free only.** No paid services or assets. Asset licenses must allow this use; record every pack and its license in `client/public/assets/CREDITS.md`.
- Keep dependencies few. Mention any new one in chat and say why.
- Colyseus schemas use decorators, which need `experimentalDecorators: true` and `useDefineForClassFields: false` in tsconfig. Don't change those.
