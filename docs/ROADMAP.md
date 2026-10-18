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
- [ ] Pick the art pack; move the map into Tiled

## Milestone 2: Farming (the first version to show her)

- [ ] Hoe, seeds, watering can; touch-friendly hotbar and inventory
- [ ] Day clock (only while playing); sleeping ends the day
- [ ] Crops grow day by day; harvest
- [ ] World saved to SQLite (versioned) and restored after restarts
- [ ] Separate dev save, so testing never touches the real farm
- [ ] Nightly backup of the save to OneDrive

## Milestone 3: Shop and coins

- [ ] Shipping crate and shared wallet
- [ ] General store: seeds and furniture

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

Seasons, weather, day/night, cooking, animals, villagers, music, festivals.
