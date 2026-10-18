# Progression plan: restoring the village together

**Status:** a proposal for review, written 2026-10-18 by Claude. Nothing here is built. The developer's answers
(below, and in DESIGN.md under "Restoring the village") are decided; everything else is Claude's suggestion, and every
choice Claude made is in [section 7](#7-open-questions) with a suggested answer.

The mockups are in [progression-mockups.html](progression-mockups.html). Open it straight from the repo in a browser
(it loads the real sprites from `client/public/assets/`), or with `npm run dev:client` running, at
`http://localhost:5173/@fs/<path to the repo>/docs/plans/progression-mockups.html`. Click a phone to see it full size.

**The evening this starts:** the morning after the update, the morning card says a little boat is tied up at the dock
and last night's storm has washed driftwood all over the beach. By the seed stand there's a new noticeboard and an old
man in a straw hat. She taps **Talk**: he's Marlow, who kept the lighthouse on the point when this was a busy little
harbour. On the board: *Light the lighthouse*, step 1 of 3, *Clear the path to the point*: 10 driftwood, 6 branches,
300 coins. She sweeps the beach holding **Pick up**, you gather branches under the meadow's trees, and you both walk
up to the board holding them: the big button says **Give 7**. On the last branch a card pops up on both phones:
"That's everything for the path!" Next morning the brambles are gone, and the path runs out to the dark old
lighthouse on the point. Two evenings later, at dusk, the lamp comes on, the beam sweeps across the sea, and
Marlow's note says "Every boat from here to the horizon can see we're home." That night you catch a lanternfish off
the point and climb up together for the view.

**What this builds on:** Milestones 1–5 (live). The places, spots and Action button in `shared/world/places.ts` and
`shared/farming/actions.ts`; the night and the morning card (`shared/world/night.ts`, `client/src/ui/MorningCard.ts`);
the tide (`shared/beachcombing/tide.ts`), which is the model for driftwood and branches; the collection book and its
celebrations on both screens (`shared/collection/`, `client/src/ui/Celebration.ts`); the save at version 3
(`server/src/persistence/worldSave.ts`, fixtures v1–v3); and the Tiled map, 48 × 46 tiles, the village in rows 0–35
and the two rooms below it.

**Contents:** [0. The shape of it](#0-the-shape-of-it) · [1. The player experience](#1-the-player-experience) ·
[2. The content](#2-the-content) · [3. Pacing](#3-pacing) · [4. Map and art](#4-map-and-art) ·
[5. Server and save](#5-server-and-save) · [6. Build order](#6-build-order) · [7. Open questions](#7-open-questions)

---

## 0. The shape of it

- **Projects** are the big shared goals (the lighthouse, the bridge, each shop, the orchard, the greenhouse). Each has
  **three steps**, and each step asks for **two to four things** ("needs"): a particular item ("12 Driftwood"), any
  item of a kind ("5 of any fish"), or coins. A step is a session's little win; a project is the week's big one.
- Things are given at **the Village Board**, by the seed stand, where **Marlow** the old lighthouse keeper stands by
  day. Gifts stay given (nothing is ever lost), and anyone can give to anything.
- When a step's last thing goes in, both screens cheer at once. The work itself **happens overnight**, so the
  morning shows what changed. A finished project gets its own opening card, and the new place opens on the map.
- **Personal progress** sits alongside: three skills (farming, fishing, foraging) that level up with small perks,
  badges, house upgrades (porch, garden, more rooms), and later outfits. All of it lives behind your own face in the
  top-right corner, so the HUD doesn't change.
- **Building materials** are new and cozy: driftwood washes up on the beach and branches fall under the meadow's trees
  each morning; stone comes from the cove once the bridge is mended.

### Recommended project order

| # | Project | Why here |
|---|---|---|
| 1 | **Light the lighthouse** | It's Marlow's home and the story's heart, and it's visible from the whole beach. It only asks for what they already do, plus driftwood. Its rewards change every evening: a glow, new night fish, the view. |
| 2 | **Reopen the garden shop** (first boardwalk shop) | Farming gets bigger right when the novelty of the lighthouse settles: new seeds, tool upgrades, and (if wanted) the seasons start. Its crops feed every later project. |
| 3 | **Mend the bridge to the cove** | A new place to explore: rock pools, new fish and shells, a beach to decorate. The cove's rocks give **stone**, which the later shops, house rooms and greenhouse need. |
| 4 | **Reopen the café** | Cooking turns crops and fish into dishes. Needs stone (cove) for the oven. Marlow's workbench (crafting) opens next door. |
| 5 | **Reopen the tailor's** | Outfits and house wallpaper. Needs cotton from the garden shop and shells for buttons. |
| 6 | **Plant the orchard** | Trees take a couple of weeks to fruit, so it comes before the last project; the opening picnic needs dishes from the café. |
| 7 | **Restore the greenhouse** | The grand finale: any seed grows in any season. The biggest asks, once stone and sea glass come easily. |

### Phases at a glance

Each is a milestone the couple can enjoy on its own. Section 6 has the steps.

| Milestone | What they get | Save |
|---|---|---|
| **6. The keeper and the lighthouse** (first, small) | Marlow, the Village Board, driftwood and branches, the lighthouse in three steps, its glow at night, night fishing at the point (3 fish), the view from the top | v4 |
| **7. Skills, badges and porches** | The "You" card, three skills with perks, about 25 badges, the board's "Your home" tab, the porch | v5 |
| **8. The garden shop and the seasons** | The boardwalk, the garden shop, 10 new crops, gentle seasons, tool upgrades, the garden upgrade | v6 |
| **9. The bridge and the cove** | The bridge, the cove: rock pools (a new book page), 3 fish, 3 shells, stone, a beach shelf at the store, the bedroom upgrade | v7 |
| **10. The café and the workbench** | The café, cooking (14 recipes), small treats, crafting at Marlow's workbench (12 things), the kitchen upgrade | v8 |
| **11. The tailor's** | Hats and accessories, dyes, new looks, wallpaper and floors, a roomier bag, the loft upgrade | v9 |
| **12. The orchard and the greenhouse** | Two projects, six fruit trees, the year-round greenhouse, Marlow's last note (for now) | v10 |

---

## 1. The player experience

### 1.1 Marlow arrives

- **On the real farm:** Marlow is there the first time the server starts after the update (like the first tide in
  Milestone 5), so nobody has to wait a night to see what's new. The beach has had a storm: 10 driftwood on the
  sand, 6 branches under the meadow's trees, on top of the usual finds.
- **In a new world:** he arrives on the morning of day 2, so day 1 stays the farming tutorial it is now.
- **The first time each of you opens the game after he arrives**, his note card greets you once (per farmer, like the
  morning card):

  > **Marlow** — Well, hello! I'm Marlow. I kept the lighthouse on the point, back when this was a busy little
  > harbour. It's been dark for years. I've pinned some plans up on the board by the seed stand, if you two fancy
  > waking the old place up.
  >
  > [ Let's have a look ] [ Later ]

  "Let's have a look" just closes the card and puts a small arrow over the board for a moment; the game never walks
  you anywhere.
- **Where he is** (a pure rule on the clock, so both screens agree; he never needs to path-find):

  | When | Where |
  |---|---|
  | 6 am – 6 pm | Beside the Village Board |
  | 6 pm – 10 pm | Fishing at the end of the dock (after the lighthouse is lit: on the rocks at the point) |
  | 10 pm – midnight | His boat by the dock (after the lighthouse: up in the lamp room, a shadow in the window) |
  | The day a project opens | At the new place all day, under the bunting |

- He's the pack's **OldMan3** (straw hat, white beard), already in `client/public/assets/` and unused. Nobody bumps
  into him: he doesn't block walking, like the other player.
- **Talk:** facing him, the Action button says **Talk** and shows his latest note, or one of a few small-talk lines
  that fit the time and what's open ("The fish bite at the point after dark, you know."). Notes are short: two or
  three sentences, signed "— M."

### 1.2 The Village Board

- **Where:** at the east end of the little market, right of the seed stand (about columns 34–35, rows 14–15), on the
  path everyone already walks between the farm, the shops and the dock, and on the way east to the point. Our own
  2 × 2 sprite: a cork board on two posts with a paper note pinned on for each open project, so you can see from a
  distance that something's waiting.
- **The Action button** next to it:
  - Holding something an open project needs: **Give**, with the item's picture and a tag, **Give 7**. One tap gives
    the stack (only as many as are needed). This is the main way on a phone: pick the slot, walk up, tap.
  - Otherwise: **Board**, which opens the board card.
- **The board card** (mockup 2): Marlow's face and his line for the current project at the top; two tabs, **Village**
  and **Your home** (from Milestone 7). Village lists:
  - **Now:** the open project(s), each a row with its picture, "Step 2 of 3 · Mend the stairs", a bar of how much of
    the step is in, and the faces of everyone who has helped. Tap one to open its card.
  - **Coming later:** the next projects as silhouettes with a hint ("Something on the boardwalk", "A bridge, past the
    rocks"), like the collection book's unknowns. They only appear once that milestone is built.
  - **Finished:** each with the day it opened.
  - **Marlow's notes (7):** every note he's written, to read again.
- **One project open at a time**, plus your home upgrades. The next appears the morning after the last one opens. One
  clear goal is easier to share than a list, and it keeps the pacing honest.

### 1.3 Giving things (the project card)

Mockup 3. One card per project, the current step on top:

```
‹  Light the lighthouse                         (×)
[lighthouse]  Step 2 of 3 · Mend the stairs
              "Ninety-two steps, and half of them rotten."
---------------------------------------------------
[driftwood] Driftwood        9 / 12   you have 6  [Give 3]
[branch]    Branches         8 / 8    ✓
[fish]      Any fish         2 / 5    you have 4  [Give 3]
[coin]      Coins          150 / 600  wallet 1,240 [Give 450]
---------------------------------------------------
[ Give everything I can ]            Helping: (Pip)(Juno)
NEXT  Light the lamp: 2 Sea Glass, 4 beach finds, 6 crops, 900 coins
WHEN IT'S DONE  The light shines every night · fish bite at the point after dark · climb up for the view
```

- Each need row: the picture, its name, how many are in out of how many, and then either what you have with a
  **Give** button (as many as you have, up to what's left), a tick, or where to find it in faded text ("Washes up on
  the beach most mornings") when you have none. The hints reuse the book's.
- **Any of a kind** ("Any fish"): Give hands over the cheapest first, so a rare catch never goes by accident. A small
  **Choose** link opens your bag's slots, filtered to that kind, to pick by hand.
- **Coins** come from the shared wallet: Give puts in what's left (or all the wallet has). No confirm, the same as
  buying at the store.
- **Give everything I can** gives every item need you can from your bag (never coins: they have their own button).
- **The next step** is shown faded, so slow crops can be planted ahead of time. Only the current step takes gifts.
- **Who helped:** faces only, never counts. No scores (pillar 1).
- Each gift floats "+3" up from the board on both screens and pins a little tick on the board's note when a need is
  done.
- **Everywhere else**, the game quietly points out what's wanted: the bag's info strip says "The lighthouse needs 3
  more", and the hotbar's name flash says "Driftwood · wanted on the board". The collection book gets a fourth page,
  **Village**: the board read-only, so you can check what's needed from the dock.

### 1.4 Celebrations, and new places opening

| Moment | What happens | Where |
|---|---|---|
| A need is filled | A tick sound; the need row turns green | Whoever's looking |
| **A step's last thing goes in** | A card at the top of both screens with Marlow's face: "That's everything for the stairs! Juno brought the last of it. Marlow will see to them tonight." The success jingle, confetti and a heart over the giver, as for a book discovery. | Both screens |
| **The night** | The work happens under the night's fade. | — |
| **The morning** | The morning card gains an **In the village** section: "The lighthouse stairs are mended." with a little picture and a **Look** button that glides the camera there and back (3 seconds). | Both, once per device |
| **A project opens** | After the morning card, a big **opening card**: bunting across the top, "The garden shop is open!", Marlow's note, what's new ("10 new seeds", "Tool upgrades") and **Let's go see** (the same camera glide). Bunting hangs at the place all day, and Marlow stands there. The first time you walk up to it, his note for that place. | Both, once per device |
| **The lighthouse**, specially | It's built overnight like the rest, but the morning card says "Marlow will light the lamp at dusk." At 6 pm the lamp comes on with a soft chime on both screens and the opening card shows then. | Both |

**How a new place opens on the map:** everything that's locked is visible but closed: a broken bridge, brambles across
a path, boarded-up shopfronts, a dark lighthouse. Facing a closed place, the Action button gives a hint instead
("Boarded up. Marlow has a plan for it on the board."). Overnight the art changes (Tiled layers that show until or
from a project is built, section 4), the collision under it changes with it, and the place's Action wakes up
(**Climb**, **Garden shop**, **Cook**, **Peek**). Nothing ever changes while you're walking around.

### 1.5 Personal progress without clutter

- **Nothing new on the HUD.** Your face button (top right, today's look button) becomes **You**. It opens the You
  card (mockups 8 and 9): tabs **Skills**, **Badges** and (from Milestone 11) **Wardrobe**, and at the bottom
  **Change name or look**, which is today's picker.
- A small gold dot on your face button when something's new there (a level, a badge); it goes once you've looked.
- **Level ups and badges** get a small card at the top of **your** screen only, for 3 seconds, like a record fish:
  "Fishing level 3 · Fish bite a little sooner." / "New badge: Night Owl." Skills are personal and never compared,
  so the other screen doesn't hear about levels. Badges for village projects go to everyone at once, with the
  project's cheer.
- No "+4 XP" floating over every catch. The You card shows each skill's bar, its level, the next perk, and "+36
  today".
- **House upgrades** show on the house itself (a porch with a bench and a lantern at night, a fenced garden, a door
  to a new room) and in the board's **Your home** tab.
- **Outfits** show on your character, so both of you see them.

### 1.6 The mockups

[progression-mockups.html](progression-mockups.html), all at iPhone size (390 × 844), in the game's card style:

1. At the board: Marlow beside it, you holding driftwood, the Action button saying **Give 7**.
2. The board card (Village tab).
3. The project card (the lighthouse, step 2).
4. Marlow's note (the first meeting).
5. A step's cheer at the top of the screen.
6. The morning card with **In the village**.
7. The lighthouse's opening card at dusk.
8. The You card: Skills.
9. The You card: Badges.
10. Your home tab.
11. The village map when it's all done (not a phone): where each new place goes, and which milestone builds it.

---

## 2. The content

Everything here is data in `shared/content/`, first guesses to be tuned by playing (the same rule as crops and fish).
Prices and amounts are checked against the economy in section 3.

### 2.1 The projects

Needs are listed per step. "Any fish", "Any crop", "Any beach find", "Any bug" and "Any dish" accept any item of that
kind. No step ever needs a seasonal item or a crop that takes more than 6 days, so nothing can stall (a test checks
this, section 6).

#### 1. Light the lighthouse (Milestone 6)

On the board: *"The light first, I think. Boats like to know where home is."*

| Step | Needs | Built overnight | Marlow, when it's built |
|---|---|---|---|
| 1. Clear the path to the point | Driftwood 10, Branches 6, 300 coins | The brambles across the path go; the point opens | "There's the old path. My knees thank you both." |
| 2. Mend the stairs | Driftwood 12, Branches 8, Any fish 5, 600 coins | The door opens; scaffolding round the top | "Ninety-two steps and not a creak in them. And thank you for the fish. I haven't eaten that well in years." |
| 3. Light the lamp | Sea Glass 2, Any beach find 4, Any crop 6, 900 coins | The lamp is lit at dusk the next evening | "There she is. Every boat from here to the horizon can see we're home." |

Step blurbs on the card explain the odd asks: "Sea glass to patch the lens. The trader up the coast swaps lamp oil
for good vegetables."

**Opens:** the lighthouse glows every night (a warm halo and a slow beam over the sea, drawn above the evening tint);
**night fishing at the point** (3 new fish, section 2.9); **the view**: at the door, Action says **Climb**, and from
the top the camera pulls back to zoom 1 over the whole village (pan with the stick, **Down** or Esc to come back; at
night the cottages' windows are lit); Marlow moves into the lighthouse; the porch upgrade (Milestone 7); the garden
shop's plan goes up on the board. Everyone gets the **Lamplighter** badge (badges come in Milestone 7; it's given then if the lamp is already lit).

#### 2. Reopen the garden shop (Milestone 8)

On the board: *"Mrs Penhallow's garden shop sold seeds I'd never even heard of. Shall we open it up again?"*

| Step | Needs | Built overnight | Marlow |
|---|---|---|---|
| 1. Mend the boardwalk | Driftwood 12, Branches 10, 800 coins | The planks along the top of the beach, from the dock to the point | "Listen to that. Proper boards under your feet again." |
| 2. Patch up the shop | Driftwood 8, Radish 5, Carrot 5, Potato 3, 1,200 coins | The boards come off the windows | "Seeds saved from your own crops. The best way to start a shop." |
| 3. Fill the seed drawers | Any bug 4, Strawberry 5, Sea Samphire 5, 1,500 coins | The shop opens | "Bees and butterflies are a garden's best friends. Mrs Penhallow always said so." |

**Opens:** the garden shop (an honesty box, no shopkeeper: Action says **Garden shop**): 10 new seeds by season
(2.3), tool upgrades (2.5), and later saplings (2.4); the seasons begin that same morning (if wanted, question 11); the
garden upgrade for houses; the bridge's plan. Badge: **Open for Business**.

#### 3. Mend the bridge to the cove (Milestone 9)

On the board: *"Past the lighthouse there's a little cove. We swam there as boys, before a storm took the bridge."*

| Step | Needs | Built overnight | Marlow |
|---|---|---|---|
| 1. Gather the timbers | Driftwood 15, Branches 12, 1,000 coins | Timbers stacked by the inlet | "Good straight timbers. The sea brings us everything in the end." |
| 2. Trade for rope | Mackerel 3, Any fish 6, Any crop 8, 1,200 coins | Coils of rope on the bank | "The rope maker up the coast drives a hard bargain, but she can't say no to mackerel." |
| 3. Build the bridge | Driftwood 10, Branches 6, 1,800 coins | The bridge across the inlet | "Off you go, then. Mind the crabs." |

**Opens:** the cove: **rock pools** to peek into (a new book page, 6 creatures), **cove fishing** (3 fish), **cove
shells** (3 new finds) and driftwood on its own beach, **stone** among its rocks, a little beach for decorations; the
general store's new **For the beach** shelf (deck chair, beach towel, sandcastle, bonfire, windbreak); the bedroom
upgrade; the café's plan. Badge: **Bridge Builder**.

#### 4. Reopen the café (Milestone 10)

On the board: *"The café made the best crab cakes on the whole coast. I can still smell them."*

| Step | Needs | Built overnight | Marlow |
|---|---|---|---|
| 1. Sweep it out | Branches 12, Driftwood 8, 1,000 coins | The boards come down | "A good sweep and some light. She's not so bad underneath." |
| 2. Rebuild the oven | Stone 20, 1,500 coins | Smoke from the chimney | "Stone from the cove, same as the first time." |
| 3. Stock the pantry | Potato 5, Carrot 5, Sea Samphire 5, Any fish 6, 1,500 coins | The café opens | "Tables laid, oven warm. Who's hungry?" |

**Opens:** cooking at the café's stove (Action: **Cook**), 2.6; **Marlow's workbench** beside the café (Action:
**Make**), crafting from materials; the café's tables and chairs as places to sit; the kitchen upgrade; the tailor's
plan. Badge: **Open for Business** (if not already).

#### 5. Reopen the tailor's (Milestone 11)

On the board: *"Every fisherman here wore a jumper from the tailor's. Warmest wool you'll ever know."*

| Step | Needs | Built overnight | Marlow |
|---|---|---|---|
| 1. Patch the roof | Driftwood 12, Stone 10, 1,200 coins | New slates | "Dry as a bone inside now." |
| 2. Shell buttons | Any beach find 8, Sea Glass 2, 1,000 coins | Jars of buttons in the window | "Shell buttons. They never come off in the wash." |
| 3. Thread and dye | Cotton 10, Strawberry 5, 1,500 coins | The tailor's opens | "Strawberries make the loveliest pink. Don't tell anyone I said that." |

**Opens:** the tailor's (Action: **Tailor**): hats and accessories, dyes, new looks, wallpaper and floors for your
rooms, a roomier bag (2.7); the loft upgrade; the orchard's plan.

#### 6. Plant the orchard (Milestone 12)

On the board: *"My father planted apple trees up on the hill. Let's plant some for whoever comes after us."*

| Step | Needs | Built overnight | Marlow |
|---|---|---|---|
| 1. Clear the brambles | Branches 15, 1,000 coins | The hillside is clear | "Look at that view. Trees will love it up here." |
| 2. Fence and gate | Driftwood 12, Stone 12, 1,500 coins | A low fence with a gate | "A gate to lean on. Every orchard needs one." |
| 3. A picnic for planting day | Any dish 3, Any crop 10, 1,500 coins | Twelve tree spots, ready | "We always had a picnic on planting day. Here's to the next forty years." |

**Opens:** twelve tree spots; saplings at the garden shop (2.4); fruit recipes at the café; the greenhouse's plan.
Badge: **Orchard Keeper**.

#### 7. Restore the greenhouse (Milestone 12)

On the board: *"Tomatoes in midwinter! The greenhouse was the wonder of the village."*

| Step | Needs | Built overnight | Marlow |
|---|---|---|---|
| 1. Clear out the glasshouse | Branches 12, Stone 15, 1,500 coins | The rubble's gone | "Mind the broken panes. We'll have those out next." |
| 2. New panes | Sea Glass 4, Driftwood 12, 2,500 coins | Sea-glass panes, green and blue | "Sea glass windows! Mrs Penhallow would have loved that." |
| 3. Warm the beds | Stone 20, Any crop 20, 3,000 coins | The greenhouse opens | "There. Spring all year round, for as long as you like." |

**Opens:** the greenhouse: a glass room with 32 plots where **any seed grows in any season**; Marlow's last note for
now ("The village is awake again. I think I'll sit on the point and watch the boats come in."), and the **Village
Restored** badge for everyone.

### 2.2 Building materials

New items, in a new `material` category. They stack to 99, sell for very little (so the board is the place for them,
but the crate still takes them so nothing's ever stuck), and lie on the ground like beach finds: face one (or stand
on it) and Action says **Pick up**; hold it to sweep a row. Overnight a few more appear, never more than a cap.

| Material | Where | Each morning | Most lying about | Sells | From |
|---|---|---|---|---|---|
| **Driftwood** | Beach sand (the same tiles as beach finds); from Milestone 9 also the cove's beach | 3–5 (cove: 1–2 more) | 8 | 5 | Milestone 6 |
| **Branches** | Under the meadow's trees: `woods` rectangles in Tiled, on walkable grass | 3–5 | 8 | 5 | Milestone 6 |
| **Stone** | Among the cove's rocks: `rocks` rectangles in Tiled | 4–6 | 10 | 8 | Milestone 9 |

- **The storm:** the morning Marlow arrives brings 10 driftwood and 6 branches, so step 1 can be done on the first
  evening.
- **Marlow's luck:** while the current step needs a particular beach find (sea glass for the lamp), it washes up
  twice as often. It's invisible, it can't be gamed, and it means a lens never waits a week on bad luck.
- No pickaxe, axe or chopping: everything is picked up off the ground with whatever you're holding, like shells.
- Shells, sea glass and starfish double as materials (buttons, lenses, greenhouse panes), and crops, fish and bugs as
  trade goods, so everything they already do feeds in.

### 2.3 New crops, and gentle seasons

**Seasons (suggested, question 11):** four seasons of **14 days** each, starting with spring on the morning the
garden shop opens (the morning card says "Spring has come to the village!"). They change only gentle things:

- **Outdoors**, a seasonal seed can only be planted in its season (the hint says "Peas grow in spring. Plant them
  then, or in the greenhouse."). A crop already in the ground **always finishes**, whatever the season. Seeds keep in
  the bag for next year.
- **The six starter crops grow all year**, so nothing they do today changes.
- The garden shop shows each season's seeds (something new to look forward to every couple of weeks).
- A few of the new fish, shells and bugs are seasonal; none of the current ones change.
- The look: the pack has blossom, green, autumn and snowy versions of its round trees, so trees change with the
  season; the grass gets a recolour of our `beach-terrain.png` per season; a few leaves blow about in autumn and a few
  snowflakes in winter. The clock card shows the season.
- **The greenhouse** (the last project) grows any seed in any season.

| Crop | Season | Ripe in (days) | Regrows | Seed | Sells | Used for |
|---|---|---|---|---|---|---|
| Peas | Spring | 4 | every 2 days | 40 | 30 | Café |
| Cauliflower | Spring | 8 | — | 90 | 230 | |
| Tomato | Summer | 6 | every 3 days | 60 | 50 | Café |
| Melon | Summer | 10 | — | 150 | 400 | Café |
| Beetroot | Autumn | 4 | — | 30 | 70 | Café |
| Cranberries | Autumn | 6 | every 2 days | 120 | 40 | Café |
| Kale | Winter | 4 | — | 35 | 75 | Café |
| Leek | Winter | 5 | — | 45 | 95 | Café |
| Wheat | All year | 4 | — | 15 | 30 | Café (bread, pies), crafting |
| Cotton | All year | 6 | — | 40 | 75 | Tailor's |

Profit per tile per day sits between carrots (7.5) and strawberries (22.5) as they are now: melon 25, cauliflower
17.5, tomato 16.7 once regrowing, cranberries 20 once regrowing; wheat and cotton are cheap staples.

### 2.4 Fruit trees (the orchard, Milestone 12)

Bought as saplings at the garden shop and planted on the orchard's tree spots (Action: **Plant**). Trees **never need
watering and never die**; each grows a day every night. Once grown, three fruit hang on it every few days (Action:
**Pick**, whatever you're holding). Fruit all year; trees blossom in spring and colour in autumn just for looks.

| Tree | Sapling | Grown in | Fruit every | Fruit sells | Used for |
|---|---|---|---|---|---|
| Apple | 600 | 12 days | 3 days (3 fruit) | 50 | Apple pie, fruit salad |
| Pear | 600 | 12 days | 3 days | 55 | Fruit salad |
| Plum | 700 | 12 days | 3 days | 60 | Plum crumble |
| Cherry | 800 | 14 days | 3 days | 65 | Cherry tart, pink dye |
| Peach | 900 | 14 days | 3 days | 80 | Peach cobbler |
| Lemon | 1,000 | 16 days | 4 days | 90 | Lemonade, yellow dye |

A grown tree gives about a fruit a day (50–90 coins), so a sapling pays for itself in about two weeks of fruit.

### 2.5 Tool upgrades (garden shop, Milestone 8)

Personal: each of you upgrades your own. The old tool goes in and the new one comes out in the same bag slot.

| Upgrade | From | Does | Costs |
|---|---|---|---|
| Big watering can | Watering can | Waters the tile in front and the ones either side (3 wide), so a pass waters three rows | 1,500 coins, Driftwood 8 |
| Sprinkling can | Big watering can | Waters a 3 × 3 patch in front | 4,000 coins, Stone 12 (after the cove) |
| Wide hoe | Hoe | Digs 3 wide | 1,200 coins, Branches 8 |
| Good rod | Fishing rod | Bites come 30% sooner, and a fifth of a second longer to hook | 2,000 coins, Driftwood 6 |
| Bug net | (new) | Catch bugs from two tiles away | 800 coins, Branches 6 |
| Shell basket | (new) | Pick up takes everything within a tile of you at once | 800 coins, Driftwood 6 |

Hold to repeat works as now; a wide tool just covers more per step.

### 2.6 Cooking and making (Milestone 10)

**Cooking** at the café's stove: Action says **Cook**, and a recipe card lists what you can make with what's in your
bag ("Cook 1", "Cook all"). Recipes are shared (village knowledge): all of these are known when the café opens,
except the ones that come later.

| Dish | Ingredients | Sells | Eat for (the rest of the day) |
|---|---|---|---|
| Grilled sardines | Sardine 2 | 60 | Fish bite a little sooner |
| Radish salad | Radish 2, Carrot 1 | 180 | — |
| Strawberry jam | Strawberry 3 | 190 | Finds glint more |
| Samphire fritters | Sea Samphire 2, Wheat 1 | 120 | — |
| Seaside chowder | Any fish 1, Potato 1, Sea Samphire 1 | 250 | Fish bite a little sooner |
| Fish pie | Any fish 2, Potato 1, Wheat 1 | 290 | Fish bite a little sooner |
| Pumpkin soup | Pumpkin 1, Carrot 1 | 450 | A spring in your step (walk faster) |
| Bread | Wheat 3 | 130 | — |
| Tomato soup | Tomato 3 | 210 | A spring in your step |
| Pea and leek soup | Peas 2, Leek 1 | 200 | A spring in your step |
| Melon sorbet | Melon 1, Strawberry 2 | 600 | Finds glint more |
| **Crab cakes** (Marlow's favourite; after the cove) | Shore Crab 2, Wheat 1 | 260 | Bugs don't flit off |
| **Apple pie** (after the orchard) | Apple 3, Wheat 2 | 290 | A spring in your step |
| **Fruit salad** (after the orchard) | Any fruit 3 | 250 | Finds glint more |

Dishes sell for about 1.4 times their ingredients, so cooking is worth it but never needed. Holding one, Action says
**Eat** (question 15). The treats are small, last until bedtime and don't stack.

**Making** at Marlow's workbench, beside the café: Action says **Make**, same recipe card. Makes furniture and
decorations from materials, so materials stay useful after the projects.

| Make | From | Goes |
|---|---|---|
| Driftwood chair | Driftwood 4 | House or farm |
| Driftwood table | Driftwood 6 | House or farm |
| Branch fence (3) | Branches 3 | Farm |
| Stone path (4) | Stone 2 | Farm (flat, walk over it) |
| Garden bench | Driftwood 6, Stone 2 | Farm |
| Bird bath | Stone 6 | Farm |
| Shell lamp | Any beach find 3, Driftwood 2 | House |
| Sea glass mobile | Sea Glass 3, Branches 2 | House |
| Shell wind chime | Any beach find 4, Branches 1 | Farm |
| Driftwood sign | Driftwood 2 | Farm |
| Lobster pot | Driftwood 4, Branches 4 | Farm |
| Rock garden | Stone 5 | Farm |

Later making-recipes come in messages in bottles (a Foraging perk, 2.10) and Marlow's notes.

### 2.7 Outfits and customization (the tailor's, Milestone 11)

The characters are the pack's whole sprites, so "outfits" are things we can draw over them or swap cleanly:

- **Hats and accessories** (our own, drawn over the head in each facing): straw hat, sun hat, fisher's cap, woolly
  hat, flower crown, sailor's cap, bucket hat, beret, bow, headscarf, and two seasonal ones (a pumpkin hat, a
  snowflake beanie). 300–800 coins; some also ask cotton.
- **Dyes** for your character's clothes, eight colours, made by swapping each character's clothing colours (a small
  table per character). 200 coins each.
- **New looks:** six more characters from the full Ninja Adventure pack (free, CC0), for the look picker.
- **Wallpaper and floors** for each of your rooms, from the pack's interior walls and floors (four wall colours,
  eight floors). Changed from your own room, like arranging.
- **A roomier bag:** 24 → 32 slots, 2,500 coins and Cotton 10. Once each.

The **Wardrobe** tab of the You card picks what you wear from what you own (anywhere, no mirror needed).

### 2.8 House upgrades (personal)

Each cottage has its own; given at the board's **Your home** tab, built overnight, by the same rules as a project
(anyone can give to either house: helping build your partner's porch is the point). Available as the village opens up:

| Upgrade | Needs | Gives | From |
|---|---|---|---|
| A porch | Driftwood 12, Branches 8, 2,000 coins | A wooden porch with a bench before your door, and a lantern that lights at night | Milestone 7 (after the lighthouse) |
| A garden | Branches 10, Driftwood 6, 3,000 coins | A little fenced garden beside the cottage: 8 farm plots and spots for flowers | Milestone 8 (after the garden shop) |
| A bedroom | Driftwood 15, Stone 15, 6,000 coins | A second room, through a door in your room | Milestone 9 (after the bridge) |
| A kitchen | Stone 15, Driftwood 8, 6,000 coins | A third room with a stove: cook at home | Milestone 10 (after the café) |
| A loft | Driftwood 20, Stone 20, 10,000 coins | An upstairs room, up a ladder in your room | Milestone 11 (after the tailor's) |

These are the long-term coin sink (27,000 coins a house, about ten sessions of income spread over weeks), entirely
optional. New rooms are new rectangles in Tiled (section 4); the main room stays as it is, so nobody's furniture moves.

### 2.9 New fish, finds and rock-pool creatures

Night fish at **the point** (once the lighthouse is lit; the light draws them in):

| Fish | When | Rarity | Sells | Size |
|---|---|---|---|---|
| Lanternfish | 6 pm – midnight | common | 45 | 5–12 cm |
| Cuttlefish | 8 pm – midnight | uncommon | 110 | 15–40 cm |
| Conger Eel | 9 pm – midnight | rare | 240 | 80–200 cm |

By day the point fishes like the shore. Squid also bites there at night.

The cove (Milestone 9):

| Kind | Name | When / where | Rarity | Sells |
|---|---|---|---|---|
| Fish | Ballan Wrasse | All day, cove | common | 40 |
| Fish | Gurnard | Mornings and evenings, cove | uncommon | 85 |
| Fish | John Dory | Afternoons, cove (summer and autumn) | rare | 230 |
| Beach find | Sand Dollar | The cove's beach | common | 30 |
| Beach find | Razor Shell | The cove's beach | uncommon | 45 |
| Beach find | Abalone Shell | The cove's beach (spring and summer) | rare | 120 |
| Rock pool | Shore Crab | Any pool | common | 35 |
| Rock pool | Hermit Crab | Any pool | common | 40 |
| Rock pool | Prawn | Any pool | uncommon | 60 |
| Rock pool | Sea Anemone | Any pool | uncommon | 70 |
| Rock pool | Sea Urchin | Any pool | uncommon | 80 |
| Rock pool | Little Octopus | Any pool (evenings) | rare | 200 |

**Rock pools:** four or five pools in the cove's rocks (points in Tiled). Each morning each pool has one creature in
it (from the world seed, like the beach). Facing a pool, Action says **Peek**: you find it (bag and book), or "Just
a bit of seaweed today." The book gets a **Rock pools** page (the book goes from 23 to 38 things with the night fish,
the cove and the pools).

### 2.10 Skills

Three skills, **levels 1 to 10**, each its own and personal. Everyone starts at level 1 (question 14).

**How you get better** (experience, never shown as numbers flying about):

| Skill | For |
|---|---|
| Farming | Picking a crop: its days to ripen (radish 3 … pumpkin 8; melon 10). A regrown pick: 2. A fruit pick: 2. |
| Fishing | Landing a fish: 4 common, 7 uncommon, 12 rare; +3 for a new record. One that got away: 1 (you learn from those too). |
| Foraging | A beach find: 3 (uncommon 5, rare 10). A bug: 3 / 5 / 10. Driftwood, a branch or a stone: 1. A rock-pool creature: 4. |

**The curve** (total experience to reach each level):

| Level | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|
| Total | 30 | 90 | 190 | 340 | 550 | 830 | 1,190 | 1,640 | 2,190 |

A session of doing a bit of everything earns about 100–150 in each skill; a session spent mostly fishing about 250 in
fishing. So level 2 or 3 comes on the first evening, then a level every session or two, slowing to one every two or
three sessions near the top; level 10 after roughly 15 sessions of the thing you love (a month or so).

**Perks:** every level gives something. The bigger ones are kept small, never needed, and only ever help the one who
earned them (except Foraging 5, which brings an extra find for both of you).

| Level | Farming | Fishing | Foraging |
|---|---|---|---|
| 2 | **Plant and water:** planting also waters the tile | **Steady hands:** a fifth of a second longer to hook | **Bright eyes:** finds glint more often |
| 3 | **A little extra:** 1 in 10 picks gives one more | **Quick bites:** bites come 15% sooner | **Light step:** catch bugs from a step further |
| 4 | Title "Keen Gardener" and a straw hat (worn from Milestone 11; a decoration until then) | Title "Keen Angler" and a mounted fish for your wall | Title "Keen Forager" and a shell wreath |
| 5 | **Seed saver:** 1 in 6 picks gives a seed back | **Big ones:** fish come a little bigger | **Extra tide:** one more find washes up each morning, for both of you |
| 6 | A golden watering-can planter | A lobster pot | A butterfly jar |
| 7 | **Bumper crop:** 1 in 6 picks gives one more (instead of 1 in 10) | **Lucky line:** rare fish bite a bit more often | **Armful:** 1 in 4 driftwood, branches or stones comes as two |
| 8 | Title "Master Gardener" | Title "Old Salt" | Title "Beachcomber" |
| 9 | **Early riser:** crops you plant sprout a day sooner the first time | **Gentle reel:** tugs pull back less | **Rock-pool luck:** the pools' rarer creatures turn up more |
| 10 | **Golden crops:** 1 in 20 picks is golden (sells for 3×) and a badge | **Double catch:** 1 in 8 catches is two fish, and a badge | **Messages in bottles:** now and then one washes up for you, with an old letter from the village and a making-recipe, and a badge |

### 2.11 Badges

About 27, each with a silhouette and a hint until earned, like the book. Earned ones show the day. Village badges go
to every farmer (it's a shared village); the rest are personal.

| Group | Badge | For |
|---|---|---|
| Fishing | First Catch · Angler · Old Salt | A fish · 50 fish · 250 fish |
| | Night Owl | A fish after 10 pm |
| | Record Breaker | A bigger fish than ever |
| Farming | First Harvest · Green Thumb · Harvest Home | A crop · 100 crops · 500 crops |
| | Every Crop | One of every crop there is |
| Foraging | Shell Seeker · Butterfly Friend | Every beach find · every bug |
| | Beachcomber · Kindling | 100 beach finds · 50 driftwood, branches or stones |
| Village (everyone) | Lamplighter · Open for Business · Bridge Builder · Orchard Keeper · Village Restored | The lighthouse lit · the first shop open · the bridge mended · the orchard planted · all seven projects |
| Giving | Helping Hand · Pillar of the Village | 25 things given to the board · 250 |
| Home | Moved In · Homemaker · Porch Sitter | A cottage · 20 pieces put down · a porch built |
| Together | Side by Side | 10 nights where you both went to bed |
| | Sleepover | A night in the other's house |
| | Up the Lighthouse | The view at night |
| Collecting | Full Book | Every page of the collection book complete |

Badge pictures are cheap: a round medal frame (ours) around an icon the game already has.

### 2.12 Marlow's words

- **Notes:** every line in the project tables above, plus one per opening and one per house upgrade ("A porch!
  Somewhere to sit and watch the boats come in."). All in `shared/content/keeper.ts`.
- **Small talk** (Talk when there's no new note), picked by time of day, season and what's open, about 20 lines:
  "Lovely morning for it." · "The fish bite at the point after dark, you know." · "Sea glass likes the morning after a
  rough night." · "I used to row out past the point every morning. My knees had other ideas." · "Mrs Penhallow grew
  melons the size of my head. Well, nearly."
- The story comes out in these lines and nowhere else: a busy little harbour, a storm that took the bridge, people
  who drifted away, and two newcomers who woke it up. No cutscenes, no quest log.

---

## 3. Pacing

### What a session brings in (both of you, about 3 game days, about 45 minutes)

From today's numbers (`crops.ts`, `fish.ts`, `items.ts`, the tide and the meadow):

| | Early (today's farm) | Later | Notes |
|---|---|---|---|
| Coins | ~1,500 | ~3,000–4,000 | **Most of it from fishing.** A fish takes about 10 seconds start to finish and averages 40 coins at the dock by day, 53 off the end of the dock: about 170–220 coins a real minute. A field of 30 strawberries makes ~675 a day once regrowing. |
| Driftwood | ~12 | ~15 (with the cove) | 3–5 a morning (new) |
| Branches | ~12 | ~12 | 3–5 a morning (new) |
| Stone | — | ~15 | 4–6 a morning, from Milestone 9 |
| Beach finds | ~10 | ~17 (with the cove) | 2–5 a morning; sea glass ~1.7 a session (more while a step needs it) |
| Fish | ~25 | ~25 | As many as you like |
| Bugs | ~12 | ~12 | 3–6 every two game hours |
| Crops | 20–40 picked | 40–80 | Depends on the field |

**The rule this sets:** projects gate on *things*, not coins. Coins come easily (fishing), so each step's coins are a
quarter to a half of a session's income, and the scarce part of each step is one or two kinds of thing that arrive at
a steady daily trickle. Every step was sized so its scarcest need takes about one session.

### When each unlock lands (sessions of play)

At 3–4 sessions a week. "Session" = one evening of 2–4 game days. This assumes each milestone is built before the couple
reaches it (section 6).

| Session | The village | Personal | New to do |
|---|---|---|---|
| 1 | Marlow arrives; the storm; **the path to the point** (step 1) | Level 2–3 in your main skill; First Catch / First Harvest | Picking up driftwood and branches; giving at the board |
| 2 | **The stairs** (step 2) | A level | The lighthouse door opens (inside: just stairs for now) |
| 3 | **The lamp** (step 3) | A level; Helping Hand | — |
| 4 | **The lighthouse is lit** (first evening); the garden shop's plan | Porch started (M7) | Night fishing at the point (3 fish), the view, the book's new fish |
| 5 | The boardwalk | **Porch** | Walking the boardwalk to the point |
| 6 | **The garden shop opens**; spring begins | First tool upgrade | 10 new seeds over the year; bigger can |
| 7–8 | Bridge steps 1–2 | Garden | |
| 9 | **The bridge**: the cove opens | | Rock pools, cove fish and shells, stone, beach decorating |
| 10–12 | Café steps → **the café opens** | Bedroom | Cooking, treats, making at the workbench |
| 13–15 | Tailor's steps → **the tailor's opens** | Kitchen | Hats, dyes, wallpaper, a roomier bag |
| 16–18 | Orchard steps → **the orchard** | Loft | Saplings; first fruit about 4 sessions later |
| 19–21 | Greenhouse steps → **the greenhouse** | | Any seed in any season |
| after | Fruit, seasons going round, finishing the book, levels 8–10, the last house upgrades | | Ideas for later: festivals, a museum, more shops |

So: **a step or a level or a badge every session**, a **project every week or so**, the whole village in about six
weeks of evenings, and personal progress (levels 8–10, house upgrades, the book) carrying on well past that.

### Economy tweaks

1. **Driftwood and branches at 3–5 a morning each**, and the storm (10 and 6) the morning Marlow arrives.
2. **Marlow's luck:** a beach find the current step needs washes up twice as often.
3. **No step needs a seasonal item, a crop slower than 6 days, or more than two sea glass before the cove.** A content
   test enforces the first two.
4. **Leave fishing alone.** It's the coin engine and that's fine; it just means coins aren't the gate. Big optional
   coin sinks arrive over time instead: house upgrades (2,000–10,000), tool upgrades (800–4,000), saplings
   (600–1,000).
5. **Materials sell for 5 (stone 8):** never worth selling, but never stuck either.
6. **The bag:** materials add three stacks. If the bag feels tight before the tailor's roomier bag (Milestone 11), a
   storage chest for your house is a small add (question 20).
7. The new crops (2.3) are priced between today's carrots and strawberries per tile per day, so they're variety, not
   a treadmill.

---

## 4. Map and art

### The finished village

The map grows **32 columns east** (48 → 80 wide) and stays 46 tall. Growing east adds tiles without moving any
existing one, so the save's farm tiles, decorations and beach finds (all in map tiles) stay exactly where they are,
and the two rooms at the bottom don't move. Growing west or north would shift every saved tile and need a
migration, so it's avoided. New rooms (greenhouse, bedrooms, kitchens, lofts) go in the free space at the bottom,
columns 30–79, rows 37–45, out of sight like today's.

Rough places (mockup 11 draws it):

| Place | Columns, rows | Notes |
|---|---|---|
| Village Board | 34–35, 14–15 | Right of the seed stand. Marlow stands at 36, 15. |
| Boardwalk | rows 19–20, from the dock path (col 31) east to the point (col 58) | Planks along the top of the beach (TilesetWater's dock planks), on stilts where the shore curves in, like the dock |
| Garden shop | 38–41, 15–17 | A 4 × 3 shopfront on the grass above the boardwalk |
| Café, and Marlow's workbench | 45–48, 15–17; bench at 49, 17 | |
| Tailor's | 52–55, 15–17 | |
| The point | 58–66, rows 18–35 | A rocky headland running south into the sea (TilesetRelief cliffs, the pack's rocks) |
| Lighthouse | 61–63, rows 26–31; door at 62, 31 | `pointWater` rectangles around its foot for night fishing |
| The inlet and the bridge | inlet 66–68, rows 12–35; bridge at rows 20–21 | The pack's plank bridge; broken in the middle until mended |
| Hidden cove | 69–79, rows 12–35 | Sand under low cliffs, 4–5 rock pools, rocks with stone, its own little beach facing south |
| Orchard | 48–60, rows 2–11 | East of the cottages on the upland; 12 tree spots in a 4 × 3 grid |
| Greenhouse | 62–67, rows 3–7; its room at the map's bottom | Glass building; the room has 32 farmland tiles |
| Porches and gardens | In front of and beside each cottage | Porches on the cottage's front row; gardens east of each |

### Locked and unlocked, in Tiled

One general mechanism, so every phase uses the same thing:

- **Built names:** a finished project (`lighthouse`), one of its steps (`lighthouse/path`), or a house upgrade
  (`house1:porch`).
- **Tile layers** may have a string property **`shownFrom`** (drawn and in effect once that's built) or
  **`shownUntil`** (until it's built). Any tile layer, so art comes and goes (the brambles, the broken bridge, the
  boarded windows, the bunting, scaffolding). A layer whose name starts with **`Collision`** (`Collision brambles`)
  or **`Farmland`** (`Farmland greenhouse`) counts towards walls or farming while it's in effect.
- **Objects** (places, spots, `pointWater`, `woods`, `rocks`, tree spots, rock pools) may have a **`needs`**
  property: they do nothing until it's built.
- `parseTiledMap` reads these into `WorldMap.gates`; one pure function, **`mapFor(map, built)`**, gives "the map as
  of today", and every existing rule (reach, places, fishing spots, beach sand, meadow grass, decorations) keeps
  working by being handed that map. The server caches it and only works it out again after a night.
- The client shows and hides gated layers by the same rule, and turns each gated collision layer's collider on or off,
  under the night's fade.
- **Tests:** `map.test.ts` checks the map twice, with nothing built and with everything built: the spawn, the farm,
  every place and door reachable; the cove unreachable until the bridge; the lighthouse door unreachable until the
  path; and that the map only ever grows east or down: the Farmland layer, the spawn, the crate, the tent, the stands,
  the store and the rooms stay exactly where they were, so no saved tile lands somewhere new.
- **Building never squashes a decoration:** if something built overnight (the board, a shopfront, a porch) covers a
  decoration someone put down, the decoration moves to the nearest free tile. Nothing is lost. The board's tiles are
  checked the same way the first time the server starts with Milestone 6.
- **A rejoin guard:** a reconnecting player whose saved position isn't walkable in today's map (a stale tab, a map
  edit) starts at the spawn instead.

What each milestone changes in the map:

| Milestone | Tiled work |
|---|---|
| 6 | Grow east to 80 columns. Paint all the new land and sea with the terrain brush (beach on east to the point, the point, the inlet, the cove's land, the upland), dressed with the pack's trees and rocks. `board` and `lighthouse` rectangles; `pointWater` (`needs: lighthouse`); `woods` rectangles. Brambles across the neck of the point on `Brambles` (`shownUntil: lighthouse/path`) and `Collision brambles`. Scaffolding layer (`shownFrom: lighthouse/stairs`, `shownUntil: lighthouse`). The broken bridge drawn, its gap on `Collision bridge` (`shownUntil: bridge`), so the cove is a visible teaser. |
| 7 | Porch art per cottage on `Porch house1` layers (`shownFrom: house1:porch`). |
| 8 | Boardwalk planks (`shownFrom: gardenShop/boardwalk`), the three shopfronts with boarded overlays (`shownUntil`), the `gardenShop` place (`needs: gardenShop`); garden plots per cottage (`Farmland house1 garden`, `shownFrom: house1:garden`). |
| 9 | The mended bridge (`shownFrom: bridge`); `rocks`, `tidePool` points, the cove's `deepWater`-style `coveWater` rectangle; bedroom rooms (`interior1-bedroom`, `needs: house1:bedroom`) and their doors. |
| 10 | Café place, `stove` and `workbench` spots; kitchen rooms. |
| 11 | Tailor's place; loft rooms. |
| 12 | Orchard brambles (`shownUntil: orchard/clear`), fence, `treeSpot` points; the greenhouse building (broken until built) and its room with `Farmland greenhouse`. |

### Art: what the pack already has, and what we draw

What's already in `client/public/assets/ninja-adventure/` (or free in the full pack, CC0):

| Need | From the pack |
|---|---|
| Marlow | **OldMan3** sprite sheet and faceset, already copied in and unused |
| Shopfronts (garden shop, café, tailor's) | TilesetHouse: several more 4 × 3 houses and shops besides the store and cottages (the red-signed shop, the timber house, the round stone house, the striped market awnings) |
| Boardwalk | TilesetWater's dock planks (the dock uses them now) |
| Bridge | TilesetHouse's plank bridge (two styles); the broken one is the same with planks left out |
| The point and the cove's cliffs and rocks | TilesetRelief cliffs; TilesetNature's boulders and pebbles |
| Rock pools | TilesetWater's small pond autotiles, set in sand |
| Seasonal trees | TilesetNature: the round trees in blossom, green, autumn and snow; snowy pines |
| Orchard trees when grown | TilesetNature's big round trees (fruit drawn over them, ours) |
| Bunting and banners | TilesetHouse's banners |
| Café stove, tables | TilesetElement's furniture and pots; tileset_camp's campfire |
| Tailor's sign | TilesetElement's clothes on a line |
| Bigger houses | TilesetInterior: walls in four colours with inside walls and doorways; TilesetInteriorFloor's floors (also wallpaper and floor choices) |
| Material icons (stand-ins) | tileset_camp's logs and planks, TilesetNature's twigs and pebbles |
| Skill icons | Ui/Skill Icon: Harvest (farming); fish and shell from our sheets |
| New looks | More characters in the full pack |
| Music for new places | Peaceful, Sunny, Aquatic (already imported, unused) |

What we draw in `tools/sprites/` (each with a line in its README and CREDITS.md):

| Milestone | Our sprites |
|---|---|
| 6 | **The lighthouse** (3 × 6 tiles: dark, scaffolded and lit lamp frames), the **beam and halo** (a few flat alpha bands, no gradients), **the Village Board** (2 × 2, with 0–3 pinned notes), **driftwood** and **branches** (on the ground and as icons), **brambles**, **three night fish**, a "Give" icon for the button |
| 7 | Badge frame, skill icons where the pack has none, porch pieces (bench, lantern) if the pack's don't fit |
| 8 | **Ten crops** (stages, item, seed packet: a row each in `crops.png`), **tool upgrade icons** (6), boarded-window overlay, seasonal recolours of `beach-terrain.png` |
| 9 | **Stone**, **three cove fish**, **three cove shells**, **six rock-pool creatures**, beach decorations (deck chair, towel, sandcastle, bonfire, windbreak) |
| 10 | **Fourteen dishes**, twelve made things where the pack has nothing close (shell lamp, sea glass mobile, wind chime…) |
| 11 | **Twelve hats** (4 facings each, drawn over the head), dye tables per character |
| 12 | **Saplings and young trees**, fruit on the big trees, **six fruit**, the greenhouse (broken and restored) and its planters |

---

## 5. Server and save

### New World fields (pure data, in `shared/world/world.ts`)

```ts
interface World {
  // …everything today…
  /** Since v4: Marlow and the projects. */
  readonly village: Village;
  /** Since v4: driftwood and branches lying about (and stone from v7), like the beach. */
  readonly forage: { readonly day: number; readonly items: readonly ForageItem[] };
}

interface Village {
  /** The day Marlow arrived; 0 before he has. */
  readonly keeperDay: number;
  /** Every project anyone has given to, by id (house upgrades too: "house1:porch"). Missing = not started. */
  readonly projects: Readonly<Record<string, ProjectProgress>>;
}

interface ProjectProgress {
  /** Steps whose needs are all in, 0 to the project's step count. */
  readonly gathered: number;
  /** Steps built. The night brings it up to `gathered`. */
  readonly built: number;
  /** What's been given towards the step being gathered, by need key: an item id, "any:fish", "coins". */
  readonly given: Readonly<Record<string, number>>;
  /** Everyone who has given something, in the order they first did (faces on the card). */
  readonly helpers: readonly FarmerId[];
  /** The day it was finished (all steps built). */
  readonly doneDay: number | null;
}

interface ForageItem { readonly itemId: ForageId; readonly col: number; readonly row: number }

interface Farmer {
  // …name, character, bag…
  /** Since v5: skills, counts for badges, and badges earned (with the day). */
  readonly progress: {
    readonly xp: Readonly<Record<SkillId, number>>;
    readonly stats: Readonly<Partial<Record<StatId, number>>>;
    readonly badges: Readonly<Partial<Record<BadgeId, number>>>;
  };
}

interface MorningReport {
  // …as today…
  /** Since v4: what was built overnight, for the "In the village" lines. */
  readonly built: readonly { project: string; step: number }[];
}
```

- **Unlocks aren't stored:** "is the cove open?" is worked out from the projects (`builtThings(world)`), so there's one
  truth and nothing to get out of step.
- Later milestones add: `yearStart` (seasons, v6); `pools` (today's rock-pool creatures taken) and the book's
  `critters` page (v7); `recipes` known (v8); `wardrobe`, `outfit`, room styles and bag size per farmer (v9); `orchard`
  trees (v10). House rooms add `rooms` beside `furniture` (the main room stays `furniture`, so it never moves).

### Network state (`shared/schema.ts`)

- `FarmState.village`: `keeperDay` and a map of `ProjectState { gathered, built, given (map of uint32), helpers (array
  of strings), doneDay }`.
- `FarmState.forage`: an array like `beach`.
- `Player` (Milestone 7): `xp` per skill and `badges`, copied from the farmer, so your You card is live.
- Converters in `stateSync.ts`, with tests, as for everything else.

### Messages (`shared/messages.ts`, one new section per feature)

| Message | Data | Server checks | Rule |
|---|---|---|---|
| `give` | `{project, need, count}` | Near the board (`trade.ts`'s "next to it and awake"); the project is open; `need` is a key of its current step; count 1–9999 | `giveToProject` |
| `giveAll` | `{project}` | Near the board; open | `giveEverything` |
| `pickUp` (as today) | `{col, row}` | In reach | Now looks in the forage as well as on the beach; no new message |
| `villageEvent` (server → everyone) | `{event, by, sessionId}` | When a step's last need goes in | Drives the cheer on both screens |
| `levelUp`, `badge` (server → one farmer, M7) | `{skill, level}`, `{badge}` | When the rules say so | Drives the small card |
| Later | `upgradeTool` (M8), `peek` (M9), `cook`, `craft`, `eat` (M10), `wear`, `setRoomStyle` (M11), `plantTree`, `pickFruit` (M12) | Near the place, owns the things | Pure rules below |

Built steps reach clients through the state (projects' `built`) and the morning report; no extra message.

### Where the pure rules go (`shared/`, with tests, no Phaser or Colyseus)

| File | What |
|---|---|
| `content/projects.ts` | The projects as data: steps, needs, what each opens, Marlow's lines; `isProjectId`; house upgrades as one-step projects per cottage |
| `content/keeper.ts` | Marlow's notes and small talk, and his day's places |
| `content/items.ts` | Materials (`material` category); later dishes, fruit, tools |
| `content/forage.ts` | Where each material appears and how many a morning |
| `village/projects.ts` | `openProjects`, `stepOf`, `needsLeft`, `giveToProject` (from a bag slot, or coins from the wallet), `giveEverything` (cheapest first for "any" needs), `buildOvernight` (catches `built` up and lists what was built) |
| `village/built.ts` | `builtThings(world)`: the set of built names |
| `world/gates.ts` | `mapFor(map, built)`: the map as of today; `makeRoom(world, rect)`: moves decorations off anything newly built |
| `world/keeper.ts` | `keeperSpot(minute, built, openingToday)` |
| `foraging/forage.ts` | `forageIn` (the morning's driftwood and branches, seeded from the world seed and day, like `washUpFinds`), `collectForage` |
| `world/night.ts` | `endNight` also builds, forages, and brings Marlow (new worlds, day 2) |
| `progress/skills.ts`, `progress/badges.ts` (M7) | `gainXp` (returns level-ups), `levelOf`, `perksOf`; stats counters and `newBadges`; called from `collect.ts`, `applyFarmAction` and `giveToProject` so every way of doing something counts the same |
| Later | `time/seasons.ts`, `farming/tools.ts` (which tiles a wide tool covers), `tidepools/pools.ts`, `making/recipes.ts` (cook and craft share one rule), `orchard/orchard.ts` |

The Action button: `chooseAction` gains `{kind: "board"}`, `{kind: "give", itemId, count}`, `{kind: "talk"}`, and
later `climb`, `cook`, `make`, `peek`, `plantTree`, `eat`. Places that aren't built give the "closed" hint.

### How unlocks gate places

1. A step is built overnight (`buildOvernight` in `endNight`).
2. `builtThings(world)` now includes `lighthouse/path`.
3. The room works out `mapFor(VILLAGE_MAP, built)` again and keeps it; the shore, the meadow, the fishing spots and
   the places all come from it from now on.
4. The client gets the new projects state with the morning, and under the fade shows and hides gated layers and
   turns collision on or off.
5. The server refuses actions at places whose `needs` isn't built (a stale tab can't fish at the point early), with
   the same "closed" hint.

### The night, now

`endNight` (all at once, as today): crops grow, soil dries, the crate sells, the clock moves on, **the gathered steps
are built**, the tide, **driftwood and branches**, Marlow arrives if it's his day; the morning report lists what was
built. Then save, then the morning card.

### Saving and migrations

Every phase that changes the save adds one migration, one fixture and its tests, in order (they all touch
`worldSave.ts`, so save work never runs in parallel):

| Version | Milestone | The migration adds | Everything else |
|---|---|---|---|
| 4 | 6 | `village: { keeperDay: 0, projects: {} }`, `forage: { day: 0, items: [] }`, `built: []` on the last morning | Untouched. Marlow and the storm come on the first start (like the first tide), not in the migration, so the migration only adds empty things. |
| 5 | 7 | `progress` for every farmer: xp 0, no stats, no badges | Untouched. Everyone starts at level 1. On first join, Moved In goes to anyone who has a house and Lamplighter to everyone if the lighthouse is already lit (badges that follow from the world are worked out, not back-dated counts). |
| 6 | 8 | `yearStart: 0` (seasons start the morning the garden shop opens) | Old tools stay; upgraded tools are new item ids, so no rewrite. |
| 7 | 9 | `pools: { day: 0, taken: [] }`, the book's `critters: {}`, `rooms: {}` on every house | |
| 8 | 10 | `recipes: [the café's starter list]` | Dishes are just new items. |
| 9 | 11 | `outfit: { hat: null, dye: null }`, `wardrobe: []`, `bagSize: 24` per farmer; `style` per room | Bags stay 24 until a roomier bag is bought (then padded with empty slots). Validation accepts 24 or 32. |
| 10 | 12 | `orchard: {}` | Greenhouse plots are ordinary farm tiles in its room: no change. |

**Validation**, as strict as today, with two kindnesses learned from crops: a project's `gathered`, `built` and
`given` numbers are kept within the project's current data rather than refused (so tuning a step's numbers never
stops a save loading), and an unknown project id stops the server like an unknown item does (renaming one is a
migration).

**Fixtures:** `server/src/persistence/fixtures/world-v4.json` (and v5…) committed with the new things filled in
(a project half done, another finished, driftwood on the sand). `oldSaves.test.ts` already insists on one per
version, and gains checks that v1–v3 come through with an empty village, no forage and `built: []`, and every bag,
crop, coin, house, decoration, find and book entry as it was.

**The real farm's v3 save** (real progress) upgrades like this, each milestone:

1. `npm run farm:backup` for a fresh copy in OneDrive.
2. **Dry run:** `node --import tsx server/src/persistence/checkCli.ts <that copy>` with the new code. It upgrades the
   copy in memory and checks it, writing nothing.
3. **Play it:** start a scratch dev server with `DATA_DIR` pointing at a temporary folder holding the copy; check the
   farm, bags, coins, houses and book are there, Marlow is by the board, the storm's driftwood is on the beach, and
   a night builds a step. Throw the folder away.
4. `npm run farm:up` (it disconnects anyone playing, so ask first). The save store keeps the v3 original in
   `save_archive` on first load; `npm run farm:restore` is the way back.

---

## 6. Build order

Every step ends playable (except pure-rule steps) and gets the usual checks: `npm run typecheck`, `npm test`, two tabs
in the browser pane (one at http://127.0.0.1:5173), the mobile viewport, and a server restart. New dev commands make
it testable without grinding: `dev.give("lighthouse")` fills the current step, `dev.build()` builds overnight now,
`dev.xp("fishing", 100)`, `dev.season("winter")`.

### Milestone 6: The keeper and the lighthouse (first, small)

The smallest slice that delivers the whole loop: someone to meet, something to gather, a board to give it to, a
cheer, an overnight change, and a reward that changes every evening.

| Step | Players get | Main files | Can run alongside |
|---|---|---|---|
| 1 | (rules only) Projects, giving, building overnight, built names, forage, Marlow's places | new `shared/content/projects.ts`, `keeper.ts`, `forage.ts`; `shared/village/`, `shared/foraging/`, `shared/world/keeper.ts`, `gates.ts`; `items.ts` (materials); `night.ts` | 2, 3 |
| 2 | (map) The village grows east; the point, the lighthouse and board spots, brambles, the broken bridge, `woods` | `village.json`, `tiledMap.ts`, `map.ts`, `map.test.ts` | 1, 3 |
| 3 | (art) Lighthouse, beam, board, driftwood, branches, brambles, three night fish | `tools/sprites/` (new files), `art-preview.html` | 1, 2 |
| 4 | Save v4 and the network state; the dry run on a backup | `worldSave.ts`, fixtures, `oldSaves.test.ts`, `schema.ts`, `stateSync.ts` | after 1 |
| 5 | Driftwood and branches on the ground; Pick up; the storm; the morning card line | new `client/src/world/Forage.ts`; `rooms/beach.ts`; `morningText.ts` | 6 |
| 6 | Marlow, Talk, his note card; the board; **Board** and **Give** on the Action button; the board and project cards; the book's Village page | new `client/src/world/Keeper.ts`, `client/src/ui/BoardPanel.ts` + `board.css` + `boardText.ts`, `KeeperNote.ts`; new `server/src/rooms/village.ts`; `actions.ts`; `BookPanel.ts` | 5 |
| 7 | The cheer on both screens; building overnight; "In the village" with Look; the opening card; the brambles go; the lamp at dusk; the glow | `Celebration.ts`, `MorningCard.ts`, new `OpeningCard.ts`, new `client/src/world/Lighthouse.ts`, `rooms/night.ts` | after 6 |
| 8 | Night fishing at the point; the view | `fish.ts`, `fishing/spots.ts`, `Lighthouse.ts`, `WorldScene.ts` camera | after 2, 3, 7 |
| 9 | Tips (the board, giving, the point), docs, the two-player check, the real-farm dry run, the report | docs, `tipRules.ts` | last |

**If it needs to be smaller still**, step 8 (night fish and the view) can follow as a short Milestone 6½: the
lighthouse would glow but not yet change fishing.

**Keeping parallel steps apart:** as in earlier milestones, each feature's handlers get their own file in
`server/src/rooms/`, each panel its own CSS, each feature its own section of `shared/messages.ts`, so sessions meet
only in one-line additions (`FarmRoom.ts`, `WorldScene.ts`, `chooseAction`). Steps 1–3 touch entirely different
files. Step 4 waits for step 1's types (commit the `World` and `Village` types first, so 1 and 4 can overlap).
Steps 5 and 6 only meet in `actions.ts` (one case each) and `messages.ts` (own sections).

**New tests worth having:** every project need is an item that exists, isn't seasonal, and has a source (a stand, a
spot, the tide, forage); a step's scarcest need fits in about a session of the supply table in section 3 (a small
`pacing.test.ts`, so later tuning can't make a step grindy by accident); the map checks in section 4; old saves
through v4.

### Milestones 7–12, in brief

| Milestone | Steps | Can run alongside |
|---|---|---|
| **7. Skills, badges and porches** | 1. Rules: skills, perks, stats, badges, called from every way of doing things. 2. Save v5. 3. The You card (Skills, Badges), the dot, the small cards. 4. Perks in the game (each one small). 5. The board's Your home tab and the porch (art, layer, lantern at night). | 1 with 3's layout; 5 with 3–4. The You card replaces the look button's job: touches `UIScene.ts`, so one at a time with any other HUD change. |
| **8. The garden shop and the seasons** | 1. Seasons rules and new crops data; crops art. 2. Save v6. 3. Boardwalk and shopfronts in Tiled. 4. The garden shop panel (seasonal stock) and tool upgrades (wide tools). 5. Seasons on screen (clock card, trees, grass, planting hint). 6. The garden upgrade. | 1's art with everything; 3 with 4; 5 after 1. |
| **9. The bridge and the cove** | 1. Cove data (fish, finds, critters), rock-pool rules, stone forage. 2. Save v7. 3. The cove in Tiled (pools, rocks, the mended bridge). 4. Peek and the Rock pools page. 5. Cove fishing and the beach shelf. 6. The bedroom (rooms inside rooms: a door spot in the main room). | 1 and 3 and the art; 4 with 5. |
| **10. The café and the workbench** | 1. Recipes rules (cook and craft are one rule), dishes, treats. 2. Save v8. 3. The recipe card (one panel for both). 4. Eat. 5. The kitchen. | 3 with 4. |
| **11. The tailor's** | 1. Wardrobe data, dye tables, hats art. 2. Save v9. 3. The tailor's panel and the Wardrobe tab. 4. Hats and dyes drawn on characters (both screens). 5. Room styles. 6. The roomier bag. 7. The loft. | 1's art early; 4 with 5. |
| **12. The orchard and the greenhouse** | 1. Trees rules and data. 2. Save v10. 3. Orchard and greenhouse in Tiled. 4. Planting and picking trees. 5. The greenhouse room (seasons don't apply inside). 6. Marlow's last note. | 4 with 5. |

**Across milestones:** the save work is strictly in order (v5 before v6…), and anything touching `UIScene.ts` goes one
at a time. Everything else can overlap: for example the art for Milestone 8's crops can be drawn while Milestone 7 is
built. Keep the next project built before the couple finishes the current one; if they catch up, the board says
"Marlow's still drawing up the next plan" and the house upgrades keep things moving.

---

## 7. Open questions

Each has a suggested answer. Say the word and it goes into DESIGN.md.

1. **The keeper's name and look.** *Suggested: Marlow, the pack's OldMan3 (straw hat, white beard). Or a name that
   means something to you two (pillar 4: made for us).*
2. **Where the board stands.** *Suggested: right of the seed stand, at the market's east end, on the way to the
   point.*
3. **When Marlow arrives on the real farm.** *Suggested: as soon as the server starts after the update, with the
   storm's driftwood, and his note greets each of you once; in a new world, the morning of day 2.*
4. **Built at once, or overnight?** *Suggested: overnight, for steps and projects alike, with an immediate cheer when
   the last thing is given. The lighthouse lights at dusk.*
5. **How many projects open at once?** *Suggested: one village project at a time, plus home upgrades; the next ones
   shown as silhouettes.*
6. **Giving towards a later step?** *Suggested: no, only the current one; later steps are shown so you can plan.*
7. **Which fish go when a step asks for "any fish"?** *Suggested: the cheapest first, automatically, with Choose to
   pick by hand.*
8. **Show who gave what?** *Suggested: faces of everyone who helped, never counts.*
9. **Materials.** *Suggested: driftwood (beach), branches (under the meadow's trees), stone (the cove's rocks), all
   picked up off the ground with whatever you're holding; no axe or pickaxe.*
10. **The project order.** *Suggested: lighthouse, garden shop, bridge, café, tailor's, orchard, greenhouse (section
    0).*
11. **Seasons?** *Suggested: yes, gentle: four of 14 days, from the morning the garden shop opens; the starter six
    grow all year; planted crops always finish; only new seeds, a few new fish, shells and bugs, and the look
    change. Without seasons, the greenhouse would instead grow crops that grow nowhere else (melon, lemons).*
12. **House upgrades: who gives?** *Suggested: anyone, to either house.*
13. **Can the other player see my level-ups?** *Suggested: no: skills are personal. Village badges are shared
    moments and go to everyone.*
14. **Credit for what we've already done?** *Suggested: no back-dated experience; everyone starts at level 1, and
    level 2 comes on the first evening. Moved In is given to anyone who already has a house.*
15. **Should eating a dish do anything?** *Suggested: yes, one small treat for the rest of the day (walk a bit
    faster, fish bite sooner, finds glint more, or bugs don't flit), never stacking, never needed.*
16. **Outfits.** *Suggested: hats and accessories drawn over the head, dyes by swapping clothing colours, and more
    pack characters as new looks. Start with hats and looks; dyes last, if the colour swaps look good.*
17. **The view.** *Suggested: climb any time once the lighthouse is lit, zoom 1 over the whole village. A Photo
    button (saves a picture, or the share sheet on iPhone) is a nice extra if it's cheap.*
18. **Growing the map.** *Suggested: east only, by 32 columns, in Milestone 6, painting all the new land at once (so
    later milestones only add buildings and layers), with a test that nothing saved can move (the farm field, places
    and rooms stay put), and decorations in the way of anything new moved to the nearest free tile.*
19. **Tool upgrades: personal or shared?** *Suggested: personal, like bags.*
20. **A storage chest?** *Suggested: wait and see after Milestone 6. If the bag feels tight with materials, a chest
    for your house (24 slots, the bag's card) is a small add to Milestone 7.*
21. **Can a project ever ask for something seasonal?** *Suggested: never, so nothing waits on the calendar.*
22. **Marlow in the evenings.** *Suggested: fishing off the end of the dock (later the point), then up in the lamp
    room. No walking about.*
23. **A Village page in the collection book?** *Suggested: yes, the board read-only, so you can check what's needed
    from anywhere. Giving still happens at the board.*
24. **What happens after the greenhouse?** *Suggested: Marlow's "last" note, then ideas for later (festivals, a
    museum for the book's finds, a fishing boat to sail out on, more shops).*
25. **The village's name.** *Still open (like the game's). Marlow could say it once you've picked one.*

---

## Doc updates along the way

- **DESIGN.md:** "Restoring the village" (added with this plan: the developer's answers). Each milestone adds its
  decisions to the table, as before, and the open answers above once given.
- **ROADMAP.md:** Milestones 6–12 (added with this plan); tick items as they land.
- **CLAUDE.md:** "Where things live" for the village rules and panels; "Editing the map" for `shownFrom`,
  `shownUntil`, `needs`, gated `Collision`/`Farmland` layers and the growth rule (east and down only).
- **README.md:** how to give at the board, Talk, Climb, and each new place as it opens.
