# Sprites

Our own sprites, drawn as data in Ninja Adventure's style. `npm run sprites` type-checks this folder and renders
everything into `client/public/assets/custom/`, plus `manifest.json`, which names every frame.

To see the result next to the pack, run `npm run dev:client` and open <http://localhost:5173/art-preview.html>.

## Files

| File | What it draws |
|---|---|
| `palette.ts` | Named colours, almost all sampled from the pack |
| `crops.ts` | Growth stages, harvested item and seed packet for each starter crop |
| `soil.ts` | Tilled soil, dry and watered, as a 16-tile autotile set |
| `beach.ts` | Shells, sea glass, starfish |
| `fish.ts` | Fifteen fish icons, one per fish in `shared/content/fish.ts` (three night fish from Milestone 6) |
| `bugs.ts` | The meadow's bugs: the pack's butterflies, three recolours, and a firefly |
| `fishing.ts` | The pack's fishing rod on a 16×16 frame, and the bobber |
| `crate.ts` | The shipping crate, closed and open |
| `seedStand.ts` | The seed stand: a market stall with seed sacks |
| `sand.ts` | Beach sand: recolours of the pack's floor and water autotiles |
| `emotes.ts` | Emote bubbles: the pack's heart, and our wave in the pack's bubble |
| `ui.ts` | HUD icons the pack lacks: music on and off |
| `materials.ts` | Building materials: driftwood and a branch (Milestone 6) |
| `village.ts` | The lighthouse in four states, the Village Board with its notes, and brambles, drawn in code (Milestone 6) |
| `rewards.ts` | The six gifts a skill's levels bring: a straw hat on a stand, a mounted fish, a shell wreath, a golden can planter, a lobster pot, a butterfly jar (Milestone 7) |
| `porch.ts` | A cottage's porch: decking, a bench, and a lantern dark and lit (Milestone 7) |
| `golden.ts` | Golden crops: each crop's harvested item recoloured in gold (Milestone 7) |
| `markers.ts` | Marker tiles for the map's hidden Collision and Farmland layers |
| `render.ts` | Puts it all together and writes the PNGs |
| `lib/image.ts` | Tiny image helpers on top of `pngjs` |

## Drawing in the pack's style

- 16×16 tiles. Shapes have a 1px outline in `#141b1b`, the pack's near-black. Don't draw the outer outline in the
  grids: `outline()` adds it, touching only orthogonal neighbours so corners stay soft. Use `k` for inner lines.
- Flat fills: a base colour, one darker shade towards the bottom right, and the odd highlight. No gradients or
  anti-aliasing.
- Plants use the pack's greens (`#adbc3a`, `#74a334`, `#4a7f4b`) and stand on the bottom of the tile.
- Pick colours from `palette.ts`. Add a new one only when the pack has nothing close, and mark it "ours".

## Grids

Each sprite is a list of strings, one per row, one character per pixel. `.` is transparent; every other
character is looked up in the file's legend. Rows must all be the same width (the renderer says which row is
wrong if not). Crop frames can be given bottom-up with `tile(...)`, which pads empty rows at the top.

## Sheet layouts

- `crops.png`: one row per crop (in `crops.ts` order). Columns 0..n−1 are the growth stages from seed to ripe,
  column 5 is the harvested item, column 6 the seed packet. Stage counts must match `stages` in
  `shared/content/crops.ts`.
- `soil.png`: row 0 dry, row 1 watered. Frame = mask (+16 when watered), where the mask adds 1, 2, 4, 8 for a
  tilled neighbour to the north, east, south, west.
- `beach-items.png`: one row, frame order in `manifest.json`.
- `fish.png`: one row of 16×16 icons in `FISH` order (`shared/content/fish.ts`), facing right.
- `bugs.png`: one row per bug in `BUGS` order (`shared/content/bugs.ts`): four frames of fluttering, then the icon.
- `fishing.png`: one row: the rod, the bobber, the bobber dipped under.
- `shipping-crate.png`: 32×32 frames, closed then open.
- `seed-stand.png`: one 32×32 frame, the counter on the bottom of the frame.
- `sand-grass.png`, `sand-water.png`: same layout as the source blocks in the pack's `TilesetFloor.png` (from y 112)
  and `TilesetWater.png` (top-left block), so their autotile rules carry over.
- `beach-terrain.png`: `sand-grass.png` stacked on `sand-water.png`, so the map's one Tiled terrain set ("Beach": grass, sand,
  sea) covers both.
- `emotes.png`: 14×13 frames (the pack's bubble size), in `EMOTES` order from `shared/content/emotes.ts`.
- `ui-icons.png`, `map-markers.png`: one row of 16×16 frames, names in `manifest.json`.
- `materials.png`: one row of 16×16 icons, named by item id in `manifest.json` (driftwood, branch); also what lies on the ground.
- `lighthouse.png`: 48×96 frames, dark, scaffold, ready, lit; it stands on the bottom of the frame.
- `village-board.png`: 32×32 frames; frame n has n notes pinned on.
- `brambles.png`: two 16×16 tiles, a tileset in the village map (the `Brambles` layer).
- `reward-furniture.png`: 32×32 frames in `REWARD_FRAMES` order, each picture at its rectangle (the render checks every pixel is inside it).
- `porch.png`: 64×48, cut out by `PORCH_FRAMES`: the decking along the top (64×16), the bench (32×32) and the lantern dark and lit (16×32 each) below.
- `golden-crops.png`: one row of 16×16 icons in `crops.ts` order.
