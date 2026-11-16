# Canopy · Oak playground

An Oak growth prototype with a Blockly editor and live Canvas 2D preview.

## Run locally

With Node.js 22.12 or newer, run:

```powershell
npm install
npm run dev
```

Open the local URL printed by Vite. On Windows, use `npm.cmd` in place of `npm` if PowerShell blocks `npm.ps1`.

## Try it

- Click **25** in the split block, type **60**, and press Enter. The preview regrows at the same generation with the edited angle.
- **Step** pauses growth and advances once. **Reset** returns to the seed and pauses while keeping your rules.
- Use **Speed** to set generations per second. Growth stops after 35 generations with the starter rules. **Replay** starts again from the seed.

Run `npm run build` to type-check the project and produce the static site in `dist/`.
