# Cozy Farm

A cozy seaside farming game for two, played together in the browser.

## Play

1. Make sure Docker Desktop is running on the PC. If the farm isn't up, run `npm run farm:up`.
2. On each laptop or phone, switch on the **Tailscale** app.
3. Open **https://msi.tailbddd5f.ts.net**.

The old address, **http://100.82.139.111:8080**, still works too. With that one, type the `http://` part, or the browser tries HTTPS and fails.

### Put it on your phone's home screen

The game then opens full screen like an app, with no browser bars. With Tailscale on, open **https://msi.tailbddd5f.ts.net**, then:

- **iPhone (Safari):** tap **Share** (the square with an arrow; on newer iPhones it's inside the **···** menu), scroll down, tap **Add to Home Screen**, leave **Open as Web App** on if you see it, and tap **Add**.
- **Android (Chrome):** tap **⋮** (top right), then **Add to Home screen** or **Install app**, and confirm with **Install**.

The first time you open it from the home screen, it asks **Who's playing?**, because the home-screen app keeps its own settings: tap your name to get your own bag back (or **Someone new** the very first time). Tailscale still has to be on whenever you play.

### How to play

| | Phone | Laptop |
|---|---|---|
| Walk | Put a thumb down anywhere and drag (a light push just turns you) | W A S D or the arrow keys |
| Do what the round button says (Dig, Plant, Water, Pick, Pick up, Catch, Fish, Sleep, Crate, Seeds, Shop, Board, Give, Talk, Climb, Home, Visit, Move in, Leave, Place) | Tap the big round button; hold it while walking to do a whole row | Space or Enter (hold to repeat), or click a tile next to you |
| Fish | With the rod, face the water and tap Fish. When the bobber dips, tap anywhere; then hold to reel, and let go while it pulls. Stop reels in | The same with Space; Esc or walking off reels in |
| The collection book | The book at the top right, or Book in the bag | C |
| Go in or out of a house | Walk into its door, or off the mat inside (or tap Home, Visit, Leave) | The same, with the keys |
| Arrange furniture or decorations | The hammer (Arrange) above the bag, or Place with furniture in hand. Then drag to move the frame (or tap a tile), Place, Turn, Put away, Done | F; then the arrow keys or the mouse, Space or a click, R, Del, Esc |
| Pick what's in your hand | Tap a slot along the bottom | 1–8, Q / E, or the mouse wheel |
| Open your bag | The bag button | B or Tab |
| Wave / heart | The two small buttons | Z / X |
| Look round from the top of the lighthouse | Drag to look round; Down comes back | The arrow keys; Esc |
| See your skills and badges, or change your name or look | Tap your face at the top right (a gold dot means something new) | Click it |
| Close a card, get out of bed, stop arranging or fishing | The ×, Get up, Done or Stop | Esc |

Dig in the farm field, plant seeds, water them, and go to bed in the tent by the farm gate: watered crops grow overnight. Pick what's ripe, put it in the shipping crate on the dock, and it sells overnight for coins you share. Buy more seeds at the stand by the beach path.

Move into one of the two cottages in the meadow above the farm, visit each other, and sleep in your own bed. Buy furniture and decorations at the little green shop by the path, and arrange them in your house or out on the farm.

Fish off the dock, the beach and the end of the dock (different fish at different spots and times of day), pick up the shells and sea glass that wash up on the beach each morning, and catch butterflies in the meadow (fireflies after dark). Everything new goes in the collection book you share; it all sells in the crate too.

Marlow, the old lighthouse keeper, stands by the Village Board next to the seed stand. Driftwood washes up on the beach and branches fall under the meadow's trees each morning: pick them up, walk up to the board holding something it wants and tap **Give** (or tap **Board** to see what's wanted and give from there). When a step's last thing goes in, it's built overnight. **Talk** to Marlow for his notes. Once the lighthouse on the point is lit, it shines every night, night fish bite off the point after dark, and you can **Climb** it for the view. The book's **Village** page shows the board from anywhere.

Farming, fishing and foraging each get better as you do them: every level brings a little something (planting waters the tile too, bites come sooner, finds glint more, and gifts for your house), with a card on your own screen. Badges come for all sorts of things, and the village's go to both of you. Tap your face at the top right to see them. Once the lighthouse is lit, the board's **Your home** tab has a porch for each cottage: either of you can give to either, and Marlow builds it overnight, with a bench and a lantern that lights at dusk.

## Develop

1. Run `npm install` once.
2. Run `npm run dev`, then open http://localhost:5173.

See [CLAUDE.md](CLAUDE.md) for how the project is organized, and [docs/](docs/) for the design and roadmap.
