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
| Look | A name (up to 12 characters) and one of 12 Ninja Adventure characters, picked on first join and remembered on that device. Change it any time from the button in the top right. Looks saved with the old shirt colors load as a similar-looking character. | 2026-10-18 |
| Emotes | Wave and heart, as buttons next to the Action button (keys Z and X; 1–8 are the hotbar now). A bubble shows above your head for 2 seconds, for everyone. | 2026-10-18 |
| Who's playing | Bags belong to farmers, not devices. A new device (or the home-screen app the first time) asks "Who's playing?": tap your name to get your own bag back, or Someone new. The device remembers the choice. If the same farmer opens on a second device, the newest one wins and the older one says "You're playing on another device" with Play here. Farmer ids are made by the server and kept on the device. | 2026-10-18 |
| Farming rules | Crops never die; six starter crops, two of which regrow; the day ends when everyone online is in bed. Details under Time and Farming. | 2026-10-17 |
| Art pack | Ninja Adventure (pixel-boy, CC0) as the base, plus our own matching sprites for crops, beach and shells. | 2026-10-17 |
| Map | Painted in Tiled (`shared/world/village.json`). Hidden layers mark where nobody can walk and where farming is allowed; objects mark the spawn point and the spots for the shipping crate, tent and seed stand. The server reads the same file. | 2026-10-18 |
| Places | The tent stands on the grass just left of the farm field's gate, and you appear (and wake up) at its door. The seed stand is beside the top of the sandy path down to the beach. The shipping crate is on the dock. Decided by Claude while the developer was away; easy to move in Tiled. | 2026-10-18 |
| Music | "Calm Village" from the pack loops softly, starting at the first tap or key press. A music button next to the look button mutes it, remembered on that device. | 2026-10-18 |

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

- One shared wallet, starting at 500 coins.
- Each player has their own bag of 24 slots; the first 8 are the hotbar. Everyone starts with a hoe, a watering can and 10 radish seeds.
- A shipping crate on the dock: whatever's in it sells overnight, at that night's prices, and a morning message says what sold. It has no size limit, and you can take things back out before night.
- A general store for seeds, tools, and furniture. Seeds and furniture sell back for about half price, so a mistake isn't a total loss. Tools can't be sold.
- All prices and amounts live in `shared/content/items.ts` and `shared/content/crops.ts`. They're first guesses, to be tuned by playing.

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

- Ninja Adventure (pixel-boy, CC0) for tiles, characters, critters, items, UI and music. One artist, so styles don't clash.
- Our own sprites in its style for what it lacks: crop stages, tilled soil, beach sand, shells and sea glass, the shipping crate, a wave emote.
- Characters walk in four directions; you can walk behind tree tops.
- Music: "Calm Village" on a soft loop. The pack's "Peaceful", "Sunny" and "Aquatic" are imported too, for later (other times of day or places).
- Sound effects later, from the pack (already imported: menu, coin, water, grass, waves).

## Later ideas

Seasons, weather, day/night lighting, cooking, animals (chickens, our own pets), villagers and friendship, festivals, restoring the lighthouse.

## Open questions

- Our names and pets, if we want them in the game.
- What's the game called?
