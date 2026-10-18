# Overnight report, 2026-10-18

## Milestone 2: Farming

Steps 5 to 9 of the Milestone 2 plan are built, on top of steps 1–4 (the rules, the clock and saving, Who's playing
and the hotbar, digging and planting). The real farm on :8080 hasn't been touched: it still runs the old build until
you run `npm run farm:up`.

### What the game can do now

- **A whole farming day for two.** Dig in the field, plant, water, and go to bed in the tent by the farm gate.
  Watered crops grow overnight; the soil dries; ripe crops bob so you can spot them. Pick them with anything in
  your hand.
- **Bedtime.** Walk up to the tent's door and the big button says Sleep. You vanish into the tent, a Zzz floats
  over it, your screen dims and a banner says who the night is waiting for, with Get up. The other player's clock
  says "Pip is asleep" and their day carries on. When everyone online is in bed, both screens fade to dark and you
  wake up side by side in front of the tent to a **morning card**: what grew, what's ready to pick, what the crate
  sold and the coins it made. If one phone drops while its player is still up, the night waits 30 seconds, then
  starts. At midnight everyone falls asleep where they stand. Whoever missed the night sees the card next time.
- **Evenings** get a soft blue tint; the clock turns amber at 10 pm and a bubble says "Nearly midnight" at 11:30.
- **The bag** (bag button, B or Tab): all 24 slots, tap to pick up, tap to put down, Split, drag with a mouse.
- **The shipping crate** on the dock and the **shared coins** (under the time). Put stacks in, take them back out,
  see what it sells for tonight; it sells overnight and the morning card lists the sale. The lid stands open while
  something's waiting.
- **The seed stand**, a little striped market stall beside the top of the beach path: all six seeds, with how long
  each takes and what it sells for; choose how many and buy. The button says why when you can't.
- **Feel:** hold the button (or Space) while walking to dig, plant or water a whole row; a light push on the joystick
  turns you on the spot; soft sounds for digging, watering, picking, coins and mornings (the music button mutes
  them); four one-time tips on a new device's first day.
- Everything from before still works: names and characters, Who's playing, emotes, music, reconnecting, and the
  save (checked by restarting the server mid-day: the field, both bags, the crate and the coins came back exactly).

### Decisions made (all in docs/DESIGN.md)

- Every open question in the plan got its suggested answer: the crate and a seed stand came into Milestone 2 (the
  roadmap's Milestone 3 is now just the general store with furniture); the shared tent; ripe crops picked with
  anything in hand, and no automatic tool switching; the night waits 30 seconds for a dropped phone; the can never
  runs dry and there's no energy bar (so the "No stress" pillar is no longer "proposed"); four first-day tips;
  digging up a crop left out for now.
- **Tapping a tile on a phone is left out.** On a phone a touch steers the joystick; telling a tap from the start of
  a walk would make the stick flicker. Clicking a tile next to you on a laptop still works. Worth trying on her phone
  and revisiting if she misses it.
- **Hold to repeat acts on the tile in front as you walk**, so walking right along the field digs the row you're
  walking on. Planting that row means walking back along it. Watch whether that feels natural to her.
- **Light joystick push = turn only** (under 40% of the stick's reach). Tune `TURN_ONLY_STRENGTH` in
  `shared/movement.ts` if it feels sticky.
- **The morning card shows once per device**, so a phone that missed the night shows it next time it opens.
- **The seed stand is our own sprite** (`tools/sprites/seedStand.ts`), since the pack has no market stall that fits;
  the tent is the pack's camp tent. Both stand on the spots marked in Tiled, with Collision under their bottom rows.
- **Save format unchanged.** Version 1 already had the crate, the coins and the last morning in it, so no migration
  was needed. It still hasn't shipped, so it's still version 1.

### Try it on a phone (no programming needed)

You need two phones (or a phone and the laptop), both with Tailscale on, after the farm has been updated with
`npm run farm:up`.

1. **Open the game** from the home-screen icon. It asks "Who's playing?": tap your name, or Someone new the first
   time. A small tip near the top tells you what to do first. Tap OK to close it (or wait).
2. **Pick the hoe**: tap the first slot along the bottom.
3. **Walk into the field**: put your thumb anywhere in the middle of the screen and drag towards the gate above the
   tent. A gentle push only turns you around, which helps you line up.
4. **Dig**: stand on the grass inside the fence. The big round button says Dig; tap it. Keep it held with your other
   thumb while you walk to dig a whole row.
5. **Plant**: tap the seed packet slot, face the dug soil, tap Plant.
6. **Water**: tap the watering can slot, tap Water on each planted tile. The soil turns darker.
7. **Go to bed together**: walk back down through the gate to the tent. At its door the button says Sleep. Tap it.
   Your screen dims and says "Waiting for (the other player) to go to bed". On the other phone, the clock now says
   "(you) is asleep". When the second person taps Sleep too, both screens go dark for a moment, and you both wake
   up in front of the tent with a "Good morning!" card saying the crops grew.
8. **Get up early**: if you went to bed by mistake, tap Get up, or just start walking.
9. **Repeat**: water every day and sleep. Radishes are ready after three watered nights; the button then says Pick,
   whatever you're holding.
10. **Sell**: walk down the sandy path to the end of the wooden dock. At the crate the button says Crate; tap it,
    then tap your radishes to put them in. Tap a line at the top to take things back out.
11. **Sleep again**: the morning card lists what the crate sold, and the coins under the clock go up on both phones.
12. **Buy seeds**: at the striped stall by the top of the beach path the button says Seeds. Tap a seed, choose how
    many with − and +, and tap Buy.
13. **The bag**: tap the bag button (bottom left) to see all your slots. Tap something, then tap another slot to
    move it. Split halves a stack.
14. **If one phone locks** while the other player is in bed, the night starts by itself after about 30 seconds.
15. Things to tell me: are the buttons and slots easy to hit, upright and sideways? Is anything hidden under the
    notch or the home bar? Does holding the button to do a row feel right? Is the light-push turn helpful or
    annoying? Is the evening tint too dark? Are the sounds too loud?

### Known rough edges

- **Not checked on a real iPhone.** Everything was checked in the browser pane, including the mobile viewport with
  a simulated notch and home bar, but not on a real phone: safe areas, the feel of the joystick and hold-to-repeat
  with two thumbs, and sounds (they only start after the first tap, a browser rule).
- **The crate doesn't say who put what in** (the mockup showed names). The crate just holds items; it's shared
  anyway.
- **No partial amounts** at the crate: a tap puts in the whole stack. Split it in the bag first to keep some.
- **The morning card can show in the afternoon** on a device that missed the night ("Good morning! Day 5" at 3 pm).
- **You can walk behind the tent's top** (like the trees), into the little gap between the tent and the fence.
- **The evening tint is flat**: it covers name tags too. Real day and night lighting is still a later idea.
- **Hold to repeat** skips the tile you start on (you're standing on it), as described above.
- I cleared my test browser tabs' saved choices and started the dev world over (`npm run dev:fresh`) for the full
  test, so your old dev save in `data-dev/` was replaced. The real farm's save wasn't touched.

### Still to do for Milestone 2 (step 10, yours)

- `npm run farm:up` to put this on the real farm, then check it on both phones over Tailscale.
- Once that's done, version 1 of the save has shipped: commit a sample save as
  `server/src/persistence/fixtures/world-v1.json` with a test that it loads (the plan's step 10), so every later
  change needs a migration.
- The nightly backup: create the scheduled task from the command in `scripts/backup-farm.ps1` (it needs you to
  approve it), run it once, and check the copy with `npm run farm:restore`'s check. It's the one Milestone 2 item
  not ticked in the roadmap.

### For Milestones 3–5

- **Places** are rectangles in the map's `Objects` layer, read by `parseTiledMap` (`shared/world/tiledMap.ts`) into
  `WorldMap` (`shared/world/map.ts`). Add a `PlaceId` in `shared/world/places.ts` and an entry in
  `chooseAction` (`shared/farming/actions.ts`) and the button takes it over; `Farming.ts` maps it to what tapping
  does. A furniture store, house doors, the dock's fishing spot and the beach can all be places like this.
- **Trades at a place** go through `server/src/rooms/trade.ts` (are you next to it and awake?) and a pure rule in
  `shared/economy/trade.ts` (`buyAtStand` is the model: stock list in `shared/content/`, prices in `items.ts`).
  The general store can reuse `ShopPanel` with a different stock list.
- **The night** is `endNight` in `shared/world/night.ts`: anything that should happen overnight (new shells on the
  sand, fish changing with the day) goes there, and its results can go in the `MorningReport` for the card
  (`client/src/ui/MorningCard.ts`, words in `morningText.ts`).
- **The save** is `server/src/persistence/worldSave.ts`. Houses and furniture, beach finds and the collection book
  each mean a new field on `World` and a migration (version 1 → 2 is `migrations[0]`), plus a fixture test.
- **Sleeping in houses** (Milestone 4): the tent is just the `tent` place plus `wakeSpots(map.tent)`. Each house's
  bed can be another place that sends the same "sleep" message; the night rule doesn't care where you sleep.

## Milestones 3 and 4: Store, houses and decorating

Built on 2026-10-18 by Claude, working on its own (the plan is `docs/plans/milestones-3-4.md`; every decision is
in `docs/DESIGN.md`). Nothing has been put on the real farm: it still runs Milestone 2 until you run
`npm run farm:up`.

### Your save is safe

- `server/src/persistence/fixtures/world-v1.json` is a version 1 save (two farmers, crops at every stage, the
  crate, coins, a morning report). `oldSaves.test.ts` loads it at today's version, both directly and through the
  SQLite store (which keeps the original in `save_archive`), and checks nothing was lost.
- The save is now **version 2**. The one migration (version 1 → 2) only adds two empty things: `houses: {}` and
  `decorations: []`. Your farm, bags, coins, crate and morning card come through untouched; every cottage starts
  empty, ready for each of you to move in. `world-v2.json` (houses, furniture, decorations) is the fixture for the
  new shape.
- I also loaded the v1 fixture into a scratch dev server and played it: the field, both bags, 735 coins, the crate
  and the morning card were all there, both cottages said "Empty cottage", and moving in worked. Your own old dev
  save was upgraded the same way earlier in the night.

### What's new for players

- **The general store**, a little green-roofed shop just above the sandy path, left of the seed stand. Walk up to
  its door and the button says **Shop**. Two shelves: **For your house** (four single beds and a big one, a sofa,
  chairs, tables, shelves, drawers, a lamp, plants, rugs, a ship in a bottle) and **For the farm** (fences, stepping
  stones, sunflowers and poppies, flower tubs, barrels, crates, a scarecrow, a washing line, a fishing net,
  banners, a beach umbrella, a life ring, an anchor). Same card as the seed stand; it starts at 1.
- **Houses.** Two empty cottages in the meadow above the farm. The first time you walk up to a free one, the
  button says **Move in**: one tap and it's yours, and you're inside with a bed and a potted fern waiting. Your door
  then says **Home**; the other's says **Visit**. Walk into a door to go in, or down off the mat to come out.
  A sign over each cottage says whose it is and who's inside ("Pip is home, Juno is visiting").
- **Rooms** show just the room, with the dark all round. You only see people in the same place as you.
- **Beds.** Any bed works like the tent (the button says **Sleep** next to it), and the tent is still there.
  Sleeping in your own bed with the other in theirs starts the night as before; in a house you wake up where you
  slept.
- **Arranging.** In your own house, or anywhere outdoors: hold a piece in the hotbar and tap **Place**, or tap
  **Place** on it in the bag, or the **Arrange** button (a hammer) above the bag. Your character stands still, and
  the stick moves a frame round the grid (a quick tap on a tile jumps it there; on the laptop the mouse moves it
  and a click acts). Carrying something, it shows green where it fits and red where it doesn't: **Place**,
  **Turn**, **Put away**, **Done**. Not carrying, the frame shows what's under it: **Lift** it to move it, **Turn**
  it on the spot, or **Put away**. Placing keeps carrying the rest of a stack, so fences go down post after post.
- **Furniture blocks walking**; rugs, mats, stepping stones and the fishing net lie flat (walk over them, and put
  furniture on them), and flowers you walk through. Beds turn (upright or on their side either way), chairs face
  either way, rugs go long or tall, and the fence has straight pieces and all four corners.
- **Decorations** go on the farm outside the field. Either of you can put them down or pick them up. They stay off
  the field and its soil, the fronts of doors, stands, the store and the tent, round the crate, and where you
  wake up, so nothing can ever be shut off.
- New one-time tips: where the cottages are (until you've moved in), what to do once you have, and how arranging
  works. A tip that gets covered by the morning card now comes back afterwards instead of being lost.

### Decisions I made (all in DESIGN.md)

- **The rooms are part of the same Tiled map** (10 rows added at the bottom, below the sea, out of sight). Going
  through a door moves you there. One map means the server's checks (positions, reach, places, beds) all work as
  they did, the other player's teleport is already smoothed, and "who's where" is just whose position is in which
  room. A separate map would have needed a second scene or map swapping plus a "which map" on every player.
- **Houses are claimed on the spot ("Move in")** rather than handed out in join order, because the real save may
  hold a test farmer or two, who would otherwise get her house.
- **The seed stand keeps the seeds**; the store only sells furniture and decorations.
- **Waking up**: in a house, where you are; outdoors, by the tent.
- **Beds**: any bed, anyone's. You can nap in each other's.
- **Arrange mode** rather than "face it and press Action": furniture and beds would fight over the Action button,
  and a cursor works the same with one thumb, keys and the mouse.

### Try it on a phone (no programming needed)

After `npm run farm:up`, on both phones with Tailscale on:

1. **Open the game.** If either of you missed last night you get the morning card first; then a tip says the
   cottages are waiting in the meadow.
2. **Move in:** walk up the meadow above the farm to one of the two cottages. At its door the big button says
   **Move in**; tap it. You're inside, with a bed and a fern. The other person takes the other cottage.
3. **Go out and in:** walk down off the mat at the bottom of the room to go out; walk up into your door to go back
   in. Over each cottage you'll see whose it is and who's inside.
4. **Shop:** at the little green shop by the path (next to the seed stand) the button says **Shop**. Buy something
   for the house (a rug and a chair are cheap) and something for the farm (a few fence pieces).
5. **Arrange your room:** in your house, tap the slot with the chair, then tap **Place**. Drag your thumb to move
   the frame (or tap the floor where you want it), and tap **Place**. Try **Turn**. Put the rug down and the chair
   on it. Tap **Done** when you're finished.
6. **Move something:** tap **Arrange** (the hammer), move the frame onto the bed, tap **Lift**, move it, **Turn**
   it on its side, **Place**. **Put away** puts a piece back in your bag.
7. **Visit:** walk to the other cottage's door; it says **Visit**. You can look round but not move things.
8. **Decorate outside:** outdoors, pick the fence and tap **Place**; put a few posts in a row, turning the end
   pieces into corners.
9. **Bedtime:** each go home, stand next to your bed and tap **Sleep**. When you're both in bed the night starts,
   and you wake up at home.
10. Things to tell me: is the frame easy to steer with a thumb? Is the tap-a-tile jump useful? Are the cottages in
    a good spot? Do the rooms feel too small or too big? Anything you'd like to buy that isn't there?

### Known rough edges

- **Not tried on a real iPhone.** Checked in the browser pane at phone size (upright and sideways), on a laptop
  layout, with two players, a night, and server restarts.
- **The rooms are plain**: one room each, the pack's top-down walls (no windows), and furniture stands anywhere
  on the floor (nothing hangs on walls).
- **Some furniture only faces one way** (sofa, shelves, tables): the pack only draws them from the front.
- **A page reload puts you back at the tent**, even if you were inside (this was already true everywhere).
- **The first tip after moving in sits at the top of the room** for up to 10 seconds; tap OK.
- **Nobody can move out** of a cottage once they've moved in, and there are two cottages. If a test farmer ever
  takes one, it needs a little save edit (or ask me for a "move out").
- While testing, a click on the world straight after a click on a HUD button was swallowed by Phaser (the HUD
  scene counts the pointer leaving its button as handling it). I fixed it for arranging by listening on the HUD
  scene; the Milestone 2 laptop click-a-tile-to-farm still listens on the world, so its first click after touching
  a button may be ignored. A real mouse that moves in between isn't affected.
- I replaced the dev save while testing (`npm run dev:fresh`). The old one is at
  `data-dev/saves.before-milestone-4.sqlite` if you want it back (rename it to `saves.sqlite`).

### For Milestone 5 (fishing, beachcombing, bugs, the collection book)

- **The save**: version 2 now. Beach finds and the collection book are a new field each on `World`
  (`shared/world/world.ts`), so `migrations[1]` (version 2 → 3) adds them (for example `beach: []` and the empty
  book), `validate` checks them, and a `world-v3.json` fixture joins `fixtures/`. `oldSaves.test.ts` insists on a
  fixture per version.
- **Places and spots**: a fishing spot on the dock can be a map place (`PlaceId` plus `placeArea` in
  `shared/world/places.ts`, `PLACE_ACTION` in `shared/farming/actions.ts`, a handler in `Farming.ts`'s `on`).
  Spots that aren't map rectangles (like doors and beds) go through `Spot` and the client's `spot()` (see
  `Homes.spot`).
- **Outdoors and indoors**: `areaOf(VILLAGE_MAP, position)` (`shared/world/houses.ts`) says whether someone is in
  the village or a room. The rooms are at the bottom of the map, so anything spawning on sand or grass must skip
  `map.houses[*].interior` (as `farmBoard` in `shared/decor/boards.ts` does for decorations), and the camera only
  shows `villageRect(map)` outdoors.
- **Decorations are on the farm too**: a beach find or a butterfly shouldn't land on a decoration that blocks
  walking (`world.decorations`, `blocksWalking` in `shared/content/furniture.ts`), and should stay off the
  `farmKeepClear` tiles.
- **The night**: `endNight` (`shared/world/night.ts`) is where new finds wash up; the morning card can list them.
- **A display for the collection** (an aquarium, a shell shelf) is just a new piece of furniture: data in
  `shared/content/furniture.ts`, its picture in `client/src/art/furnitureArt.ts` (our own sprites go in
  `tools/sprites/seaside.ts`), a line in `shared/content/generalStore.ts`.
- **Selling fish and finds** already works: the crate takes anything with a `sellPrice`.

## Milestone 5: Fishing, beachcombing, butterflies and the collection book

Built on 2026-10-18 by Claude, working on its own (the plan is `docs/plans/milestone-5.md`; every decision is in
`docs/DESIGN.md`). Nothing has been put on the real farm: it still runs what it ran until you run `npm run farm:up`.

### Your save is safe

- The save is now **version 3**. The one migration (version 2 → 3) adds four things and changes nothing else:
  the world's own random number (made from the farmers' ids, so the same save always gets the same beach), an
  empty beach, an empty collection book, and a **fishing rod in each farmer's first empty bag slot**. A farmer
  whose bag is completely full gets the rod the next time they join with a free slot. The last morning's card
  just gets an empty "washed up" list.
- `server/src/persistence/fixtures/world-v3.json` joins v1 and v2. `oldSaves.test.ts` checks that v1 and v2 come
  through with every bag, crop, coin, house and decoration as they were, plus the rod in the right slot, an empty
  beach and book, and that a second rod is never given; and that v3 keeps its beach, book, records, fish, finds
  and bugs.
- I also loaded the v2 fixture into a scratch dev server and played it as its Pip: 735 coins, the houses and the
  bag were all there with the rod in slot 6, the first tide had brought five finds, and I caught a sardine at the
  dock and picked up a starfish (both went into the book). The scratch save was thrown away afterwards.
- Your own dev save was upgraded the same way at the start (a copy from before is
  `data-dev/saves.before-milestone-5.sqlite`), and it's the one in `data-dev/` now, with my testing in it.

### What's new for players

- **Fishing.** Everyone has a fishing rod. Hold it, face the water from the dock, the beach or the end of the dock,
  and the big button says **Fish**. Wait while the bobber bobs; when it dips and a red "!" pops up over your head,
  tap; then hold to reel it in, and let go while the fish pulls (the bar at the top turns red). On a phone a touch
  **anywhere** on the screen works, as well as the big button; on a laptop, Space. A strip at the top says what to
  do. **Stop** (where the bag button was) or Esc reels in. A miss is just "It got away. Cast again!".
- **Twelve fish** by spot and time of day, from sardines all day to the moonfish off the end of the dock late at
  night. A catch leaps into your hands with its size ("A Sea Bream! 34 cm") and goes in your bag. You can see each
  other's rod and line.
- **Beachcombing.** Every morning 2–5 shells, bits of sea glass or the odd starfish wash up on the beach (at most 10
  lying about). They glint now and then. Face one and the button says **Pick up**; hold it to sweep a row. The
  morning card says "Something washed up on the beach!" with a little picture of each.
- **Butterflies and fireflies.** A few flutter over the meadow's grass, a new lot every two game hours: cabbage
  whites and yellow brimstones in the morning, red admirals and common blues by day, fireflies (softly glowing)
  after 6 pm and the rare luna moth after 8 pm. Walk up close and the button says **Catch**.
- **The collection book.** The book button at the top right (or C, or **Book** in the bag) opens one shared book with
  three pages: Fish, Beach and Bugs, 23 things in all. Found ones show in colour with how many, who found the
  first and when, and the biggest fish and who caught it; the rest are silhouettes with a hint of where to look.
- **Celebrations.** Something new in the book puts a card at the top of **both** screens ("New in the collection
  book! Common Blue, caught by Juno"), with the success jingle, confetti and a heart over whoever found it. A
  bigger fish than ever gets a smaller card. Tap a card to open the book.
- Fish, finds and bugs all **sell in the crate** at their own prices. The general store has a **fish tank** for your
  house. New one-time tips explain fishing, the beach, bugs and the book.

### Decisions I made (all in DESIGN.md)

- **The rod comes with the save upgrade** rather than being bought: nobody has to find or buy anything first.
- **Your phone plays the minigame; the server picks the fish.** When you cast, the server chooses the fish from the
  spot and the time with its own random number and sends the line; your device plays the bite and the reel and
  says when it's landed, and the server checks there was a cast, enough time passed and the size fits. Holding
  through a pull needs an instant response, and a round trip through Tailscale's relay (50–150 ms) would make it
  feel sticky. (You two are trusted players, as CLAUDE.md says.)
- **One button for fishing**, and the whole screen counts as that button, so it's one thumb with the biggest
  possible target. The joystick is off while fishing; walking off with the keys reels in.
- **Three fishing spots**: the dock's sides, the shore, and the deep water off the dock's end (a new `deepWater`
  rectangle in Tiled), so all 12 merged fish can be caught. Where the water, beach and meadow are is read from the
  map's Ground terrain, so painting new beach in Tiled just works.
- **The fishing strip sits at the top of the screen**: at the dock the camera stops at the map's edge, so you stand
  low on the screen, and a strip above the hotbar covered you.
- **No bug net**: Catch with whatever you're holding, like picking a ripe crop. Bugs aren't saved; they come and go
  like weather.
- **Our own fish pictures**: the pack has three small fish, all one shape, and the book needs twelve that look
  different. Three of the butterflies are recolours of the pack's.
- **The first tide comes when the server first starts after the update**, so the beach isn't empty on the first day.

### Try it on a phone (no programming needed)

After `npm run farm:up`, on both phones with Tailscale on:

1. **Open the game.** Your bag has a new fishing rod in it (look along the bottom; if it isn't there, open the bag
   and move it up into the top row).
2. **Fish off the dock:** walk down the sandy path onto the wooden dock and face the water at its side. Tap the
   rod's slot; the big button says **Fish**. Tap it. Wait. When the bobber dips and a red "!" shows over your
   head, tap anywhere. Then keep your thumb down to reel it in, and lift it while the bar is red. The fish jumps
   into your hands.
3. **The celebration:** the first time either of you catches a kind of fish, a card pops up at the top of both
   phones. Tap it to open the collection book.
4. **Try other spots and times:** the very end of the dock, facing out to sea, has different fish (big ones in the
   early morning and late at night); so does the beach at the water's edge. The book says where each fish you've
   found bites, and when.
5. **The beach:** walk along the sand. Shells and sea glass glint; face one and tap **Pick up** (hold the button
   and walk to pick up a row).
6. **Butterflies:** walk up into the meadow above the farm. When a butterfly is right next to you, the button says
   **Catch**. After 6 pm look for fireflies.
7. **The book:** tap the book at the top right (next to the music button), or **Book** in the bag. Tap the three
   pages; tap an entry to read about it.
8. **Sell some:** put a fish or a shell in the shipping crate, go to bed, and the morning card lists it, along with
   what washed up on the beach overnight.
9. **Buy a fish tank** at the green shop and put it in your house.
10. Things to tell me: is the bite too quick to tap in time? Is holding and letting go easy with one thumb? Is the
    strip at the top in the way? Are the butterflies too easy, too hard, or in the wrong places? Is the "!" easy to
    see?

### Known rough edges

- **Not tried on a real iPhone.** Checked in the browser pane at phone size with simulated touches (cast with the
  button, hook and reel with a thumb anywhere), and with two players on a laptop layout: fishing at the dock,
  shore and end of the dock at 10 am, 1 pm, 2:30 pm and 9 pm, a night in the tent with a sale and a tide, picking
  up, catching butterflies, celebrations on both screens, and a server restart (the beach and the book came back).
- **The bite window is short** (1.1–1.5 seconds, from the merged rules). If it's hard on a phone, tune `REEL_FEEL`
  in `shared/fishing/fishing.ts`.
- **Places win over butterflies.** A butterfly fluttering right by the seed stand or a door can't be caught from
  where the button says Seeds or Home; step round it. They keep off the doorsteps and paths themselves.
- **Bugs aren't saved:** after a server restart the current two-hour lot comes back, caught ones included.
- **Each screen draws the flutter from its own clock**, so if the two phones' clocks differ by a few seconds a
  butterfly may be in a slightly different place on each. Catching is generous on the server.
- **The butterflies are the pack's full 16-pixel size**, as big as a character's head. The fireflies glow softly
  under the evening tint.
- **The bobber lands right beside the dock** on its left side by the boat (the boat takes the tile further out).
- **A decoration can be put down on top of a beach find**, hiding it; it can still be picked up facing that tile.
- **If a phone locks mid-cast**, the fish usually gets away when it wakes (nothing is lost).
- **The fish tank is just a decoration**: it doesn't show the fish you've caught (a museum is a later idea).
- My fish pictures are a first pass (the moray eel is a bit of a caterpillar). They're grids in
  `tools/sprites/fish.ts`; `npm run sprites` re-renders them.

### For later milestones

- **A museum or aquarium that shows what you've found** would read `world.book` (`shared/collection/collection.ts`).
- **Seasons or weather** can change what bites and what's out: the fish and bug lists carry their times in
  `shared/content/fish.ts` and `bugs.ts`, and `cast` and `meadowBugs` pick from them.
- **New fishing spots** (a river, tide pools) are a `FishingSpot` in `fish.ts`, a rule in `shared/fishing/spots.ts`
  (or a rectangle in Tiled like `deepWater`), and fish that bite there.
- **The save** is version 3; the next format change is `migrations[2]` (3 → 4) and a `world-v4.json` fixture.
