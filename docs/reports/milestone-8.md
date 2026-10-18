# Milestone 8: The garden shop and the seasons

Built on 2026-10-18 by Claude, working on its own from the approved plan (`docs/plans/progression.md`, its Milestone 8
phase, with every suggested answer in its section 7 taken as decided). Every decision is in `docs/DESIGN.md` (the
Decisions table, and "The garden shop and the seasons" under Restoring the village). Nothing has been put on the real
farm: it still runs what it ran until you run `npm run farm:up` (exact steps at the end).

Commits: `7f3992c` (the garden shop, its project, the ten crops, seasons rules, tool upgrades and save version 6, in one
commit because the new Action and place types touch the server and the client at once), `ceae1e7` (the seasons on
screen), `d5a0944` (docs, the art preview page, two small fixes), and this report.

Tests: 1,211, all passing (1,023 before), and `npm run typecheck` is clean.

## Your save is safe

- The save is now **version 6**. The one new migration (5 → 6, `migrations[4]` in
  `server/src/persistence/worldSave.ts`) only adds `yearStart: 0`: no seasons yet. Nothing else changes shape. The
  garden shop is a new project (nobody's world has it started), and the new crops, seeds and tools are new items, so
  old bags, tools, crops, projects and badges come through exactly as they were.
- `server/src/persistence/fixtures/world-v6.json` joins v1 to v5: the garden shop open, spring a week in, peas
  (regrown), cauliflower, wheat and a ripe melon in the field, seasonal seeds and a golden cauliflower in the bags,
  every tool upgrade, and Open for Business. `oldSaves.test.ts` checks v1–v5 come through with no seasons and the
  garden shop unstarted, the v5 fixture with every bag, progress, decoration and project as it was, and v6 keeping
  everything.
- **The map only changed where nothing could be lost.** The garden shop stands where the clump of three bushes was;
  their bottom row was already a wall, so the shop's is the same wall, and the "nothing saved can move" test (the
  Milestone 5 map's farm field, places, rooms and every walkable tile) passes untouched. A palm on the beach strip
  moved out of the boardwalk's way (one more tile to walk on). As an extra guard, any decoration standing somewhere an
  update has since walled off moves to the nearest free spot when the server starts (tested).

### The upgrade rehearsal

- **Your real farm's newest backup** is `cozy-farm-2026-10-18_143238.sqlite` (14:32), **save version 4** (Milestone
  6): day 10, 1,745 coins, one farmer (Mason Mccabe), Marlow arrived, no project started, house1, ten dug tiles, 15
  things in the book. I copied it to a scratch folder (only read from OneDrive).
- **4 → 5, as Milestone 7 would:** I unpacked commit `0cdf66c` to a scratch folder and ran it on a copy
  (`Loaded … (upgraded from save version 4)`), joined as Mason (the Moved In badge came), and let it save.
- **Dry run with today's code** on that version 5 file: `World "farm" loads (save version 5, …)`.
- **Played it** in a scratch dev server with `DATA_DIR` on another copy: `Loaded … (upgraded from save version 5)`,
  Mason on day 10 with 1,745 coins, the same bag, level 1, Moved In, Marlow by the board, the lighthouse on the board
  and "Something on the boardwalk" as a silhouette under it. With the dev commands I built the lighthouse (lit on day 13),
  then the garden shop's three steps; it opened on day 17, which became Spring 1. The dry run also passes straight
  from the version 4 backup (`World "farm" loads (save version 4, …)`), so the farm can jump 4 → 6 in one go.
- **The v5 fixture** through the migration: played in a scratch dev server as Pip (her bag exactly as saved), gave
  driftwood and branches to the boardwalk, and slept a night.
- The scratch folders were never anywhere near the farm or its volume.

## What's new for players

- **The garden shop project.** The morning after the lighthouse is lit, the board puts up *Reopen the garden shop*
  (before that it shows as a silhouette under "Coming later"). Three steps, built one a night:
  1. **Mend the boardwalk**: 12 driftwood, 10 branches, 800 coins. The planks appear along the top of the beach, from
     the market to the inlet by the old bridge.
  2. **Patch up the shop**: 8 driftwood, 5 radishes, 5 carrots, 1,200 coins. The boards come off its windows.
  3. **Fill the seed drawers**: 4 of any bug, 5 strawberries, 5 sea samphire, 1,500 coins. It opens.
  Each step's last gift cheers on both phones; each morning card says what was built, with **Look**.
- **The shop opens with the morning:** "The garden shop is open, and spring has come!", then its opening card
  (bunting, Marlow's note, what's new, **Let's go see**). All that day Marlow stands by its door under bunting.
  Everyone gets **Open for Business**.
- **The garden shop** (next to its door the button says **Garden shop**; an honesty box, no shopkeeper):
  - **Seeds**: this season's two, plus wheat and cotton all year, bought like at the seed stand; the rest of the year's
    are shown faded with their season.
  - **Tools**: upgrades of your own, coins from the shared wallet and materials from your own bag:
    - a **big watering can** (1,500 coins, 8 driftwood) and a **wide hoe** (1,200, 8 branches) work on the tile in
      front and the ones either side, with three outlines;
    - a **good rod** (2,000, 6 driftwood): bites 30% sooner, and a fifth of a second longer to hook;
    - a **bug net** (800, 6 branches): catch bugs from a step further away;
    - a **shell basket** (800, 6 driftwood): Pick up takes everything lying right round you.
    - The **sprinkling can** shows faded until the cove's stone (Milestone 9).
- **Ten new crops**, with our own sprites:
  - peas (spring; 4 days, then every 2) and cauliflower (spring; 8 days);
  - tomato (summer; 6 days, then every 3) and melon (summer; 10 days);
  - beetroot (autumn; 4 days) and cranberries (autumn; 6 days, then every 2);
  - kale (winter; 4 days) and leek (winter; 5 days);
  - wheat (4 days) and cotton (6 days) all year.
- **Gentle seasons**, 14 days each, from the morning the shop opens:
  - The clock says "Spring 3 · 9:40 am", the morning card "Good morning! Spring 3", and a season's first morning says
    it's come.
  - Seasonal seeds go in only in their season ("Tomato: plant in summer. Keep the seeds till then."). The six starter
    crops, wheat and cotton grow all year.
  - **Anything in the ground always finishes.** A crop that grows back, picked out of its season, gives that pick and
    makes way.
  - The village changes with them: blossom on the round trees and drifting petals in spring, all green in summer,
    gold and red trees, golden grass and falling leaves in autumn, snow on the trees and grass in winter.
- **Marlow** talks about the boarded-up shop, planting in season and each season.
- **Tips:** one when the shop opens (the seasons), one the first time you open it (the tools).

## Decisions worth a second look

- **The shop's place:** where the bushes were (columns 41–44, rows 13–15), right of the board and the cherry tree,
  door onto the boardwalk. The plan's spot was open grass you could walk and decorate on; this one loses nothing.
- **The boardwalk** runs along rows 17–18 on the grass and the sand strip, so it doesn't change where you can walk:
  here the shore is a straight strip of sand, with no curve to put stilts in. It's the dock's orange planks, so it's
  bold; easy to tone down if you'd like it quieter.
- **Step 2 asks for four things, not five:** the plan also had 3 potatoes, but its own rule (and the card's layout) is
  two to four needs a step.
- **A regrowing crop out of season** gives its last pick and makes way, rather than cropping all year (which would
  make seasons not matter) or dying (never).
- **The net and the basket work from your bag**, since Catch and Pick up already work whatever you're holding.
- **The wide hoe and big can work across the way you face**, so walking along a row holding the button does three
  rows. The wide hoe digs for good, as the hoe always has; there's still no undigging.
- **Melons and leeks have six growth pictures**, so `crops.png`'s rows grew from seven columns to eight.
- **The season shows in the day's place** on the clock card and the morning card ("Spring 3"); history keeps the day
  count ("Lit on day 16").
- **Every Crop** now wants the ten new crops too, so it takes a year; anyone who already has it keeps it.
- **The garden upgrade isn't in this milestone** (its scope was the shop, crops, seasons and tools). Your home shows
  "A garden: Marlow's still drawing it up", and the roadmap item is left unticked.
- **Before the seasons begin** the shop would sell every seed; only the dev commands can show that, since the seasons
  begin the moment it opens.

## Try it on a phone (no programming needed)

After `npm run farm:up`, on both phones with Tailscale on:

1. **If the lighthouse isn't lit yet,** finish it first. Its board now shows "Something on the boardwalk" under
   Coming later.
2. **The morning after it's lit,** tap **Board**: *Reopen the garden shop*. Gather driftwood on the beach and branches
   under the trees, walk up to the board holding them and tap **Give**, and give coins from the card.
3. **Sleep.** The morning card says the boardwalk is mended; tap **Look**. Walk east along the planks to the point.
4. **The shop's next two steps** want radishes, carrots, strawberries, samphire and any four bugs: plant a few
   beforehand.
5. **The morning it opens:** spring has come. Tap Let's go see. Marlow's by the shop, under bunting.
6. **At the shop,** tap **Garden shop**: buy peas or cauliflower (this season's), plant them, water them.
7. **Tools tab:** get the big watering can or the wide hoe; walk along a row holding the button and three rows get
   done. The good rod, the bug net and the shell basket are there too, each your own.
8. **Over the next two weeks** the season turns: the trees and the grass change, the clock says Summer 1, and the shop
   has tomatoes and melons. Peas planted late in spring still finish in summer.
9. Things to tell me: is the boardwalk too orange? Does three-wide watering feel good, or too much? Are 14-day seasons
   the right length? Is winter's white grass pretty or too bright? Would you like the starter crops to be seasonal too?

## Known rough edges

- **Not tried on a real iPhone.** Checked in the browser pane with two players on a laptop layout and at phone size:
  - the garden shop's three steps from a lit lighthouse, giving from both players with the Action button and the card,
    the cheer on both screens, each night's building and Look, and a dev-server restart mid-project (everything came
    back);
  - the shop opening: Spring 1, the opening card on both devices, Marlow and the bunting, Open for Business;
  - buying seeds, all five tool upgrades, three-wide digging and watering, a fish on the good rod, the basket's sweep;
  - peas and a cauliflower planted on Spring 13, growing through the turn to summer, and the peas' last pick in
    summer;
  - the season looks for every season, and the shop and HUD at phone size.
- **The wide hoe's icon** is the hoe with a brass blade: it doesn't look wider.
- **The good rod in your hands** is drawn like the plain rod; only its icon is red and gold.
- **Winter's snowflakes** are white on white grass, so they're hard to see; the small green tufts stay green in winter.
- **Driftwood or a shell lying where the boardwalk goes** stays there when it's built (you can still pick it up); new
  ones never land on the planks.
- **Open for Business and the opening card** arrive together (the badge card sits above it), like the Lamplighter.
- **Once, the shop's Tools tab needed a second tap** right after buying seeds on the laptop; I couldn't make it happen
  again.
- I tested on your dev save. The copy from before is `data-dev/saves.before-milestone-8.sqlite` (rename it to
  `saves.sqlite` to go back); the one in `data-dev/` now has the garden shop open, both of you with new tools, and it's
  Summer 3.

## Upgrading the real farm safely

1. Make sure nobody's playing: `farm:up` restarts the farm and disconnects anyone in it.
2. `npm run farm:backup` for a fresh copy in `%OneDrive%\CozyFarm\backups` (the newest there now is from 14:32 and is
   save version 4).
3. **Dry run** on that new file (it only reads it):
   `node --import tsx server/src/persistence/checkCli.ts "<the new backup's path>"`. It should say
   `World "farm" loads (save version N, …)` (4 if the farm is on Milestone 6, 5 if it's on Milestone 7) and exit
   without an error.
4. Optional, to play it first: copy the backup into an empty scratch folder as `saves.sqlite`, then in PowerShell
   `$env:DATA_DIR = "<that folder>"; npm.cmd run dev` and open http://localhost:5173 (pick yourself on Who's playing).
   Everything should be as it was; if the lighthouse is lit, the garden shop is up on the board. Stop it with Ctrl+C,
   then delete the folder. Never point `DATA_DIR` at the farm's volume.
5. `npm run farm:up`. On first start the server upgrades the save to version 6 (it keeps a copy of the original in the
   save file's `save_archive` table first). If the farm was still on Milestone 6, this also brings Milestone 7 (everyone at level 1, badges on
   first joining).
6. `npm run farm:logs` should show `Loaded the world … (upgraded from save version N)` and `Game server listening`,
   and nothing red.
7. **The way back**, if something's wrong: the old code can't load a version 6 save (the server stops rather than start
   over), so go back to the code before `7f3992c` (that's `0cdf66c`) and restore the backup from step 2 with
   `npm run farm:restore`.

## For Milestone 9

- **The save** is version 6; the next change is `migrations[5]` (6 → 7) and a `world-v7.json` fixture.
- **The bridge project:** add it to `PROJECTS` after `gardenShop` (`shared/content/projects.ts`) with a `teaser` ("A
  bridge, past the rocks"), and it goes up the morning after the shop opens and shows under Coming later until then.
  The built name `bridge` already opens the `Collision bridge` gap. Give it a `keeperOpening` point (`project: bridge`)
  if Marlow should spend its opening day there, and an opening picture in `WorldScene.openingPictures`.
- **The garden upgrade** (left from this milestone): move "A garden" from `LATER_UPGRADES` into `HOUSE_UPGRADES`
  (`after: "gardenShop"`, Branches 10, Driftwood 6, 3,000 coins), and paint `Farmland house1 garden` /
  `Farmland house2 garden` (`shownFrom: house1:garden`) beside each cottage. House upgrades all use the porch's
  picture on the board and the morning card (`projectPicture`, `builtPicture`, `homeWords`' `icon`): give each its
  own. A garden's soil is ordinary farm soil, so seasons apply there too.
- **The sprinkling can:** an item in `items.ts`, a `TOOLS` entry (`width: 3`, plus a `depth: 3` that `toolTiles`
  doesn't handle yet: it only spreads across), and a `TOOL_UPGRADES` entry from `big_watering_can` costing stone; then
  drop it from `LATER_TOOL_UPGRADES`.
- **Seasonal fish and finds** (the plan's John Dory in summer and autumn, the abalone shell in spring and summer):
  give `FishDef` and the finds a `seasons`, filter them with `seasonOn(day, yearStart)` where fish are chosen and the
  tide washes up, and extend `isSeasonal` (`shared/time/seasons.ts`) to them so the projects test keeps them out of
  any step.
- **Stone and Kindling:** Kindling counts driftwood and branches; stone joins it there.
- **Later, the greenhouse** grows anything in any season: planting checks `inSeason` in `chooseAction` (the client)
  and `applyFarmAction` (the server); both will need to know the tile is indoors.
- **The café and the tailor's** go on the boardwalk too, in the meadow east of the garden shop once some of its trees
  move; check the "nothing saved can move" test still passes with whatever goes there. `settleDecorations` and
  `makeRoom` look after any decoration in the way.
