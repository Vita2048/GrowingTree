# Canopy · Plant playground

A growth playground with a Blockly editor, live Canvas 2D preview, and a draggable sun.

[Open Canopy on GitHub Pages](https://vita2048.github.io/GrowingTree/)

## Run locally

With Node.js 22.12 or newer, run:

```powershell
npm install
npm run dev
```

Open the local URL printed by Vite. On Windows, use `npm.cmd` in place of `npm` if PowerShell blocks `npm.ps1`.

## Try it

- Choose **Oak**, **Fern**, **Wall-climbing vine**, or **Alien coral** from the **Preset** menu to load its editable rules. For Oak, change the split angle from **25°** to **60°** to see a wider canopy.
- Click **Mutate** to compare six changes to the connected numeric rules. Early growth is previewed up to generation 22 so differences are easier to see. Select a thumbnail to load its rules and its previewed plant.
- Drag the sun. You can also focus it and use the arrow keys. **Bend toward light** steers new segments toward it, so moving the sun affects future growth.
- Scrub **Generation** to pause and revisit any recorded frame. Play or Step resumes that history. Moving the sun during a past frame replaces the later frames with a new path as the plant grows.
- Use the **0–20 m** ruler to read height above the seed. The height, extension, and spacing blocks accept metres to two decimal places. For example, nest **grow a flower** inside **if height ≥ 12.75 m**. Put this check before the split so it can act on the original bud.
- **When branch age ≥** controls how many generations a segment lives before the **Looks** blocks change its thickness and color.
- **Step** pauses growth and advances once. **Reset** returns to the seed and keeps your rules and current sun position. Growth stops after at most 35 generations. **Replay** starts a new run with the current sun. Reset and Replay use fresh chance rolls. Scrubbing or editing the current run keeps its random seed.
- The browser automatically saves your blocks, speed, and current growth timeline, including sun moves and random rolls. Reloading restores the run paused at the same generation. Saves are tied to the browser and site address.
- Download [the flowering tree workspace](examples/flowering-tree.json), then use **Open** beside **Preset** to load it. It opens at generation 35. Drag **Generation** back to zero and press **Play** to watch the saved run grow again.

Run `npm run build` to type-check the project and produce the static site in `dist/`.

The GitHub Pages workflow builds and publishes `dist/` on pushes to `main`.
