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
| `crate.ts` | The shipping crate, closed and open |
| `seedStand.ts` | The seed stand: a market stall with seed sacks |
| `sand.ts` | Beach sand: recolours of the pack's floor and water autotiles |
| `emotes.ts` | Emote bubbles: the pack's heart, and our wave in the pack's bubble |
| `ui.ts` | HUD icons the pack lacks: music on and off |
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
- `shipping-crate.png`: 32×32 frames, closed then open.
- `sand-grass.png`, `sand-water.png`: same layout as the source blocks in the pack's `TilesetFloor.png` (from y 112)
  and `TilesetWater.png` (top-left block), so their autotile rules carry over.
- `beach-terrain.png`: `sand-grass.png` stacked on `sand-water.png`, so the map's one Tiled terrain set ("Beach": grass, sand,
  sea) covers both.
- `emotes.png`: 14×13 frames (the pack's bubble size), in `EMOTES` order from `shared/content/emotes.ts`.
- `ui-icons.png`, `map-markers.png`: one row of 16×16 frames, names in `manifest.json`.
