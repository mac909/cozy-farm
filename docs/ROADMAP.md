# Roadmap

Every milestone ends with something playable. Tick items off as they land.

## Milestone 0: Foundation

- [x] Project setup: Vite + Phaser client, Colyseus server, shared code, tests
- [x] Placeholder seaside village map with collisions
- [x] One character walking, with keyboard and an on-screen joystick
- [x] Client connects to the server (status shown in the corner)
- [x] Real farm runs in Docker on :8080 and opens on a phone (through Tailscale)
- [x] Git repo with a first commit

## Milestone 1: Together

- [x] See each other moving around in real time (smoothed)
- [x] Name and look picked on first join, remembered on that device
- [x] Emotes (wave, heart)
- [x] Reconnect automatically after Wi-Fi blips or a server restart
- [x] Pick the art pack: Ninja Adventure plus our own crop, soil, beach and crate sprites (in `client/public/assets/`)
- [x] HTTPS address and home-screen install on phones
- [x] Use the new art in the game and move the map into Tiled; pick a character; soft music with a mute button

## Milestone 2: Farming (the first version to show her)

- [x] Hoe, seeds, watering can; touch-friendly hotbar and inventory (the bag screen)
- [x] Shipping crate on the dock and the shared wallet (moved up from Milestone 3, so the radishes have somewhere to go)
- [x] A seed stand for buying seeds with the coins (also moved up from Milestone 3)
- [x] Day clock (only while playing); sleeping in the shared tent ends the day, with a morning card
- [x] Crops grow day by day; harvest
- [x] World saved to SQLite (versioned) and restored after restarts
- [x] Separate dev save, so testing never touches the real farm
- [x] Feel pass: hold to repeat, turning on the spot, sounds, bobbing ripe crops, first-day tips
- [ ] Nightly backup of the save to OneDrive (the script is ready: `npm run farm:backup`; saving is wired in, so the developer creates the scheduled task from `scripts/backup-farm.ps1`)

## Milestone 3: Shop

- [x] General store: furniture and farm decorations (the seed stand keeps the seeds)

## Milestone 4: Decorating

- [x] A house interior for each player; visiting each other (and a bed in each that works like the tent)
- [x] Place, rotate, and pick up furniture (arrange mode: one thumb or keys)
- [x] Outdoor decorations on the farm (fences, stepping stones, flowers, tubs, barrels, a scarecrow, a washing line, banners...)

## Milestone 5: Collecting

- [x] Fishing from the dock, the shore and the end of the dock (a relaxed one-button minigame; a rod for everyone)
- [x] Beachcombing for shells and sea glass (a few wash up each morning)
- [x] Bugs and butterflies (by time of day; fireflies after dark)
- [x] Collection book (shared, with first-discovery celebrations on both screens), and a fish tank at the store

## Restoring the village (Milestones 6–12)

Planned in [docs/plans/progression.md](plans/progression.md), with mockups in
[progression-mockups.html](plans/progression-mockups.html). Each milestone is playable on its own. The plan and its
answers to the open questions are approved (2026-10-18).

## Milestone 6: The keeper and the lighthouse

- [x] Rules: projects in steps, giving, building overnight, built names and the map as of today, Marlow's day (save v4)
- [x] The map grows east: the point, the lighthouse, the board's spot, brambles, a broken bridge to tease the cove
- [x] Driftwood on the beach and branches under the trees each morning, and the storm when Marlow arrives
- [x] Marlow (Talk, his notes), the Village Board, Give from the hotbar, the board and project cards, and the book's Village page
- [x] Light the lighthouse in three steps: the cheer on both screens, building overnight, the morning's village lines, the opening card at dusk, the glow every night
- [x] Night fishing at the point (three fish) and the view from the top

## Milestone 7: Skills, badges and porches

- [x] Farming, fishing and foraging levels with small perks, on the You card behind your face (save v5)
- [x] Badges, with silhouettes for the ones still to earn
- [x] The board's Your home tab and the porch upgrade

## Milestone 8: The garden shop and the seasons

- [x] The boardwalk and the garden shop project
- [x] Ten new crops and gentle seasons (save v6)
- [x] Tool upgrades: big can, wide hoe, good rod, bug net, shell basket (the sprinkling can waits for stone from the cove, Milestone 9)
- [ ] The garden upgrade for houses (not started: moved to Milestone 9, see docs/reports/milestone-8.md)

## Milestone 9: The bridge and the cove

- [ ] The bridge project and the hidden cove (save v7)
- [ ] Rock pools and their book page, cove fish and shells, stone among the rocks
- [ ] Beach decorations at the store, and the bedroom upgrade

## Milestone 10: The café and the workbench

- [ ] The café project; cooking and small treats (save v8)
- [ ] Making things from materials at Marlow's workbench
- [ ] The kitchen upgrade

## Milestone 11: The tailor's

- [ ] The tailor's project; hats, dyes and new looks; the Wardrobe (save v9)
- [ ] Wallpaper and floors for your rooms, a roomier bag, the loft upgrade

## Milestone 12: The orchard and the greenhouse

- [ ] The orchard project and six fruit trees (save v10)
- [ ] The greenhouse project: any seed in any season
- [ ] Marlow's last note (for now)

## Later

Weather, day/night lighting, animals, villagers, more music, festivals, a museum for the collection.
