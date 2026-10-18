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
