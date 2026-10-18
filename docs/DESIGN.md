# Cozy Farm: Design

Items marked **(proposed)** are Claude's suggestions and haven't been confirmed yet. Change anything.

## Vision

A cozy seaside village the two of us build together in the evenings: farming, decorating, and collecting at our own pace, side by side.

## Pillars

1. **Together, not competing.** Everything is nicer with two, but nothing requires two. No scores, no racing each other.
2. **No stress.** Nothing dies, nothing is lost, no timer punishes you. **(proposed)**
3. **Always something to look forward to.** Crops ripening tomorrow, a new shop item, a rare fish.
4. **Made for us.** Room for inside jokes, real places, and our pets.

## Decisions

| Topic | Decision | Decided |
|---|---|---|
| Players | Two, playing at the same time, each on their own device | 2026-10-17 |
| Devices | Laptop browsers (keyboard) and phone browsers (touch) | 2026-10-17 |
| Hosting | Docker on the home PC. Devices connect through Tailscale (free), because the home router blocks Wi-Fi devices from reaching each other. This also works away from home. | 2026-10-17 |
| Art | 2D pixel art, 16×16 tiles, free asset packs only | 2026-10-17 |
| Activities | Farming, decorating, collecting. Villagers maybe later. | 2026-10-17 |
| Time | Only passes while playing (Stardew-style days) | 2026-10-17 |
| Sharing | Shared farm and wallet; each player has their own house | 2026-10-17 |
| Setting | Seaside village | 2026-10-17 |
| Look | A name (up to 12 characters) and one of six preset shirt colors, picked on first join and remembered on that device. Change it any time from the button in the top right. | 2026-10-17 |
| Emotes | Wave and heart, as buttons in the bottom right (keys 1 and 2). A bubble shows above your head for 2 seconds, for everyone. | 2026-10-17 |
| Farming rules | Crops never die; six starter crops, two of which regrow; the day ends when everyone online is in bed. Details under Time and Farming. | 2026-10-17 |
| Art | Ninja Adventure (pixel-boy, CC0) as the base, plus our own matching sprites for crops, beach and shells. | 2026-10-17 |

## Setting

A small seaside village: a farm on the grassy bluff, a path down to the beach, a wooden dock out over the water. Later: tide pools, a lighthouse, a boardwalk with shops.

## Together

- Each player's name floats above their head.
- The other player is drawn about a quarter second behind where they really are, so they walk smoothly over a jittery connection instead of hopping.
- If the connection drops (Wi-Fi blip, phone waking up, server restart), the game keeps running solo, shows "Reconnecting…", and rejoins by itself, putting you back where you were standing. While you're away the other player sees you vanish, and you reappear when you're back.

## Time

- The clock runs only while someone is connected.
- A day runs 6am to midnight and lasts about 15 real minutes.
- The day ends when everyone online has gone to bed, so one player playing alone can end it. If nobody is online, the day never ends on its own.
- Still up at midnight? You're sent home, with no penalty.

## Farming

- Till soil, plant seeds, water, harvest.
- Overnight, watered crops grow; unwatered crops just wait and never die. The soil dries out each night.
- Either player can water or harvest anything on the shared farm.
- Starter crops: radish, carrot, sea samphire, potato, strawberry, pumpkin. Samphire and strawberry regrow after harvest: the plant drops back one stage and ripens again.
- Growth times and prices live in `shared/content/crops.ts`. They're first guesses, to be tuned by playing.
- Not decided yet: digging up a crop you don't want.

## Money and shops

- One shared wallet.
- A shipping crate on the dock: whatever's in it sells overnight. **(proposed)**
- A general store for seeds, tools, and furniture.

## Decorating

- Each player has their own house, starting as one room, and can visit the other's.
- Furniture sits on a grid and can be placed, rotated, and picked up freely.
- Outdoor decorations (fences, paths, lamps, flower beds) go on the shared farm.

## Collecting

- **Fishing** from the dock and the beach: a relaxed minigame, with different fish by time of day.
- **Beachcombing:** shells and sea glass wash up on the sand each morning.
- **Bugs and butterflies** in the meadow.
- A shared collection book; later, a little aquarium or museum to fill.

## Art and sound

- Placeholder art drawn in code until we pick a pack.
- Candidate packs: Sprout Lands (Cup Nooble) and Cute Fantasy (Kenmi), both on itch.io. The pack needs beach and water tiles. Stick to one artist so styles don't clash.
- Kenney packs (CC0) for UI and sound effects.
- Calm music; tracks picked later.

## Later ideas

Seasons, weather, day/night lighting, cooking, animals (chickens, our own pets), villagers and friendship, festivals, restoring the lighthouse.

## Open questions

- Characters: beyond a name and shirt color, presets or a simple character creator? (Depends on the art pack.)
- Our names and pets, if we want them in the game.
- What's the game called?
