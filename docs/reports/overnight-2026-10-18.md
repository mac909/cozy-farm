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
