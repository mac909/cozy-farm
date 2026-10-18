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
- [x] Day clock (only while playing); sleeping in the shared tent ends the day, with a morning card
- [x] Crops grow day by day; harvest
- [x] World saved to SQLite (versioned) and restored after restarts
- [x] Separate dev save, so testing never touches the real farm
- [ ] Nightly backup of the save to OneDrive (the script is ready: `npm run farm:backup`; the scheduled task comes once saving is wired in)

## Milestone 3: Shop

- [ ] General store: furniture (and the seeds, taking over from the seed stand)

## Milestone 4: Decorating

- [ ] A house interior for each player; visiting each other
- [ ] Place, rotate, and pick up furniture
- [ ] Outdoor decorations on the farm

## Milestone 5: Collecting

- [ ] Fishing from the dock
- [ ] Beachcombing for shells and sea glass
- [ ] Bugs and butterflies
- [ ] Collection book

## Later

Seasons, weather, day/night, cooking, animals, villagers, more music, festivals.
