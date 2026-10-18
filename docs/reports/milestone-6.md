# Milestone 6: Marlow and the lighthouse

Built on 2026-10-18 by Claude, working on its own from the approved plan (`docs/plans/progression.md`, its Milestone 6
phase, with every suggested answer in its section 7 taken as decided). Every decision is in `docs/DESIGN.md`. Nothing
has been put on the real farm: it still runs what it ran until you run `npm run farm:up` (exact steps at the end).

## Your save is safe

- The save is now **version 4**. The one migration (version 3 → 4, `migrations[2]` in
  `server/src/persistence/worldSave.ts`) only adds empty things: an empty village (Marlow not here yet, no project
  started), nothing lying about, and empty "foraged" and "built" lists on the last morning's card. Everything else
  comes through untouched. Marlow and the storm arrive when the server first starts, not in the migration.
- `server/src/persistence/fixtures/world-v4.json` joins v1 to v3: the lighthouse half way through its stairs (gifts
  from both of you, both as helpers), driftwood and branches lying about, a morning that built the path.
  `oldSaves.test.ts` checks that v1, v2 and v3 come through with an empty village, nothing lying about and an empty
  "built", with every bag (slot for slot), crop, coin, house, decoration, find and book entry as it was, and that v4
  keeps its village and forage.
- A project's numbers are kept within today's data when a save loads, rather than refused, so tuning a step never
  stops the farm loading; if tuning makes a step's needs already met, it counts as gathered and is built that night.
  An unknown project id stops the server, like an unknown item.
- **The map only grew east.** `map.test.ts` holds the Milestone 5 map's farm field, spawn, crate, tent, stand, store,
  rooms, deep water and every walkable tile in place, so no saved crop, decoration, find or position moves. If the
  board ever lands on a decoration someone put down, the decoration moves to the nearest free spot (tested). And a
  phone rejoining from somewhere you can no longer stand starts at the tent instead (tested).

### The upgrade rehearsal

- **Your real farm's newest backup** (`cozy-farm-2026-10-18_091926.sqlite` in OneDrive) is still **save version 1**
  (day 8, 535 coins, ten dug tiles, one farmer, Mason Mccabe). I copied it to a scratch folder (only read from
  OneDrive), ran the dry run (`World "farm" loads (save version 1 …)`), then played the copy in a scratch dev server:
  it upgraded 1 → 4 on load, the farm, the coins, the bag (with the Milestone 5 rod) were all there, Marlow stood by
  the board, the storm's 10 driftwood and 6 branches were out, and a night built the path. The scratch copy was
  never anywhere near the farm.
- **The v3 fixture** (your farm's shape after Milestone 5): the same, dry run then play: day 9, 735 coins, both bags,
  both houses, the book, the crops; Marlow arrived with the storm; a night built the path.
- Note: the newest backup is from 09:19 and still version 1, so if the farm has been upgraded since, the nightly
  backup hasn't caught it. Take a fresh one before upgrading (below).

## What's new for players

- **Marlow**, the old lighthouse keeper (the pack's OldMan3, straw hat and white beard), arrives with a storm: on the
  real farm the first time the server starts after the update, in a new world on the morning of day 2. His first note
  greets each of you once on each phone ("Let's have a look" points at the board). He stands by the board by day,
  fishes off the end of the dock from 6 pm, and sits in his boat from 10 pm. Face him and the button says **Talk**:
  his newest note if you haven't read it, otherwise a line of small talk over his head.
- **The Village Board**, right of the seed stand, with a note pinned on for each open project. Holding something it
  wants, the button says **Give 7** (the held stack, only as many as are wanted); otherwise **Board** opens its card:
  Marlow's line, the project with a bar and the faces of everyone who's helped (never counts), what's finished, and
  all his notes. Tap the project for its card: each need with **Give**, a tick, or where to find it; **Give everything
  I can** (never coins); what's next; and what it opens.
- **Driftwood and branches:** 3–5 pieces of driftwood wash up on the beach and 3–5 branches fall under the meadow's
  trees each morning (at most 8 of each lying about). **Pick up** with whatever you're holding; hold the button to
  sweep a row. They sell for 5, so the board is the place for them. Picking a slot with something the board wants
  says "Driftwood · wanted on the board", and the bag's strip says "The lighthouse needs 3 more".
- **The lighthouse** in three steps: clear the path to the point (10 driftwood, 6 branches, 300 coins), mend the
  stairs (12 driftwood, 8 branches, 5 of any fish, 600 coins), light the lamp (2 sea glass, 4 of any beach find, 6 of
  any crop, 900 coins). When a step's last thing goes in, **both screens cheer** (Marlow's face, the jingle, confetti
  and a heart over the giver), and every gift floats "+3" from the board. **Overnight** it's built: the brambles go,
  scaffolding goes up and the door opens, the lamp is mended. The morning card's **In the village** shows each with
  Marlow's note and **Look**, which glides the camera there and back. While the lamp still needs sea glass, sea glass
  washes up about twice as often (Marlow's luck).
- **The lamp is lit at 6 pm** the day it's finished: a chime and the opening card on each phone ("The lighthouse is
  lit!", bunting, Marlow's note, what's new, **Let's go see**). From then on it glows every evening, with a halo and a
  beam sweeping round over the sea, drawn over the evening tint.
- **Night fishing at the point:** by day the point fishes like the shore; from 6 pm three new fish bite there
  (lanternfish, cuttlefish from 8 pm, the rare conger eel from 9 pm) and squid. They're in the collection book (now
  26 things).
- **The view from the top:** at the lit lighthouse's door the button says **Climb**: the camera pulls back over the
  whole village; drag (or the arrow keys) to look round, **Down** or Esc to come back.
- **The map grew east:** the beach runs on past the dock to the rocky point; the old line of trees on the meadow's
  east edge opens onto a new meadow with a grove; past the point, an inlet with a broken bridge and a hidden cove
  behind a row of palms (Milestone 9's).
- **The book's Village page:** the board as it stands, to check from anywhere. New tips: the board, driftwood and
  branches, the point and the view.

## Decisions worth a second look

- **One step a night at most.** Once a step's last thing is in, the board takes nothing more until it's built
  overnight, so the lighthouse takes at least three nights and is lit at dusk on the fourth day. The plan's story
  ("two evenings later, at dusk, the lamp comes on") fits.
- **The storm replaces the morning's usual driftwood and branches** with exactly 10 and 6, so step 1 can be done the
  first evening if you pick up all of them. And **nothing lies about before Marlow arrives**, so a new world's day 1
  is just farming.
- **"Any fish" from the Action button gives the stack you're holding**, so holding a moonfish at the board and
  tapping Give gives the moonfish. The card's Give buttons give the cheapest first. That replaces the plan's
  "Choose" link (hold the one you want instead).
- **Marlow at night** is in his boat (not close enough to Talk); once the lighthouse is lit he's up in the lamp room
  and out of sight. He doesn't hold a rod when he "fishes".
- **The map's layout** (I painted it with a script, then checked it in the game): the point at columns 57–64, the
  lighthouse at 59–61 × 25–30, the brambles across a three-tile neck, the inlet at 66–68, the cove at 69–79 shut off
  by palms, a grove at 67–77 × 2–10, the old east tree line opened at rows 8–13. Easy to move in Tiled.
- **The village's name** is a placeholder ("the village") in `VILLAGE_NAME`, `shared/content/keeper.ts`.
- **Marlow's luck** doubles a wanted find's weight, which makes it about 1.7 times as likely, not exactly twice.
- **The glow is drawn over the evening tint** in the HUD scene, so it stays bright at night; it moves a frame behind
  the camera when you walk, which I couldn't see at normal speed.
- **The view** shows extra sea below the village (where the rooms are drawn) when the screen is taller than the map.

## Try it on a phone (no programming needed)

After `npm run farm:up`, on both phones with Tailscale on:

1. **Open the game.** A note from Marlow pops up: tap **Let's have a look**. A little arrow bounces over the board by
   the seed stand. A tip says how the board works.
2. **Find him:** walk to the seed stand. The board's next to it, and Marlow stands just right of it. Face him and tap
   **Talk**.
3. **Gather:** walk down to the beach; pale driftwood lies on the sand. Face one (or stand on it) and tap **Pick up**;
   hold the button and walk to sweep a row. The other of you: walk up into the meadow above the market and the new
   meadow east of it, where branches lie under the trees.
4. **Give:** put the driftwood in your hotbar (bag, tap it, tap a hotbar slot), pick that slot and walk up to the
   board: the big button says **Give 10** (or however many). Tap it. A "+10" floats up from the board on both phones.
5. **Look at the board:** away from Marlow, the button says **Board**. Tap it, then tap the lighthouse. You'll see
   what's in, both your faces under Helping, and Give buttons. Tap **Give 300** by Coins.
6. **The cheer:** when the last thing goes in, a card with Marlow's face pops up on both phones: "That's everything
   for the path!"
7. **Sleep.** In the morning the card says "The brambles are gone" with Marlow's note. Tap **Look**: the camera
   glides to the point and back.
8. **Walk out to the point** along the beach to the east. The old lighthouse is dark; face its door and tap: Marlow
   has a plan for it on the board.
9. **The next steps:** the stairs want fish too (any fish: the board gives the cheapest), and the lamp wants sea glass,
   shells and crops. One step a night.
10. **At 6 pm** on the day after the last step, the lamp comes on: a card on each phone, and the beam sweeps over the
    sea. Be outside to see it.
11. **Night fishing:** stand on the rocks at the foot of the lighthouse after dark, face the water, and fish.
12. **Climb:** at the lit lighthouse's door the button says Climb. Drag to look round; **Down** comes back.
13. **The book:** tap the book, then **Village**, to check what the board wants from anywhere.
14. Things to tell me: is gathering enough for a step an evening? Is "Give 7" easy to find with one thumb? Is the beam
    too bright, too dim, too fast? Does the point feel far? Does Marlow need more to say?

## Known rough edges

- **Not tried on a real iPhone.** Checked in the browser pane with two players on a laptop layout and at phone size:
  Marlow's arrival (both on an upgraded save and a new world's day 2), the storm, picking up, giving from both
  players (the Action button's Give and the card's), faces, the cheer on both screens, building overnight with Look,
  all three steps, a server restart mid-project (everything came back, no second storm), the lamp at dusk with the
  opening card and the glow, night fishing at the point, the view, Talk, the notes, the book's Village page.
- **At night the cottages' windows aren't lit** in the view, and there's no Photo button.
- **The storm's line on the morning card** only shows on a phone that hasn't seen that day's card yet. On the real
  farm Marlow's note does the greeting, so you may not see it.
- **The opening card shows once per phone**, whenever that phone is next open after the lamp is lit, even days later.
- **No "Coming later" silhouettes yet**: the garden shop isn't built, so after the lighthouse the board just says
  Marlow is still drawing up the next plan. The "Your home" tab comes with Milestone 7.
- **The broken bridge** is two stubs of the dock's planks in the inlet; the brambles, the board and the lighthouse
  are my first pass at the art (`tools/sprites/village.ts`).
- **A tap right after closing a tip** was sometimes ignored on the laptop in my testing (the HUD's known first-click
  quirk); a second tap works.
- I tested on your dev save. The copy from before is `data-dev/saves.before-milestone-6.sqlite` (rename it to
  `saves.sqlite` to go back); the one in `data-dev/` now has the lighthouse lit on day 8.
- The map was grown by a script rather than in Tiled; it's ordinary Tiled JSON (CSV layers, embedded tilesets), but I
  haven't opened it in Tiled myself.

## Upgrading the real farm safely

1. Make sure nobody's playing: `farm:up` restarts the farm and disconnects anyone in it.
2. `npm run farm:backup` for a fresh copy in `%OneDrive%\CozyFarm\backups` (the newest there now is from 09:19 and
   still save version 1).
3. **Dry run** on that new file (it only reads it):
   `node --import tsx server/src/persistence/checkCli.ts "<the new backup's path>"`. It should say
   `World "farm" loads (save version N, …)` and exit without an error.
4. Optional, to play it first: copy the backup into an empty scratch folder as `saves.sqlite`, then in PowerShell
   `$env:DATA_DIR = "<that folder>"; npm.cmd run dev` and open http://localhost:5173 (pick yourself on Who's playing).
   Marlow should be by the board and driftwood on the beach. Stop it with Ctrl+C, then delete the folder. Never point
   `DATA_DIR` at the farm's volume.
5. `npm run farm:up`. On first start the server upgrades the save to version 4 (the original stays in the volume's
   `save_archive`), and Marlow arrives with the storm.
6. `npm run farm:logs` should show `Loaded the world … (upgraded from save version N)` and
   `Game server listening`, and nothing red. Open the game on both phones: Marlow's note greets each of you.
7. **The way back**, if something's wrong: the old code can't load a version 4 save (the server stops rather than
   start over), so go back to the code before `91fe215` and restore the backup from step 2 with `npm run farm:restore`.

## For Milestone 7

- **The save** is version 4; the next change is `migrations[3]` (4 → 5) and a `world-v5.json` fixture.
- **Badges that follow from the village** (Lamplighter): `builtThings(world).has("lighthouse")`
  (`shared/village/built.ts`).
- **House upgrades** as one-step projects: `PROJECTS` and `isProjectId` in `shared/content/projects.ts` only know the
  village's projects; per-house ids ("house1:porch") need adding there and in the save's validation. The map side is
  ready: a layer with `shownFrom: house1:porch` just works.
- **The board's Your home tab** goes in `client/src/ui/VillageBoard.ts`; the board card is `BoardPanel.ts`.
