# Canopy · Oak playground

An Oak growth playground with a Blockly editor, live Canvas 2D preview, and an editable sun position.

## Run locally

With Node.js 22.12 or newer, run:

```powershell
npm install
npm run dev
```

Open the local URL printed by Vite. On Windows, use `npm.cmd` in place of `npm` if PowerShell blocks `npm.ps1`.

## Try it

- Click **25** in the split block, type **60**, and press Enter. The preview regrows at the same generation with the edited angle.
- Drag the sun. You can also focus it and use the arrow keys. **Bend toward light** steers new segments toward it, so moving the sun affects future growth.
- Scrub **Generation** to pause and revisit any recorded frame. Play or Step resumes that history. Moving the sun during a past frame replaces the later frames with a new path as the plant grows.
- Combine conditions from **Logic** with actions from **Growth**. For example, nest **grow a flower** inside **if height ≥ 330 px**, or **become a leaf** inside **if this bud is in shade**. Put these checks before the split so they can act on the original bud.
- **When branch age ≥** controls how many generations a segment lives before the **Looks** blocks change its thickness and color.
- **Step** pauses growth and advances once. **Reset** returns to the seed and keeps your rules and current sun position. Growth stops after at most 35 generations. **Replay** starts a new run with the current sun.

Run `npm run build` to type-check the project and produce the static site in `dist/`.
