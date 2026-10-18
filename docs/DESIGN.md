# Cozy Farm: Design

Items marked **(proposed)** are Claude's suggestions and haven't been confirmed yet. Change anything.

## Vision

A cozy seaside village the two of us build together in the evenings: farming, decorating, and collecting at our own pace, side by side.

## Pillars

1. **Together, not competing.** Everything is nicer with two, but nothing requires two. No scores, no racing each other.
2. **No stress.** Nothing dies, nothing is lost, no timer punishes you. The watering can never runs dry and there's no energy bar.
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
| Look | A name (up to 12 characters) and one of 12 Ninja Adventure characters, picked on first join and remembered on that device. Change it any time from the button in the top right (since Milestone 7: your face opens the You card, and **Change name or look** is at its bottom). Looks saved with the old shirt colors load as a similar-looking character. | 2026-10-18 |
| Emotes | Wave and heart, as buttons next to the Action button (keys Z and X; 1–8 are the hotbar now). A bubble shows above your head for 2 seconds, for everyone. | 2026-10-18 |
| Who's playing | Bags belong to farmers, not devices. A new device (or the home-screen app the first time) asks "Who's playing?": tap your name to get your own bag back, or Someone new. The device remembers the choice. If the same farmer opens on a second device, the newest one wins and the older one says "You're playing on another device" with Play here. Farmer ids are made by the server and kept on the device. | 2026-10-18 |
| Farming rules | Crops never die; six starter crops, two of which regrow; the day ends when everyone online is in bed. Details under Time and Farming. | 2026-10-17 |
| Art pack | Ninja Adventure (pixel-boy, CC0) as the base, plus our own matching sprites for crops, beach and shells. | 2026-10-17 |
| Map | Painted in Tiled (`shared/world/village.json`). Hidden layers mark where nobody can walk and where farming is allowed; objects mark the spawn point and the spots for the shipping crate, tent, seed stand and store, and the two cottages with their rooms (drawn at the bottom of the map, below the sea). The server reads the same file. | 2026-10-18 |
| Places | The tent stands on the grass just left of the farm field's gate, and you appear (and wake up) at its door. The seed stand is beside the top of the sandy path down to the beach. The shipping crate is on the dock. The general store is just left of the seed stand, and the two cottages are in the meadow above it. Decided by Claude while the developer was away; easy to move in Tiled. | 2026-10-18 |
| Music | "Calm Village" from the pack loops softly, starting at the first tap or key press. A music button next to the look button mutes it, remembered on that device. | 2026-10-18 |
| Controls | An Action button for the tile in front of you (the plan's scheme A), saying what it will do; ripe crops get picked whatever you're holding; places (tent, crate, seed stand, store, doors, beds) take over the button; hold to repeat; a light joystick push turns on the spot. The game never switches tools for you, for now: watch how she plays. Details under Controls. | 2026-10-18 |
| Arranging | An arrange mode with a cursor (the plan's "move/rotate/place/cancel"): the stick, keys, a tap or the mouse move it; Place, Turn, Put away, Done. Placing keeps carrying the rest of a stack. Decided by Claude (Milestone 4). | 2026-10-18 |
| Phone held | Both upright and sideways work; the layout starts from upright with one thumb. Still to find out: how she holds it on the first evening. | 2026-10-18 |
| No stress, made concrete | The watering can never runs dry, there's no energy bar, crops never die, and midnight just sends everyone to bed. | 2026-10-18 |
| Bedtime | A shared tent by the farm gate until the houses (Milestone 4). The night starts when everyone online is in bed; if someone's phone drops while they're still up, it waits 30 seconds for them, then starts. A morning card says what grew and what sold. Details under Time. | 2026-10-18 |
| Shop in Milestone 2 | The shipping crate and a seed stand came into Milestone 2, so the radishes have somewhere to go and the coins something to buy. Milestone 3 becomes the general store with furniture. | 2026-10-18 |
| First-day tips | Four one-time tips per device (dig; plant and water; the tent ends the day; the crate), on top of the Action button's hints. | 2026-10-18 |
| Digging up crops | Left out of Milestone 2. Crops never die, so a wrong one just ripens. Add it if she asks. | 2026-10-18 |
| Houses | Two empty cottages in the meadow above the farm, the pack's 4 × 3 cottages (an orange one and a cream one). The first time a farmer walks up to a free one, Action says **Move in**; one tap makes it theirs, with a bed and a fern waiting inside. After that the door says **Home** to them and **Visit** to anyone else. Claiming on the spot, rather than handing out houses in the order farmers first joined, because the real save may hold a test farmer or two. A sign over each cottage says whose it is and who's in. Decided by Claude (Milestone 4). | 2026-10-18 |
| Rooms | One room each, 9 × 6 tiles of floor inside the pack's interior walls, drawn in the same Tiled map, out of sight below the sea: going through a door moves you there, and the camera shows just the room with the pack's dark background round it. You only see people in the same place as you. One map keeps everything the server already checks (positions, reach, places) working unchanged. Decided by Claude (Milestone 4). | 2026-10-18 |
| Beds | Any bed in any house works like the tent (Action says **Sleep** next to it), and the tent stays. In a house you wake up where you slept; outdoors, in front of the tent. Decided by Claude (Milestone 4). | 2026-10-18 |
| General store | A little green-roofed shop (the pack's) just above the sandy path, two steps left of the seed stand, so the two make a small market. It sells furniture and farm decorations; the seed stand keeps the seeds. Same card as the seed stand, in two shelves ("For your house", "For the farm"), starting at 1 with quick buttons 1 and 10. Decided by Claude (Milestone 3). | 2026-10-18 |
| Where to fish | Facing the water with the rod: off the sides of the **dock**, from the **shore** (any sand or grass at the sea's edge), and the **deep water** off the dock's end (a `deepWater` rectangle in Tiled). Water, sand and grass are read from the map's Ground terrain, so new beach painted in Tiled just works. All 12 fish in the merged list can be caught. Decided by Claude (Milestone 5). | 2026-10-18 |
| The fishing rod | Every new farmer starts with one. The save upgrade (version 3) put one in each existing farmer's first empty bag slot; a farmer whose bag was full gets it the next time they join with a free slot. It isn't sold anywhere. Decided by Claude (Milestone 5). | 2026-10-18 |
| Who plays the fishing minigame | The server picks the fish when you cast (from the spot, the time of day and its own random seed) and your device plays out the bite and the reel with the merged rules, then says it's landed; the server checks there was a cast, enough time passed and the size fits, then the fish goes in your bag and the book. Holding through tugs needs instant feedback, and a round trip over Tailscale's relay would feel sticky. Two trusted players. Decided by Claude (Milestone 5). | 2026-10-18 |
| Fishing controls | One button: tap when the bobber dips, hold to reel, let go while it pulls. The Action button, Space, or a touch **anywhere** on the screen all count (the joystick is off while fishing). A strip at the top of the screen says what to do and shows the reel; **Stop** (in the bag's place), Esc or walking off with the keys reels in. Decided by Claude (Milestone 5). | 2026-10-18 |
| Bugs | Six kinds by time of day: four butterflies in the daytime (two from the pack, two recoloured) and, after dark, fireflies and a luna moth. 3–6 flutter over the meadow's open grass at once; a new lot every two game hours. Next to one, Action says **Catch**, whatever you're holding: no net. They aren't saved (they come and go like weather). Decided by Claude (Milestone 5). | 2026-10-18 |
| Beachcombing | The merged rules: 2–5 finds each morning on beach sand (plain sand within 5 tiles of the sea, so not the path up to the farm), at most 10 at once, never on a decoration or round the crate. The first tide also came when the server first started after the update. Facing one (or standing on it) Action says **Pick up**, whatever you're holding; holding the button picks up a row. Decided by Claude (Milestone 5). | 2026-10-18 |
| Collection book | One shared book: Fish, Beach and Bugs pages. Found things in colour with how many, who found the first and (fish) the biggest; the rest are silhouettes with a hint of where to look. "9 of 23 found" at the top. Opens from a book button at the top right (key C) and a Book button in the bag. Decided by Claude (Milestone 5). | 2026-10-18 |
| Celebrations | A first discovery puts a card at the top of both screens ("New in the collection book! Sea Bream, caught by Pip") with the pack's success jingle, confetti and a heart over the finder. A bigger fish than ever gets a smaller card; a full page and a full book get their own. Tapping a card opens the book. Decided by Claude (Milestone 5). | 2026-10-18 |
| Fish pictures | Our own 12 fish icons, drawn in `tools/sprites/fish.ts`: the pack has only three small fish, all one shape, and the book needs each fish to look like itself. Decided by Claude (Milestone 5). | 2026-10-18 |
| Progression | Restore the seaside village together: big shared projects guided by one old lighthouse keeper, fed by everything you already do, plus personal skills, badges, house upgrades and outfits. Details under Restoring the village; the plan is `docs/plans/progression.md`. | 2026-10-18 |
| The plan's open questions | The developer approved the progression plan and every suggested answer in its section 7 (the keeper is Marlow, the board by the seed stand, built overnight, one project at a time, gentle seasons with the garden shop, the map growing east, and the rest). They're written into Restoring the village below, no longer "proposed". | 2026-10-18 |
| The village's name | Still open, like the game's. It lives in one constant, `VILLAGE_NAME` in `shared/content/keeper.ts` ("the village" for now), and Marlow's lines say `{village}` where it goes, always mid-sentence, so picking a name is a one-line change. | 2026-10-18 |
| Marlow's arrival | On the real farm, the first time the server starts after Milestone 6 on a world past its first day; in a new world, the morning of day 2. He comes with a storm: 10 driftwood on the beach and 6 branches under the trees instead of that morning's usual few, so the first step can be done on the first evening. Nothing lies about before he comes. The morning card the day he arrives says a little boat is tied up at the dock; his first note greets each farmer once on each device. Decided by Claude (Milestone 6). | 2026-10-18 |
| Giving | Only the step being gathered takes gifts, and once its last thing is in, nothing more goes in until it's built that night: at most one step a night. The Action button's **Give 7** gives the held stack (only as many as are wanted, so holding a rare fish and tapping Give gives that fish); the card's **Give** buttons give from the whole bag, cheapest first for "any of a kind". No "Choose" link: holding the one you want and tapping Give does the same. Decided by Claude (Milestone 6). | 2026-10-18 |
| The lighthouse's look | Our own sprite in four states (dark and boarded up, scaffolded with the door open once the stairs are mended, mended with a dark lamp, lit), drawn in code at its spot rather than as Tiled layers, like the store and the seed stand. The brambles are a Tiled layer. Decided by Claude (Milestone 6). | 2026-10-18 |
| Skills | Farming, fishing and foraging, levels 1 to 10 on the plan's curve (30, 90, 190, 340, 550, 830, 1,190, 1,640, 2,190), experience from the plan's table (a pick is its crop's days to ripen, 2 for one that grew back; a fish 4/7/12 by rarity, +3 for a record, 1 for one that got away after it was hooked; a find or a bug 3/5/10, driftwood or a branch 1). Personal and never compared: only your own screen hears about your levels, and no numbers float over your head while you play. Everyone starts at level 1: nobody gets experience for play before the update. Details under Skills, badges and porches. Decided by Claude (Milestone 7). | 2026-10-18 |
| Perks | Every perk in the plan's table, at its level, small and only for whoever earned it (Extra tide's extra find is for everyone). The numbers are in `PERK`, `shared/content/skills.ts`. Rock-pool luck (Foraging 9) and Messages in bottles (Foraging 10) show on the You card with "starts once the cove is open" / "once Marlow's workbench is open" and start working in Milestones 9 and 10. The straw hat (Farming 4) is a decoration until hats can be worn (Milestone 11). Decided by Claude (Milestone 7). | 2026-10-18 |
| Level gifts | The plan's six (a straw hat on a stand, a mounted fish, a shell wreath, a golden watering-can planter, a lobster pot, a butterfly jar) are our own sprites, put down in your house or on the farm. They go straight into your bag; with a full bag the level's card says to make room, and the gift comes by itself the next time there's room (or when you next join). The store never sells them; the crate takes them for half, like furniture. Decided by Claude (Milestone 7). | 2026-10-18 |
| Badges | 26 for now: the plan's list, less the four for places not built yet (Open for Business, Bridge Builder, Orchard Keeper, Village Restored come with their milestones), plus one for the top of each skill (Top of the Crop, Sea Legend, Treasure Hunter). The village's (Lamplighter) and Full Book (the book is shared) go to everyone at once; the rest are yours. Kindling counts driftwood and branches (stone joins in Milestone 9); Helping Hand and Pillar count things given, never coins; Side by Side counts nights when two of you were in bed as the night came; Sleepover is a night in a bed in the other's cottage; Up the Lighthouse is climbing it from 6 pm; Night Owl a fish landed from 10 pm; Porch Sitter goes to whoever lives in the cottage. Decided by Claude (Milestone 7). | 2026-10-18 |
| Past play and badges | Counts start from the update (nothing recorded who caught or picked what before), so the counted badges start at nothing. Badges that follow from the world as it stands are given the first time each of you joins after the update: Moved In for a cottage of your own, Lamplighter if the lighthouse is already lit, Full Book if the book is already full. Homemaker counts pieces put down from the update (lifting one and putting it down again counts). Decided by Claude (Milestone 7). | 2026-10-18 |
| The You card | Your face at the top right opens it (with a gold dot when there's a level or a badge this device hasn't shown you): Skills (each skill's bar, level, today's experience, your title and the next perk, then your perks) and Badges (earned ones first in gold, the rest as "?" silhouettes with their hint; tap one to read about it, with how far along a counted one is), and **Change name or look** at the bottom. No Wardrobe tab until Milestone 11. A level or a badge brings a small card at the top of your own screen with the jingle and a twinkle over your head; tapping it opens the You card. Decided by Claude (Milestone 7). | 2026-10-18 |
| House upgrades | One-step projects per cottage (`house1:porch`), on the board's second tab, **Your home**, each going up once something in the village is built (the porch after the lighthouse). Several can be up at once. Anyone gives to either house; the Action button's **Give** gives to the village's project first, then your own cottage's, then the other's. The last thing in cheers on both screens ("That's everything for Pip's porch!"), it's built overnight, and the morning card says whose cottage has one now, with Look. No opening card. Marlow's note for each is kept with his others. The upgrades still to come (garden, bedroom, kitchen, loft) show faded under your own cottage with when they come. Decided by Claude (Milestone 7). | 2026-10-18 |
| The porch | Decking across the cottage's front row, a lantern on a post left of the door and a bench two tiles wide to the right, so the way to the door stays open. Our own sprites, drawn in code at each cottage like the lighthouse; the lantern and bench are walled off by the map's `Collision porch house1` layers. The lantern lights at dusk with a small warm halo over the evening tint. 12 driftwood, 8 branches and 2,000 coins, as the plan says. Decided by Claude (Milestone 7). | 2026-10-18 |
| Crops that grow back | A tile remembers a crop grew back after a pick (saved since version 5), so only picks of a regrown strawberry or samphire count for less; the first pick of one grown from seed counts in full. Golden crops count as their crop at the board and for Every Crop. Decided by Claude (Milestone 7). | 2026-10-18 |
| The garden shop project | The village's second project, up on the board the morning after the lighthouse is lit: Mend the boardwalk (12 driftwood, 10 branches, 800 coins), Patch up the shop (8 driftwood, 5 radishes, 5 carrots, 1,200 coins), Fill the seed drawers (4 of any bug, 5 strawberries, 5 sea samphire, 1,500 coins), one step a night like the lighthouse, with the cheer, the morning card and Marlow's notes. The plan's second step also asked for 3 potatoes: dropped, because a step asks for two to four things (the plan's own rule, and the card's layout). It opens with the morning (not at dusk like the lamp), with its opening card. Decided by Claude (Milestone 8). | 2026-10-18 |
| Where the garden shop stands | Where the clump of three bushes stood, east of the board and the cherry tree (columns 41–44, rows 13–15), its door looking down onto the boardwalk. The bushes' bottom row was already a wall, so the shop's is the same wall and nothing anyone could walk on is lost. It's the pack's little shop with the sign, given a green roof, our own sign (a pot with a seedling), flower boxes and a potting bench beside it, drawn in code in four looks: boarded up and weathered, patched (the boards off, the door shut), open, and its opening day with bunting. An honesty box, no shopkeeper. The plan's spot (columns 38–41, rows 15–17) was open grass people could walk and decorate on. Decided by Claude (Milestone 8). | 2026-10-18 |
| The boardwalk | Two rows of the dock's planks along the top of the beach, rows 17–18, from the market (column 31) past the shop's door to the inlet by the old bridge (column 65), shown from the first step. Walking is the same with or without it: here the shore is a straight strip of sand, so there's nowhere for stilts, and the plan's rows 19–20 would have run half over the water's edge. A palm on the strip moved out of its way. Nothing washes up on its planks. Decided by Claude (Milestone 8). | 2026-10-18 |
| Seasons | Spring, summer, autumn and winter, 14 days each, from the morning the garden shop opens (that day is Spring 1). Only `yearStart`, the day spring first came, is saved (version 6); the season is worked out from the day. The clock card says the season's day ("Spring 3 · 9:40 am") once they begin, the morning card's title too ("Good morning! Spring 3"), and each season's first morning says it's come and what it brings. History keeps the day count ("Lit on day 16"). Decided by Claude (Milestone 8). | 2026-10-18 |
| Planting in season | Outdoors (everywhere, until the greenhouse), the garden shop's seasonal seeds only go in during their season; the hint says when ("Peas: plant in spring. Keep the seeds till then."). The six starter crops, wheat and cotton grow all year. Anything in the ground always finishes, whatever the season. A crop that grows back (peas, tomatoes, cranberries), picked out of its season, gives that pick and makes way (the soil stays dug): nothing dies, but it doesn't keep cropping all year. Seeds keep in the bag. Decided by Claude (Milestone 8). | 2026-10-18 |
| The ten new crops | The plan's numbers: peas (spring, 4 days, then every 2), cauliflower (spring, 8), tomato (summer, 6, then every 3), melon (summer, 10), beetroot (autumn, 4), cranberries (autumn, 6, then every 2), kale (winter, 4), leek (winter, 5), wheat and cotton (all year, 4 and 6). Melons and leeks have six growth pictures, so crops.png's rows grew to eight columns. The packets say "Pea Seeds" and "Cranberry Seeds". Only the garden shop sells them; the seed stand keeps the six. Our own sprites. Decided by Claude (Milestone 8). | 2026-10-18 |
| The garden shop's card | Two tabs. **Seeds**: this season's two, then wheat and cotton, bought like at the seed stand (tap, how many, Buy), then the rest of the year's faded with their season, next season first. Under the title: "Spring 7 · new seeds every season" and the honesty box. **Tools**: each upgrade with what it does, what it costs, and a button that says Upgrade (or Buy for a new tool), what you're still short of ("Need 3 more driftwood"), or Yours. Decided by Claude (Milestone 8). | 2026-10-18 |
| Tool upgrades | Personal, the plan's tiers and costs: a big watering can (1,500 coins, 8 driftwood) and a wide hoe (1,200, 8 branches) work on the tile in front and the ones either side, across the way you face, with three outlines; a good rod (2,000, 6 driftwood) makes bites come 30% sooner with a fifth of a second longer to hook, on top of the fishing perks; a bug net (800, 6 branches) catches bugs from a step further away; a shell basket (800, 6 driftwood) picks up everything lying within a tile of you when you Pick up one. Coins from the shared wallet, materials from your own bag. An upgrade takes the old tool's slot; the net and the basket need a free one, and work just by being in your bag (Catch and Pick up already work whatever you hold). The sprinkling can is shown faded until the bridge to the cove brings stone (Milestone 9). Hold to repeat works as before; a wide tool just covers more per step. Decided by Claude (Milestone 8). | 2026-10-18 |
| The seasons' look | Spring: the round trees in blossom (the second kind stays green) and a few petals drifting; summer: everything green; autumn: gold and red trees, golden grass and falling leaves; winter: snow on the trees and the grass, and snowflakes. The pines stay green. The pack's blossom and snowy trees, our autumn recolours of its round trees, and our recoloured grass, swapped in on the night the season turns. Before the seasons begin, the village looks as it's painted. Decided by Claude (Milestone 8). | 2026-10-18 |
| Marlow and the new place | The day a project opens with the morning (the garden shop), Marlow stands by its door all day under the bunting, then goes fishing as usual. His small talk knows the boarded-up shop, planting in season, and each season. Decided by Claude (Milestone 8). | 2026-10-18 |
| Coming later on the board | Once Marlow is here, the board lists the projects after the furthest one up as silhouettes with a hint ("Something on the boardwalk · Mrs Penhallow's old shop…"). After the garden shop there's nothing more yet, so the board says Marlow is still drawing up the next plan. Decided by Claude (Milestone 8). | 2026-10-18 |
| Badges in Milestone 8 | Open for Business goes to everyone when the garden shop opens (27 badges now). Every Crop now wants the ten new crops too, so it takes a year; anyone who already has it keeps it. Decided by Claude (Milestone 8). | 2026-10-18 |
| The garden upgrade | Not in this milestone (its scope was the shop, the crops, the seasons and the tools). The Your home tab shows "A garden" faded with "Marlow's still drawing it up". Decided by Claude (Milestone 8). | 2026-10-18 |
| An update that builds on the map | When the server starts, any decoration standing where an update has since put a wall (the garden shop's doorstep, say) moves to the nearest free spot, like one in the way of something built overnight. Nothing is lost. Decided by Claude (Milestone 8). | 2026-10-18 |

## Controls

One way of playing on every device: an Action button for the tile in front of you (like Animal Crossing or Stardew on a controller).

- **Hotbar:** the first 8 slots of your bag along the bottom. Tap a slot (or 1–8, Q/E, the mouse wheel) to hold what's in it; its name shows for a moment. The choice is remembered on the device, and a slot stays picked when it empties.
- **Action button** (bottom right, the biggest thing on screen; Space or Enter): it says what it will do for the tile in front of your feet, which gets a pulsing outline: **Dig** (hoe on farm-field grass), **Plant** (seeds on bare dug soil), **Water** (can on dry soil), **Pick** (a ripe crop, whatever you're holding). Next to a place it takes over: **Sleep** at the tent or a bed, **Crate** at the shipping crate, **Seeds** at the seed stand, **Shop** at the general store, **Garden shop** at the garden shop (Milestone 8), **Board** at the Village Board (or **Give 7** holding something it wants), **Talk** facing Marlow, **Climb** at the lit lighthouse's door, **Home**, **Visit** or **Move in** at a cottage's door, **Leave** on a room's mat. Facing a beach find, driftwood or a branch (or standing on it) it says **Pick up**, and next to a bug **Catch**, whatever you're holding. Facing something closed (the brambles, the dark lighthouse) it fades and its hint says Marlow has a plan for it on the board. With the fishing rod, facing water, it says **Fish**. Holding furniture where it can go, it says **Place** (see Arrange mode). When nothing would happen it fades, and tapping it gives a hint over your head instead ("Dig it with the hoe first."). These hints are the tutorial.
- **Hold to repeat:** keep Action (or Space) held after a press and walk: each new tile you face gets dug, planted, watered or picked, so a row is one stroke. On a phone, steer with one thumb and hold Action with the other.
- **Wide tools** (Milestone 8): holding the wide hoe or the big watering can, the outline covers the tile in front and the ones either side, across the way you face, and the button says Dig or Water if any of them wants it. Walking along holding the button does a band three rows wide.
- **Turn on the spot:** a light push on the joystick turns you without walking, so lining up on one tile is easy; push further to walk.
- On a laptop, clicking one of the 8 tiles around you acts there. Tapping a tile on a phone doesn't: a touch steers the joystick, and telling a tap from the start of a walk would make the stick flicker. Revisit if it's missed on a real phone.
- **Sounds** from the pack, soft: a scuff for digging and planting, a splash for watering, a pop for picking, coins for buying and for a morning with a sale, a little jingle for a quiet morning, and a click for the crate and opening cards. The other player's farming sounds play at half volume when it happens on your screen. The music button mutes everything.
- Ripe crops bob a pixel, so you can spot them across the field.
- **Bag** (the bag button, B or Tab): a card with all 24 slots, 8 × 3, the top row being the hotbar. Tap a stack to pick it up (a strip says what it is and what it sells for), then tap another slot to move it there: it moves, joins a stack of the same thing, or swaps. **Split** halves a stack into the first empty slot. With a mouse, drag and drop works too. Close with ×, Esc, B or Tab. Tap, then tap, is the main way on a phone: a drag starting on a small slot is easy to fumble, and tapping can't drop anything by mistake.
- **Emotes:** wave and heart next to Action (Z and X).
- **Fishing:** see Collecting. While fishing, the button says **Wait…**, **Now!**, **Reel** and **Let go**; a touch anywhere on the screen works as the button; **Stop** (Esc) reels in.
- **The collection book:** the book button at the top right, left of the music (key C), or **Book** in the bag.
- **The view from the lighthouse:** **Down** (Esc) in the bag's place, the stick or the keys look round; the hotbar and the Action button go while you're up there.
- **Wanted on the board:** picking a slot with something the board needs says so with its name ("Driftwood · wanted on the board"), and the bag's strip says how many more ("The lighthouse needs 3 more").
- **First-day tips:** small cards near the top of the screen, each shown once per device, that don't stop play (OK, or they go by themselves after 10 seconds): how to dig (on first joining), plant and water (after your first dig), the tent ends the day (after your first watering, or at 6 pm), and the crate (after your first pick). Later ones: the cottages, arranging, and for collecting: how to fish (the first time you pick the rod), where the fish are (after your first catch), the beach (after your first pick-up), bugs (after your first catch), and the book (after the first discovery); and for the village: the board (after Marlow's first note), driftwood and branches (after your first pick-up of one), and the point and the view (after the lighthouse's opening card); and for Milestone 7: the You card (after your first level or badge) and the porches (once they're up on the board). No tips while fishing. The words are in `client/src/ui/tipRules.ts`.
- **You** (Milestone 7): your face at the top right opens the You card (skills, perks, badges, and Change name or look). A gold dot on it means a level or a badge you haven't looked at yet.
- **Esc** closes whatever card is open, and gets you out of bed.
- Time never stops while a card is open: it's shared time.
- The watering can never runs dry and there's no energy bar ("no stress").

## Setting

A small seaside village: a farm on the grassy bluff, a path down to the beach, a wooden dock out over the water, and (from Milestone 6) the beach running on east to an old lighthouse on a rocky point, with a hidden cove past a broken bridge. Later (see Restoring the village): a boardwalk with shops, the cove with tide pools, an orchard and a greenhouse.

## Together

- Each player's name floats above their head.
- The other player is drawn about a quarter second behind where they really are, so they walk smoothly over a jittery connection instead of hopping.
- If the connection drops (Wi-Fi blip, phone waking up, server restart), the game keeps running solo, shows "Reconnecting…", and rejoins by itself, putting you back where you were standing. While you're away the other player sees you vanish, and you reappear when you're back.

## Time

- The clock runs only while someone is connected.
- Once the garden shop opens, the seasons go round, 14 days each (Milestone 8); the clock card says the season and its day.
- A day runs 6am to midnight and lasts about 15 real minutes. The clock card in the top left shows it in 10-minute steps; from 6 pm the sun becomes a moon, from 10 pm the card turns amber ("It's getting late"), and at 11:30 pm a bubble says "Nearly midnight. Time for bed!". From 5:30 pm a soft blue tint deepens over the world until midnight.
- The day ends when everyone online has gone to bed, so one player playing alone can end it. If nobody is online, the day never ends on its own.
- Still up at midnight? Everyone falls asleep where they stand and wakes up by the tent (or where they are, if they're in a house), with no penalty.

### Bedtime: the tent and the beds

- There's a shared tent on the grass just left of the farm gate, and a bed in every house. Walk up to the tent's door, or next to a bed, and the Action button says **Sleep**. Any bed works, yours or not.
- In bed your character disappears into the tent (or under the covers) and a "Zzz" floats over the tent or the bed for everyone there. Your screen dims, the controls go, and a banner says "Sleeping… waiting for Juno to go to bed" with **Get up**. Moving (joystick or keys) or Esc gets you up too.
- The other player's clock card shows a chip, "Pip is asleep", and time keeps going for them.
- When everyone online is in bed, the night starts: both screens fade to dark for a second. Overnight, watered crops grow, the soil dries, the shipping crate sells, the day moves on and the world is saved. Everyone in a house wakes up where they slept; everyone else side by side in front of the tent.
- If someone's phone locks or drops while they're still up, the night waits 30 seconds in case they come back, then starts. Someone whose phone locks while they're in bed just isn't online any more.
- After a server restart everyone's awake again and taps Sleep again.

### The morning card

- After the fade: "Good morning! Day 4", how many crops grew and how many are ready to pick, "Something washed up on the beach!" with a little picture of each find, what the crate sold (line by line) and the coins it made, and **Let's go**. A quiet night just says "Good morning! Day 4".
- The server keeps the last morning's report, so whoever was offline sees it when they next open the game. Each device remembers the last day it showed, so it shows once per device.

## Farming

- Till soil, plant seeds, water, harvest.
- Overnight, watered crops grow; unwatered crops just wait and never die. The soil dries out each night.
- Either player can water or harvest anything on the shared farm.
- Starter crops: radish, carrot, sea samphire, potato, strawberry, pumpkin. Samphire and strawberry regrow after harvest: the plant drops back one stage and ripens again.
- From the garden shop (Milestone 8): peas, cauliflower, tomato, melon, beetroot, cranberries, kale and leek, each planted in its season, and wheat and cotton all year. Peas, tomatoes and cranberries regrow while their season lasts.
- Growth times and prices live in `shared/content/crops.ts`. They're first guesses, to be tuned by playing.
- Dug soil stays dug forever. Watering lasts until the night; each morning shows which tiles need water again.
- One player alone can farm and end the day.
- Digging up a crop you don't want: left out for now (see Decisions).

## Money and shops

- One shared wallet, starting at 500 coins, shown under the time on the clock card.
- Each player has their own bag of 24 slots; the first 8 are the hotbar. Everyone starts with a hoe, a watering can and 10 radish seeds.
- A shipping crate on the dock, shared by both of you: whatever's in it sells overnight, at that night's prices, and the morning card says what sold. It has no size limit, and you can take things back out before night. Walk up to it and Action says **Crate**: the card shows what's in it (from both of you) and what it sells for tonight, with your bag underneath. Tap a stack in your bag to put the whole stack in (split it in the bag first to keep some); tap a line in the crate to take it back. Tools can't be sold, so they're faded. The crate's lid stands open while something's waiting to sell.
- The **garden shop** above the boardwalk (Milestone 8): this season's seeds and tool upgrades. See Restoring the village.
- A seed stand at the top of the sandy path down to the beach, on the way back from the crate. Walk up and Action says **Seeds**: its card lists the six seeds with how long each takes to ripen, whether it regrows, what the crop sells for, and the packet's price. Tap one to open it, pick how many with − and + (or 5 and 10; it starts at 5, or as many as the coins cover), and **Buy 5 for 100**. The button says why when you can't: "Need 20 more coins", "Your bag is full". Seeds only: tools never get lost, and furniture has nowhere to go until the houses.
- The **general store**, a small green-roofed shop just above the sandy path, left of the seed stand. Walk up to its door and Action says **Shop**: the same kind of card as the seed stand, with two shelves, **For your house** (beds, a sofa, chairs, tables, shelves, lamps, plants, rugs) and **For the farm** (fences, stepping stones, flowers, flower tubs, barrels, a scarecrow, a washing line, a fishing net, banners). Each line says where it goes, how many tiles it takes and anything special ("sleep in it", "walk over it", "turns"). It starts at 1, with quick buttons for 1 and 10. Seeds stay at the seed stand. The list is `shared/content/generalStore.ts`; the pieces and prices are `shared/content/furniture.ts`.
- Seeds and furniture sell back in the crate for half price, so a mistake isn't a total loss. Tools (the hoe, the can, the rod) can't be sold.
- Fish, beach finds and bugs sell in the crate at their own prices (`shared/content/fish.ts`, `items.ts` for the finds, `bugs.ts`): a sardine 20, a moonfish 260, a scallop 15, a starfish 60, a cabbage white 25, a luna moth 140.
- The general store also sells a **fish tank** for your house (our own sprite).
- All prices and amounts live in `shared/content/items.ts` and `shared/content/crops.ts`. They're first guesses, to be tuned by playing.

## Decorating

### Houses

- Two empty cottages stand in the meadow above the farm. Walk up to a free one's door and the Action button says **Move in**: tap it and it's yours, and you're inside, with a bed and a potted fern waiting ("Welcome home!"). One house each.
- Your own door says **Home**; the other's says **Visit**. Tapping it, or just walking into the door, takes you in. Inside you arrive on the mat by the door; **Leave** on the mat, or walking down off it, takes you back out in front of the door.
- Inside, the camera shows just the room, dark all round. You see whoever's in the same room; people outside see you vanish and come back out.
- A sign floats over each cottage: "Pip's house" (or "Empty cottage"), and while anyone's in, who: "Pip is home, Juno is visiting".
- Only the owner rearranges their house; anyone can visit and sleep in its bed.
- Each house's furniture is saved in tiles from the room's top-left floor tile, so the room can be moved in Tiled. The floor tile just inside the door is always kept clear, so nobody's ever shut in or out.

### Furniture and decorations

- Bought at the general store, carried in the bag like anything else (they stack), and sold back in the crate for half.
- **Furniture** goes in your own house; **decorations** go on the farm, outside the field. A few go either place (a potted fern, a lamp, a chair, flower tubs, barrels). Either of you can put decorations down or pick them up.
- Everything sits on the tile grid and blocks walking where it stands, except **flat** pieces (rugs, mats, stepping stones, the fishing net), which you walk over and which other pieces can stand on, and **flowers**, which you walk through. Tall things (lamps, bookshelves, banners) rise above their tiles, and you can walk behind their tops.
- **Turning:** each piece has the ways round its art has: a bed upright or on its side either way, a chair facing either way, a rug long or tall, and the fence straight across, straight up, or any of its four corners, so a fence can go all the way round. Pieces the pack only draws one way don't turn.
- Decorations stay off the farm field and its soil, off the paths up to doors, stands, the store and the tent, all round the shipping crate, and off where everyone wakes up, so nothing can ever be blocked off. In a room, the floor tile just inside the door stays clear. Nothing that blocks walking goes where someone's standing.

### Arrange mode

- **Getting in:** hold a piece in the hotbar and tap Action (it says **Place** where the piece can go); or tap **Place** on it in the bag; or the **Arrange** button (a hammer, key F) above the bag button, shown in your own house and outdoors.
- Your character stands still and the joystick (or WASD, the arrows) moves a cursor a tile at a time, repeating while held. On a phone a quick tap on a tile jumps the cursor there; on a laptop the cursor follows the mouse and a click acts. Outdoors the camera follows the cursor, so you can decorate anywhere.
- **Carrying a piece** it shows at the cursor, with a green frame where it fits and a red one where it doesn't: **Place** (Action, Space, a click) puts it down and keeps carrying the rest of the stack, so a fence goes down post after post; **Turn** (R) turns it; **Put away** (Del) stops carrying it, or puts a lifted piece back in the bag; **Done** (Esc) stops, and a lifted piece stays where it was.
- **Not carrying**, the cursor frames whatever's under it: **Lift** (Action) picks it up to carry, **Turn** turns it on the spot, **Put away** puts it straight in your bag. Tapping a furniture slot on the hotbar carries that instead.
- Turn, Put away and Done take the emotes' and the bag's places on screen while arranging; they fade when there's nothing to turn or put away. Nothing changes for the other player until Place, Turn or Put away, each one message to the server.

## Collecting

### Fishing

- Everyone has a **fishing rod** (a tool: it never wears out). Hold it in the hotbar, face the water from the dock, the beach, or the end of the dock, and the Action button says **Fish**.
- Tap it: you cast, and the bobber lands a tile or two out. **Wait for a bite** (the bobber bobs, and now and then nibbles, which isn't a bite yet). When it **dips and a "!" pops up**, tap (the strip at the top says "Tap now!", and phones buzz where they can). Then **hold** to reel it in, and **let go while it pulls** (the bar turns red). Holding through a pull only loses a little. Landed: the fish leaps into your hands, "A Sea Bream! 34 cm", and it's in your bag and the book.
- A miss is never a loss: "Too soon!", "It got away. Cast again!", "It slipped off the hook!", and you cast again. No bait, no breaking line, no energy.
- What bites depends on **where** (dock, shore, the deep water off the dock's end, and the point once the lighthouse is lit) and **when** (15 fish, some all day, some only mornings, afternoons, evenings or late at night; rarer ones less often and livelier on the line). By day the point fishes like the shore; from 6 pm its light draws in three night fish (lanternfish, cuttlefish from 8 pm, the rare conger eel from 9 pm) and squid. The list and numbers are `shared/content/fish.ts`; the minigame's timings are `FISHING` and `REEL_FEEL` in `shared/fishing/fishing.ts`. All first guesses.
- You see each other fish: the other player's rod, line and bobber show while they're at it.

### Beachcombing

- Each morning 2–5 things wash up on the beach's sand (scallop and cowrie shells, sea glass, a conch, now and then a starfish), at most 10 lying about at once. What and where follow from the world's own seed and the day, so a restart never re-rolls them. They glint now and then so you can spot them.
- Face one (or stand on it): **Pick up**. Hold the button to sweep a row. Whatever nobody picks up stays.

### Bugs

- A few bugs flutter over the meadow's open grass (not the farm field), a new lot every two game hours, by time of day: cabbage whites and brimstones in the morning, red admirals and common blues through the day, fireflies after 6 pm and the rare luna moth after 8 pm. Each one loops slowly round its spot.
- Walk up close and Action says **Catch**. Bugs aren't saved: after a restart the same lot is back.

### The collection book

- One book for both of you, three pages: **Fish** (15), **Beach** (5) and **Bugs** (6), 26 in all, and once Marlow is here a fourth, **Village**: the board as it stands, to read from anywhere (giving happens at the board). Found things in colour, with how many, who found the first and on which day, and for fish the biggest and who caught it; what's still out there is a silhouette with a hint ("Try the end of the dock.", "Out in the meadow after dark."). Tap one to read about it.
- A first discovery is cheered on both screens: a card at the top, the jingle, confetti and a heart over whoever found it. Bigger-than-ever fish get a smaller card, and a finished page or the whole book get their own.
- Later: a museum or aquarium that shows what you've found. For now there's a decorative fish tank at the store.

## Restoring the village

The next big feature, decided by the developer on 2026-10-18. The plan, with the content, pacing, map, save design
and build order, is [docs/plans/progression.md](plans/progression.md) (mockups:
[progression-mockups.html](plans/progression-mockups.html)).

- **What it is:** big shared projects that restore the village, Stardew's community centre or Animal Crossing's
  island upgrades in spirit. Not villager requests, daily checklists or a heavy storyline.
- **Contributions:** a mix of items and coins. Each project asks for a few kinds of things: crops, fish, beach finds
  and bugs, building materials, and coins, so everything you already do feeds in.
- **Guide:** one warm character only, an old lighthouse keeper. He tells the village's story in short notes and
  celebrates each finished project. No full villagers.
- **Projects (all wanted):**
  - Light the lighthouse: it glows at night, unlocks night fishing on the point, and gives a view of the village.
  - Rebuild the bridge to a hidden cove: tide pools, new fish, new shells, a little beach to decorate.
  - Reopen the boardwalk shops one by one: a tailor (outfits), a café (cooking), a garden shop (new seeds and tools).
  - Restore the greenhouse (year-round crops) and plant an orchard (fruit trees that grow over time).
- **Unlocks:** new places, bigger homes, better tools and crops, and new things to make (cooking, crafting, outfits
  and customization).
- **Sharing:** shared goals with personal touches. The projects and the village's progress are shared. Each player
  also has personal progress: house upgrades (more rooms, porch, garden); skills that level up (farming, fishing,
  foraging) with small perks, personal and never compared; achievements and badges; outfits and customization.
- **Pace:** little wins every session: something finishes or unlocks most times you play (a session is roughly 2–4
  game days, at about 15 real minutes each). Bigger milestones every week or two. Never grindy. The cozy pillars hold:
  nothing dies, nothing is lost, no punishing timers.
- **Decided with the plan** (its section 7, every suggested answer approved): the keeper is Marlow, the pack's OldMan3;
  the Village Board stands right of the seed stand; each project has three steps, built overnight, with a cheer on
  both screens when the last thing goes in (the lighthouse is lit at dusk the evening after); one village project at a
  time, plus home upgrades, the next ones shown as silhouettes once they're built; only the current step takes gifts;
  "any of a kind" gives the cheapest first; who helped shows as faces, never counts; the order is lighthouse, garden
  shop, bridge, café, tailor's, orchard, greenhouse; driftwood and branches wash up and fall each morning, and stone
  comes from the cove, all picked up with whatever you're holding (no axe or pickaxe); a project never asks for
  anything seasonal or a crop slower than 6 days; gentle 14-day seasons arrive with the garden shop; anyone gives to
  either house's upgrades; skills are personal and start at level 1; eating a dish gives one small treat; hats and
  looks first, dyes last; the view from the lighthouse at zoom 1; tool upgrades are personal; a storage chest waits to
  see whether the bag feels tight; the map grows east only, by 32 columns, so nothing saved moves; the book gets a
  read-only Village page; after the greenhouse, Marlow's "last" note and ideas for later.

### Marlow and the board (Milestone 6)

- **Marlow** stands beside the Village Board from 6 am, fishes off the end of the dock from 6 pm, and sits in his boat
  by the dock from 10 pm. Once the lighthouse is lit he fishes on the rocks at the point in the evening and goes up to
  the lamp room at night (out of sight). Where he is is a rule on the clock (`shared/world/keeper.ts`, his spots are
  points in Tiled), so both screens agree. He doesn't block the way.
- **Talk** (facing him, or standing right by him away from the board): his newest note in a paper card, if you
  haven't read it on this device, otherwise a line of small talk in a bubble over his head, picked by the time of day
  and what's built (`shared/content/keeper.ts`). Every note he's written is on the board, under **Marlow's notes**.
- **The board** has one note pinned on for each open project. **Board** opens its card: Marlow's line, what's up
  now (a picture, "Step 2 of 3 · Mend the stairs", a bar of how much is in, the helpers' faces), what's finished
  (with the day), and his notes. A project's card lists each need (how many are in, what you have and a **Give**
  button, a tick when it's all in, or where to find it), **Give everything I can** (never coins), who's helping,
  the next step faded, and what finishing it brings. The second tab, **Your home**, has each cottage's upgrades (Milestone 7).
- **Materials:** driftwood (3–5 a morning on the beach's sand, the tiles shells wash up on) and branches (3–5 a
  morning on open grass inside the map's `woods` rectangles, round the meadow's trees), at most 8 of each lying
  about, never anywhere you can't walk to yet. They stack to 99 and sell for 5, so the board is the place for them.
- **Marlow's luck:** while a step still asks for a particular beach find (sea glass for the lamp), it washes up about
  twice as often. Invisible, and it can't be gamed.
- **A step's last thing:** a card at the top of both screens with Marlow's face ("That's everything for the path! Pip
  brought the last of it. Marlow will clear it tonight."), the jingle, confetti and a heart over the giver. Every
  gift also floats "+3" up from the board on both screens.
- **Overnight** the step is built: the morning card's **In the village** shows each built step with Marlow's note and
  **Look**, which closes the card and glides the camera there and back. Anything built that stands in a decoration's
  way moves the decoration to the nearest free spot (nothing is lost).
- **The lighthouse** (10 driftwood, 6 branches, 300 coins; then 12 driftwood, 8 branches, 5 fish, 600 coins; then 2
  sea glass, 4 beach finds, 6 crops, 900 coins): the brambles across the path to the point go with the first step;
  scaffolding goes up and the door opens with the second; the third mends the lamp, and Marlow lights it at 6 pm that
  day. Then each device shows the opening card once (bunting, "The lighthouse is lit!", what's new, **Let's go see**).
  From then on it glows from dusk with a warm halo and a slow beam sweeping round over the sea, drawn over the
  evening tint. **Climb** at its door pulls the camera back to zoom 1 over the whole village; the stick looks round,
  **Down** or Esc comes back. At night the cottages' windows aren't lit yet (a later touch).
- **After the lighthouse** the garden shop's plan goes up on the board the next morning (Milestone 8, below).

### Skills, badges and porches (Milestone 7)

- **Skills:** farming (picking crops), fishing (landing fish, and a little for one that got away) and foraging (beach
  finds, bugs, driftwood and branches) each level up from 1 to 10. A level brings a perk at once:

  | Level | Farming | Fishing | Foraging |
  |---|---|---|---|
  | 2 | Plant and water: planting waters the tile too | Steady hands: a fifth of a second longer to hook | Bright eyes: finds glint twice as often |
  | 3 | A little extra: 1 in 10 picks gives one more | Quick bites: bites come 15% sooner | Light step: catch bugs from a step further |
  | 4 | Title Keen Gardener, and a straw hat on a stand | Title Keen Angler, and a mounted fish | Title Keen Forager, and a shell wreath |
  | 5 | Seed saver: 1 in 6 picks gives a seed back | Big ones: fish come a little bigger | Extra tide: one more find each morning, for both of you |
  | 6 | A golden watering-can planter | A lobster pot | A butterfly jar |
  | 7 | Bumper crop: 1 in 6 picks gives one more | Lucky line: rare fish bite 1.5 times as often | Armful: 1 in 4 driftwood or branches comes as two |
  | 8 | Title Master Gardener | Title Old Salt | Title Beachcomber |
  | 9 | Early riser: crops you plant start a day along | Gentle reel: tugs pull back a third less | Rock-pool luck (from the cove, Milestone 9) |
  | 10 | Golden crops: 1 in 20 picks is golden (3 times the price), and Top of the Crop | Double catch: 1 in 8 catches is two fish, and Sea Legend | Messages in bottles (with the workbench, Milestone 10), and Treasure Hunter |

  The fishing perks travel with the line, so your phone plays the bite and the reel the way the server would. A pick's
  extras only come if your bag has room for them; the pick itself never fails for one.
- **Badges:** First Catch, Angler (50 fish), Old Salt (250), Night Owl, Record Breaker; First Harvest, Green Thumb (100
  crops), Harvest Home (500), Every Crop; Shell Seeker, Butterfly Friend, Beachcomber (100 finds), Kindling (50
  driftwood or branches); Lamplighter (everyone's); Helping Hand (25 things given), Pillar of the Village (250); Moved
  In, Homemaker (20 pieces put down), Porch Sitter; Side by Side (10 nights), Sleepover, Up the Lighthouse; Full Book
  (everyone's); and the top of each skill. Earned ones keep the day. The rules are in `shared/progress/badges.ts`.
- **The You card** and the cards on your own screen: see the decisions above. The other player never hears about your
  levels; a village badge comes to both of you at once (the Lamplighter at dusk, as the lamp is lit).
- **Porches:** once the lighthouse is lit, the board's **Your home** tab lists each cottage someone lives in (yours
  first) with its porch: what it needs (12 driftwood, 8 branches, 2,000 coins) and a bar; tap it for its card with
  Give buttons and who's helping. Either of you can give to either. When it's all in, both screens cheer; overnight
  it's built; the morning card says "Pip's cottage has a porch now." with Look. The porch has decking, a bench, and a
  lantern that lights at dusk. What's still to come (a garden, a bedroom, a kitchen, a loft) shows faded.

### The garden shop and the seasons (Milestone 8)

- **The project:** the morning after the lamp is lit, *Reopen the garden shop* goes up on the board (it showed as a
  silhouette under "Coming later" until then). Three steps, one a night: mend the boardwalk (the planks appear along
  the top of the beach), patch up the shop (the boards come off its windows), fill the seed drawers (it opens). Each
  last gift cheers on both screens; each morning card says what was built, with Look. The morning it opens: "The
  garden shop is open, and spring has come!", then its opening card, Marlow by its door under bunting all day, and
  Open for Business for everyone.
- **The shop:** next to its door the Action button says **Garden shop**; its card has Seeds and Tools (see the
  decisions above). Before it opens the button fades, and its hint says it's boarded up.
- **Seasons:** 14 days each, spring first. The clock card and the morning card say "Spring 3"; a season's first
  morning says it's come. Seasonal seeds go in only in their season; everything in the ground finishes; a regrowing
  crop's out-of-season pick is its last. Trees, grass and a little drift of petals, leaves or snow change with them.
- **Tools:** each of you buys your own at the shop: the big can and the wide hoe work three tiles across, the good rod
  bites sooner, the net and the basket help from your bag.
- **Dev:** `dev.season("autumn")` (or `dev.season("spring", 14)`) and `dev.item("driftwood", 10)` make all of
  this quick to check.

### The map grows east (Milestone 6)

- 32 new columns (48 → 80), the same height, so no saved tile moves (a test holds the farm field, the places, the
  rooms and everywhere walkable in place). The old line of trees on the east edge opens at rows 8–13 onto a new
  meadow with a grove in its far corner; the beach runs on east to a sandy point with the lighthouse at its foot
  (columns 57–64), its neck walled by brambles until the path is cleared; past it an inlet with a broken bridge (its
  gap blocked until the bridge is mended in Milestone 9) and the hidden cove, closed off by a row of palms.
- Layers that come and go (`shownFrom`, `shownUntil`), objects that need something built (`needs`), and the `hint`
  on a gated wall are explained in CLAUDE.md under "Editing the map".
- A player rejoining somewhere they can't stand on today's map starts at the spawn point instead.

## Art and sound

- Ninja Adventure (pixel-boy, CC0) for tiles, characters, critters, items, UI and music. One artist, so styles don't clash.
- Our own sprites in its style for what it lacks: crop stages, tilled soil, beach sand, shells and sea glass, the shipping crate, the seed stand, a wave emote, the arrange/turn/done/book/stop icons, five seaside pieces for the store (a ship in a bottle, a life ring on a post, an anchor, a beach umbrella, a fish tank), twelve fish, a red and white bobber, a firefly, and for the village: the lighthouse in four states, the Village Board, brambles, driftwood, a branch and three night fish; and for Milestone 7: a porch (decking, a bench, a lantern dark and lit), six level gifts (a straw hat on a stand, a mounted fish, a shell wreath, a golden watering-can planter, a lobster pot, a butterfly jar) and golden crops (each crop recoloured in gold); and for Milestone 8: ten more crops, five tool upgrades (the pack's can, hoe and rod in better metal, our net and basket), the garden shop in four looks (the pack's little shop recoloured, with our sign, boards, flower boxes, a bench and bunting), autumn round trees and the grass in autumn and winter. Badge medals are drawn in the page (CSS), round an icon the game already has. Three butterflies are recolours of the pack's (a cabbage white, a brimstone, a luna moth); the red admiral and the common blue are the pack's own, and the rod is the pack's on a 16×16 frame. The tent is the pack's own camp tent; the store and the cottages are the pack's houses; the rooms are its interior walls and floors; furniture is its beds, furniture and house props.
- Characters walk in four directions; you can walk behind tree tops.
- Music: "Calm Village" on a soft loop. The pack's "Peaceful", "Sunny" and "Aquatic" are imported too, for later (other times of day or places).
- Sound effects from the pack (see Controls). The waves sound is imported for later, for the beach.

## Later ideas

Weather, day/night lighting, animals (chickens, our own pets), villagers and friendship, festivals, a museum for the collection. (Seasons, cooking and the lighthouse are now planned under Restoring the village.)

## Open questions

- Our names and pets, if we want them in the game.
- What's the game called?
