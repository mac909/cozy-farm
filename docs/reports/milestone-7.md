# Milestone 7: Skills, badges and porches

Built on 2026-10-18 by Claude, working on its own from the approved plan (`docs/plans/progression.md`, its Milestone 7
phase and mockups 8–10, with every suggested answer in its section 7 taken as decided). Every decision is in
`docs/DESIGN.md` (the Decisions table, and "Skills, badges and porches" under Restoring the village). Nothing has been
put on the real farm: it still runs what it ran until you run `npm run farm:up` (exact steps at the end).

Commits: `ba6ede1` (rules and save version 5), `02a40c4` (skills, badges and the You card), `5aa0bed` (porches and the
board's Your home tab), `82cd17f` (docs and the art preview page), and this report.

## Your save is safe

- The save is now **version 5**. The one new migration (version 4 → 5, `migrations[3]` in
  `server/src/persistence/worldSave.ts`) only adds an empty `progress` to every farmer: level 1 in everything, nothing
  counted, no badges, no gifts. Everything else comes through untouched. Nobody gets experience for play before the
  update. Badges that follow from the world as it is (a cottage of your own, the lighthouse lit, a full book) are given
  the first time each of you joins, not in the migration.
- Two other things are saved from now on, both optional so older saves need nothing: a crop that has **grown back**
  after a pick is marked (`regrown`), and **house upgrades** sit among the village's projects as `house1:porch`.
- `server/src/persistence/fixtures/world-v5.json` joins v1 to v4: the lighthouse lit, Juno's porch built, Pip's half
  given, both of you with some experience, counts, kinds, badges and a gift, a regrown strawberry and a golden radish.
  `oldSaves.test.ts` checks that v1–v4 all come through with every farmer at level 1 and their bags, crops and village
  as they were, and that v5 keeps everything.
- Unknown skills, counts, badges or items in a save stop the server (like an unknown item always has), so a renamed one
  can never quietly vanish; changing the curve, the perks or the badge counts never stops a save loading.

### The upgrade rehearsal

- **Your real farm's newest backup** is `cozy-farm-2026-10-18_131821.sqlite` (13:18), and it's still **save version 3**
  (Milestone 5): day 10, 1,745 coins, one farmer (Mason Mccabe), ten dug tiles, house1 with six pieces, 15 things in the
  book. So either the farm is still on Milestone 5, or it moved to Milestone 6 after 13:18 and the nightly backup
  hasn't caught it yet. I rehearsed both:
  - **3 → 5:** copied the backup to a scratch folder (only read from OneDrive), and the dry run said
    `World "farm" loads (save version 3 …)`; it upgrades 3 → 5 in memory with everything kept.
  - **A real 4 → 5:** I ran the **Milestone 6 server** (commit `46a2f09`, unpacked to a scratch folder) on a second
    copy, so it upgraded the save to version 4 exactly as the farm would (Marlow arrived with the storm), then stopped
    it. The dry run with today's code: `World "farm" loads (save version 4 …)`. Then I played that copy in a scratch
    dev server: `Loaded the world … (upgraded from save version 4)`, Mason Mccabe on day 10 with 1,745 coins, the same
    bag and cottage, Marlow by the board, level 1 in everything, the **Moved In** badge card on joining, a piece of
    driftwood picked up (foraging experience), and a night that sold the crate for 410 and saved.
- **The v4 fixture** (the lighthouse half built, both of you helping): dry run, then played in a scratch dev server as
  Juno: day 12, 735 coins, Juno's bag and the lighthouse's gifts as they were, Moved In on joining, and picking the ripe
  radish gave the first farming experience and **First Harvest**.
- Nothing scratch was anywhere near the farm or its volume.

## What's new for players

- **Skills.** Farming (picking crops), fishing (landing fish, and a little for one that got away) and foraging (beach
  finds, bugs, driftwood and branches) each level from 1 to 10 as you play, on the plan's curve: level 2 on the first
  evening, level 10 after about a month of what you love most. No numbers float about while you play.
- **A perk at every level**, only for whoever earned it: planting waters the tile too (Farming 2), one more crop now and
  then (3), a seed back (5), bumper crops (7), a day's start for new crops (9), golden crops at three times the price
  (10); a fifth of a second longer to hook (Fishing 2), bites 15% sooner (3), bigger fish (5), rare fish more often (7),
  gentler tugs (9), two fish now and then (10); finds glint twice as often (Foraging 2), catching bugs from a step
  further (3), an extra find on the beach every morning for both of you (5), two driftwood or branches now and then
  (7). Rock-pool luck and messages in bottles (Foraging 9 and 10) say they start once the cove and the workbench open.
- **Gifts and titles:** levels 4 and 6 bring a decoration to your bag (a straw hat on a stand, a mounted fish, a shell
  wreath, a golden watering-can planter, a lobster pot, a butterfly jar, all our own art), and levels 4 and 8 a title
  (Keen Gardener, Master Gardener, Keen Angler, Old Salt, Keen Forager, Beachcomber). A full bag? The level's card says
  to make room, and the gift comes by itself as soon as there is.
- **Level-ups only on your own screen:** a small card at the top ("Fishing level 3 · Quick bites. Bites come 15%
  sooner."), the jingle, and a twinkle over your head. The other phone never hears about it.
- **26 badges**: first catch, 50 and 250 fish, a fish after 10 pm, a record; a first crop, 100 and 500 crops, every crop;
  every beach find, every bug, 100 finds, 50 driftwood or branches; the lighthouse lit (everyone's); 25 and 250 things
  given to the board; a cottage, 20 pieces put down, a porch; 10 nights in bed together, a night in the other's cottage,
  the view from the lighthouse after dark; the full book (everyone's); and the top of each skill. A new badge gets a
  card on your screen; the village's come to both of you at once (the Lamplighter appears on both phones as the lamp is
  lit at 6 pm).
- **The You card:** tap **your face** at the top right (a gold dot on it means something new). **Skills**: each skill's
  bar, level, "+36 today", your title and the next perk, then your perks. **Badges**: the earned ones first in gold, the
  rest as "?" with a hint; tap one for when you earned it, or how far along you are ("32 of 50 so far").
  **Change name or look** is at the bottom (where your face used to take you).
- **Porches.** Once the lighthouse is lit, the Village Board gets a second tab, **Your home**: each cottage someone lives
  in (yours first) with its porch (12 driftwood, 8 branches, 2,000 coins) and a bar; tap it for its card with Give
  buttons and who's helping. Either of you can give to either house, and holding driftwood at the board, **Give 7** goes
  to your own porch once the village has nothing on. The last thing in cheers on both phones ("That's everything for
  Pip's porch!"), Marlow builds it overnight, and the morning card says "Pip's cottage has a porch now." with **Look**.
  The porch has decking, a bench, and a lantern that lights at dusk with a warm glow. Porch Sitter goes to whoever lives
  there. Faded underneath: a garden, a bedroom, a kitchen and a loft, with when they'll come.
- **Tips:** one after your first level or badge (tap your face), and one when the porches go up on the board. The
  lighthouse's opening card now also says porches are on the board.

## Decisions worth a second look

- **26 badges, not 27:** the four for places that don't exist yet (Open for Business, Bridge Builder, Orchard Keeper,
  Village Restored) come with their milestones, so nothing on the card is impossible; I added one for the top of each
  skill (Top of the Crop, Sea Legend, Treasure Hunter), which the plan's perk table promises.
- **Full Book is everyone's**, like the village's badges, because the book is shared. The plan lists it under
  Collecting.
- **Past play:** counts start at the update (nothing recorded who caught what before), so Angler and the like start at
  nothing. Moved In and (if the lamp's lit) Lamplighter come on first joining. **Homemaker** counts pieces put down
  from now, so lifting a piece and putting it down again counts.
- **Helping Hand counts things, never coins**; Side by Side counts nights when two of you were in bed as the night
  came (not falling asleep at midnight); Sleepover is a bed in the other's cottage; Up the Lighthouse is climbing from
  6 pm, when the lamp's lit and the moon is up.
- **The gifts are floor pieces** (the game has no wall pieces), so the mounted fish is a plaque on a post and the
  wreath stands on a little easel. The straw hat stays a decoration until hats can be worn (Milestone 11).
- **The porch's layout:** a lantern on a post left of the door and a bench two tiles wide to the right, so the door is
  reached from straight in front. Both cottages have the door in the same column, so both porches match. A decoration
  standing where the bench goes moves to the nearest free spot when it's built (as for the board).
- **Give's order at the board:** the village's project first, then your own porch, then the other's.
- **The faded upgrades on Your home** follow mockup 10. They show what's coming before those milestones exist, unlike
  the village tab's "Coming later", which waits until the next project is built.
- **The perks' numbers** (all in `PERK`, `shared/content/skills.ts`): bigger fish move up 12% of a fish's size range,
  Lucky line makes rare fish 1.5 times as likely, Gentle reel makes a tug pull you back a third more slowly, Bright
  eyes doubles the glints, Early riser is one watered day's growth at planting.
- **"+36 today"** is saved, so a server restart mid-day keeps it.
- **No Wardrobe tab** on the You card until there's something to wear (the mockup shows a faded one).

## Try it on a phone (no programming needed)

After `npm run farm:up`, on both phones with Tailscale on:

1. **Open the game.** A small card at the top says **New badge: Moved In** (and **Lamplighter**, if the lighthouse is
   lit). A gold dot sits on your face at the top right.
2. **Tap your face.** The You card: three skills at level 1, the next perk for each. Tap **Badges**: Moved In in gold,
   the rest as "?". Tap one to read about it. **Change name or look** is at the bottom.
3. **Level up:** pick a few crops, catch a few fish, or pick up shells and driftwood. About eight fish, or ten
   radishes, brings level 2: a card at the top of *your* phone only, with the jingle. The other phone stays quiet.
4. **Try the perk:** at Farming 2, plant a seed: the soil turns dark, already watered. At Fishing 3, bites come sooner.
5. **Badges:** your first fish, crop or pick-up brings its badge. Go to bed together ten nights for Side by Side, sleep
   in the other's cottage for Sleepover, and climb the lit lighthouse after 6 pm for Up the Lighthouse.
6. **Porches (once the lighthouse is lit):** a tip says Marlow can build porches. At the board, tap **Board**, then
   **Your home**. Tap your porch, and give driftwood, branches and coins. Then tap the other's porch and give to that
   too. Or just walk up to the board holding driftwood and tap **Give**.
7. **The cheer:** when the last thing goes in, both phones say "That's everything for …'s porch!".
8. **Sleep.** The morning card says whose cottage has a porch now; tap **Look**. Walk up to the cottages: decking, a
   bench and a lantern. After 6 pm the lantern glows. The cottage's owner gets **Porch Sitter**.
9. Things to tell me: do the level-up cards feel gentle enough, or too much? Is the gold dot noticeable? Are levels
   coming too fast or too slow? Is the porch the right size and look? Would you like to sit on the bench?

## Known rough edges

- **Not tried on a real iPhone.** Checked in the browser pane with two players on a laptop layout and at phone size:
  levels from real play for each of you (Pip's foraging from picking up a shell, Juno's farming from a radish grown
  over three nights) with each card only on that player's screen, Plant and water working, First Harvest, the
  Lamplighter to both at dusk on a fresh world, giving to both porches from both players, the cheer on both screens, a
  night building both, the morning card with Look, the lanterns at dusk, Porch Sitter, a level gift going into the bag
  and being put down (counted for Homemaker), the You card and Your home at phone size, and a dev-server restart
  (everything came back: experience, badges, counts, porches, the watered seedling).
- **The fishing perks, golden crops and two fish at once** are covered by tests, not played: I can't time the bobber
  through screenshots, and levels 9–10 are a long way off.
- **Several levels at once** (only possible with the dev command) bring a card each, one after another.
- **The Lamplighter card and the lighthouse's opening card** come at the same moment at dusk (the badge card sits at the
  top, over the opening card).
- **The porch has no Sit** yet, and the lantern's glow, like the lighthouse's, is drawn a frame behind the camera.
- **Badges scroll on a phone** (26 in a grid of four); the strip about the one you tapped stays at the bottom of the
  card.
- I tested on your dev save. The copy from before is `data-dev/saves.before-milestone-7.sqlite` (rename it to
  `saves.sqlite` to go back); the one in `data-dev/` now has both porches built and some levels.

## Upgrading the real farm safely

1. Make sure nobody's playing: `farm:up` restarts the farm and disconnects anyone in it.
2. `npm run farm:backup` for a fresh copy in `%OneDrive%\CozyFarm\backups` (the newest there now is from 13:18 and is
   save version 3).
3. **Dry run** on that new file (it only reads it):
   `node --import tsx server/src/persistence/checkCli.ts "<the new backup's path>"`. It should say
   `World "farm" loads (save version N, …)` (3 if the farm is still on Milestone 5, 4 if it's on Milestone 6) and exit
   without an error.
4. Optional, to play it first: copy the backup into an empty scratch folder as `saves.sqlite`, then in PowerShell
   `$env:DATA_DIR = "<that folder>"; npm.cmd run dev` and open http://localhost:5173 (pick yourself on Who's playing).
   You should get the Moved In card and be level 1 in everything. Stop it with Ctrl+C, then delete the folder. Never
   point `DATA_DIR` at the farm's volume.
5. `npm run farm:up`. On first start the server upgrades the save to version 5 (the original stays in the volume's
   `save_archive`). If the farm was still on Milestone 5, this also brings Milestone 6 (Marlow and the storm arrive).
6. `npm run farm:logs` should show `Loaded the world … (upgraded from save version N)` and `Game server listening`,
   and nothing red. When each of you opens the game, the log says `<name>: the moved_in badge` (for anyone with a cottage).
7. **The way back**, if something's wrong: the old code can't load a version 5 save (the server stops rather than
   start over), so go back to the code before `ba6ede1` (that's `46a2f09`) and restore the backup from step 2 with
   `npm run farm:restore`.

## For Milestone 8

- **The save** is version 5; the next change is `migrations[4]` (5 → 6) and a `world-v6.json` fixture.
- **The garden upgrade:** move "A garden" from `LATER_UPGRADES` into `HOUSE_UPGRADES` in
  `shared/content/houseUpgrades.ts`, with `after: "gardenShop"` and its needs; paint `Farmland house1 garden`
  (`shownFrom: house1:garden`) and its walls in Tiled; `homeWords` and the board pick it up by themselves. A garden's
  farmland means `farmKeepClear` and the decorations' board need a look.
- **Open for Business:** add it to `shared/content/badges.ts` (`shared: true`, group `village`) with its rule in
  `shared/progress/badges.ts` (`built.has("gardenShop")`); `awardEveryone` gives it when the shop opens.
- **New crops** count for experience by themselves (their days to ripen: a melon is 10), get golden versions by
  themselves (`goldenItems` in `items.ts`, and `npm run sprites` draws them from `CROP_ART`), and make **Every Crop**
  harder; anyone who already has it keeps it.
- **The good rod:** `LinePerks` on the line (`shared/fishing/fishing.ts`) is where a rod's effect fits, next to
  Steady hands and Quick bites.
- **The board** now holds the village's project and any house upgrades at once; `everythingOpen` lists them in order.
- **Later:** Rock-pool luck and stone for Kindling come with the cove (Milestone 9), messages in bottles with the
  workbench (Milestone 10), wearing the straw hat and the Wardrobe tab with the tailor's (Milestone 11).
