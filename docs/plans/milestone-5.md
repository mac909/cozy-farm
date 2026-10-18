# Milestone 5 plan: fishing, beachcombing, butterflies and the collection book

**Status:** built (2026-10-18); every step below landed, and `docs/reports/overnight-2026-10-18.md` has what to try.

Written 2026-10-18 by Claude, building autonomously ("I trust you with decisions"). Every decision is also in
DESIGN.md; this file is the short build plan.

**The evening this ships:** she wakes up to "Something washed up on the beach" on the morning card, walks down the
sandy path and picks up a scallop shell and a bit of sea glass. A card pops up on both phones: "New in the
collection book! Sea Glass, found by Juno". You stand at the end of the dock with the fishing rod, tap Fish, wait
for the bobber to dip, tap, and hold to reel in while she chases a yellow butterfly round the meadow. In the
evening you open the book together: 5 of 23 found, a Sea Bream of 41 cm, and silhouettes of everything still out
there.

## First: protect the real save

- The real save is **version 2**. One format change for the whole milestone: **version 3** adds
  - `worldSeed`: the world's own random number, so beach finds are its own (the migration makes one from the
    farmers' ids, so it's the same every time the same save is upgraded);
  - `beach`: `{ day, finds }`, what's lying on the sand and the day the tide last brought something;
  - `book`: the shared collection book (fish, beach finds, bugs), empty;
  - `lastMorning.washedUp`: what the tide brought that morning (empty for older mornings);
  - a **fishing rod** in every farmer's first empty bag slot.
- `world-v3.json` is committed with finds on the sand, a filled-in book and rods in the bags, and
  `oldSaves.test.ts` checks v1 and v2 come through with rods, an empty book and an empty beach.

## Decisions

| Question | Decision | Why |
|---|---|---|
| Where can you fish? | Facing the water with the rod: from the **dock** (its sides), from the **shore** (any sand or grass at the sea's edge), and the **deep water** off the dock's end (a `deepWater` rectangle in Tiled). Water is read from the map: sea on the Ground layer with Collision painted on it; the dock is the walkable sea. | All three spots in the merged fish list, so all 12 fish can be caught, and painting new beach in Tiled just works. |
| Who gets a rod? | New farmers start with one. The migration puts one in every existing farmer's bag; if a bag was full, the rod arrives the next time they join with a free slot. It isn't sold. | Nothing to buy or find first; nobody misses out. |
| Who runs the minigame? | When you cast, the server picks the fish (spot, time of day, its own random seed) and sends the line to your device, which plays it out with the merged state machine. When it's landed, your device says so; the server checks there was a cast, enough time passed and the size fits that fish, then puts it in your bag and the book. | Holding through tugs needs instant feedback; a round trip over Tailscale's relay (50–150 ms) would feel sticky. Two trusted players. |
| Fishing controls | One button: tap when it bites, hold to reel, let go while it tugs. The Action button, Space, or a touch **anywhere** on the screen all count. **Stop** (in the bag's place), Esc, or walking with the keys reels in. A meter above the hotbar shows the reel. | One thumb, the biggest possible target. |
| Bugs | Six kinds by time of day: four butterflies in the daytime (two from the pack, two recoloured), fireflies and a luna moth in the evening. 3–6 flutter over the meadow's grass at once; a new lot comes every two game hours. Next to one, Action says **Catch**, whatever you're holding. No net. | "Keep it simple and cozy." One tap, like picking a ripe crop. |
| Are bugs saved? | No: they come and go like the weather, from the clock and the world seed. Caught bugs and the book are saved. | Nothing to lose; less to save. |
| Beachcombing | The merged rules: 2–5 finds each morning on beach sand (full sand tiles within 5 of the sea, so not the path up to the farm), at most 10 at once, never on decorations or round the crate. They glint now and then. Facing one (or standing on it), Action says **Pick up**; hold it to pick up a row. The first tide also comes when the server first starts after the update. | |
| Collection book | One shared book: Fish, Beach and Bugs, each a grid. Found things in colour with how many and who found the first; fish with the biggest catch. Not found yet: a silhouette, with where to look. A count at the top ("5 of 23"). Opens from a book button in the top right (key C) and a Book button in the bag. | |
| Celebration | A first discovery puts a card at the top of both screens ("New in the book! Sea Bream, caught by Pip"), with the pack's success jingle and a burst of sparkles over the finder. A new biggest fish gets a smaller card. | Shared moments. |
| Display furniture | A fish tank at the store (For your house), decorative. | The optional aquarium. |
| Fish pictures | Our own 12 fish icons (the pack has three small fish, all one shape), drawn in `tools/sprites/`. | The book needs each fish to look like itself. |

## Server

- `shared/world/terrain.ts`: grass, sand and sea from the Ground layer's terrain set; water, dock, beach sand,
  meadow grass and the fishing spot for a tile.
- Messages: `cast` → `castStarted`, `landFish`, `pickUp`, `catchBug`; the server broadcasts `bookEvent` for
  discoveries and records. One file each in `server/src/rooms/` (`fishing.ts`, `beach.ts`, `bugs.ts`).
- Network state: `beach` (finds), `bugs` (where each one flutters), `book` (entries).
- The night washes up the beach (`endNight` gets the shore), and the morning card says so.

## Build order (each step: typecheck, tests, browser check, commit, push)

1. Rules: bugs data and items, the rod, the book's bug section, terrain and spots from the map.
2. Save version 3: migration, validation, fixture and tests; the tide at night and on first start; network state.
3. Beachcombing in the game, and the morning card line.
4. Fishing: art, the cast and the minigame on screen, landing the fish.
5. Bugs: art, the meadow, catching.
6. The collection book card, the HUD and bag buttons, the celebration in both tabs, the fish tank.
7. Tips, docs, the full two-player check and the report.
