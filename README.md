# Your Brain on AI: Interactive 3D Brain

An interactive 3D brain for the HOSA Health Education lesson **"Your Brain on AI."** Students can explore brain regions and switch between **Thinking on your own**, **Active AI use** and **Passive AI use (copy-paste)** to watch the brain light up or dim. Teachers can run a guided tour from a projector, and students can test themselves with a short quiz.

It is a static website with no login, database or API keys. It runs on school Chromebooks, laptops, tablets and phones. If a device can't show 3D, it automatically falls back to a simple 2D diagram.

---

## Contents

1. [Run it on your computer](#1-run-it-on-your-computer)
2. [Edit the lesson content](#2-edit-the-lesson-content)
3. [Put it online with Vercel](#3-put-it-online-with-vercel)
4. [Swapping in a real brain model](#4-swapping-in-a-real-brain-model)
5. [Using it in class](#5-using-it-in-class)
6. [Troubleshooting](#6-troubleshooting)
7. [For developers](#7-for-developers)

---

## 1. Run it on your computer

You only need to do this if you want to preview changes before putting them online.

1. **Install Node.js** (version 20 or newer) from <https://nodejs.org>. Pick the "LTS" version and click through the installer.
2. **Open a terminal in this folder.**
   - Mac: open the **Terminal** app, type `cd ` (with a space), drag this folder onto the window, and press Enter.
   - Windows: open the folder, click the address bar, type `cmd`, and press Enter.
3. **Install the project** (only needed the first time):
   ```
   npm install
   ```
4. **Start it:**
   ```
   npm run dev
   ```
5. Open **<http://localhost:3000>** in your browser.

Leave the terminal open while you work. When you save a change, the page updates by itself. To stop, click the terminal and press `Ctrl + C`.

---

## 2. Edit the lesson content

**All the words, colors, activity levels, tour order, quiz questions, tips and sources are in one file:**

```
src/data/brainContent.ts
```

Open it in any text editor. VS Code is free and highlights mistakes, but even Notepad or TextEdit works. The top of the file has step-by-step instructions. The short version:

- **Change text:** edit only the words between the double quotes, `"like this"`. Keep the quotes and the comma at the end of the line.
- **Change a color:** use a hex code such as `"#ff7a1a"`. You can pick one at <https://htmlcolorcodes.com>. Also update `colorName` (for example `"electric orange"`), because students see that name next to the color.
- **Change how much a region lights up:** each region's `activity` line has a number from `0` (dim) to `1` (fully lit) for each mode.
- **Add more detail to a region:** add `extraSections`, like this:
  ```ts
  extraSections: [
    { heading: "Did you know?", text: "Your brain uses about 20% of your body's energy." },
  ],
  ```
- **Add a region:** copy a whole region block from `{` to `},`, paste it, and give it a new `id`. The region list, tour, quiz and info panel pick it up automatically. To make it light up on the 3D brain, use one of the built-in shapes as its `id`: `prefrontal-cortex`, `frontal-lobe`, `parietal-lobe`, `temporal-lobe`, `occipital-lobe`, `hippocampus`, `cerebellum` or `brainstem`. For example, add a region with `id: "cerebellum"`.
- **Remove a region:** delete its whole block. Tour steps and quiz questions that point to it are skipped automatically.
- **Change the tour order:** reorder the ids in `tourOrder`.
- **Change the quiz:** edit `quiz.questions`. There are two kinds:
  - `{ type: "identify", regionId: "temporal-lobe" }`: the app lights up the region and asks "Which region is this?"
  - `{ type: "find", regionId: "hippocampus", prompt: "Find the region that…" }`: students click the matching region.

  `questionsPerRound` sets how many questions one round asks. They are picked at random.

**Made a mistake?** The site won't crash. It skips the broken part and prints a warning in the browser console (press F12, then open the "Console" tab). If the page goes blank after an edit, the file usually has a missing quote or comma. Undo your last change and try again.

---

## 3. Put it online with Vercel

Vercel hosts this kind of site for free. No settings to change.

### Option A: through GitHub (recommended, auto-updates)

1. Create a free account at <https://github.com>.
2. Create a **new repository** (the green "New" button). Give it any name and leave it empty.
3. Upload this project. On the new repository page, click **"uploading an existing file"** and drag in everything in this folder **except** the `node_modules` and `.next` folders. Then click **Commit changes**.
4. Create a free account at <https://vercel.com>. Choose **"Continue with GitHub"**.
5. On Vercel, click **Add New… → Project**, find your repository, and click **Import**.
6. Leave every setting as it is and click **Deploy**.
7. After about a minute you get a link like `your-brain-on-ai.vercel.app`. Share it with your class.

From then on, whenever you change a file on GitHub (for example by editing `src/data/brainContent.ts` with the pencil icon), Vercel updates the site automatically within a minute or two.

### Option B: from your computer

1. Do steps 1–3 of [Run it on your computer](#1-run-it-on-your-computer).
2. In the terminal, run:
   ```
   npx vercel
   ```
3. Log in when asked and press Enter to accept each default. To publish to the main link, run `npx vercel --prod`.

---

## 4. Swapping in a real brain model

The site comes with a built-in brain made by code. You can replace it with a real 3D model that has a separate part for each region.

1. **Get a segmented brain model in `.glb` format**, with each region as its own named mesh. Free anatomy models are available on sites like Sketchfab or BodyParts3D. You can convert other formats to `.glb` with the free program Blender: **File → Export → glTF 2.0**, then choose the `.glb` format.
2. **Name the parts after the region ids.** In Blender, double-click each part's name in the Outliner panel. Names are matched loosely, so `Temporal_Lobe`, `temporal lobe` and `temporal-lobe` all work. If you'd rather not rename the parts, list the model's own names in the region's `meshNames` in `brainContent.ts`:
   ```ts
   meshNames: ["Hippocampus_L", "Hippocampus_R"],
   ```
3. **Put the file at** `public/models/brain.glb`.
4. **Turn it on** in `src/data/brainContent.ts`:
   ```ts
   model: {
     file: "/models/brain.glb",
     rotationDegrees: [0, 0, 0],
   },
   ```
5. If the brain appears sideways or upside down, change `rotationDegrees`, for example `[-90, 0, 0]` or `[0, 180, 0]`. The front of the brain should face the default camera's left, with the top facing up.

What happens automatically:
- The model is centered and scaled to fit the scene.
- Parts that match a region light up and can be clicked. Unmatched parts are shown as neutral blue tissue.
- Regions with no matching part show a warning in the console but still appear in the list, tour and info panel.
- If the file is missing or broken, the site falls back to the built-in brain.

Keep the file under about 5 MB so it loads quickly on Chromebooks. In Blender, the **Decimate** modifier can reduce detail.

The code that loads the model is in `src/components/brain/GlbBrain.tsx`.

---

## 5. Using it in class

| Action | How |
| --- | --- |
| Rotate the brain | Drag with the mouse or one finger |
| Zoom | Scroll, or pinch on a touch screen |
| Learn about a region | Click or tap it on the brain, or pick it from the **Brain regions** list |
| Reset the camera | **Reset view** button or the **Esc** key |
| Compare thinking modes | Toggle at the top: *Thinking on your own / Active AI use / Passive AI use* |
| Guided tour (projector) | **Start guided tour**, then **Next / Back**, the **← →** arrow keys, or a presentation clicker (Page Up / Page Down) |
| Quiz | **Test yourself** |
| Projector mode | **Fullscreen** button |
| Slow computer | **2D view** button (top bar, or **Menu** on small screens) |

**Coloring the paper diagram:** each tour step shows a thick color bar and a "Color: …" label with the region's color name, so students can match it on their worksheet.

---

## 6. Troubleshooting

- **The 3D brain is slow or choppy.** Click **2D view**. The site also lowers its own quality automatically on slow devices.
- **"Loading the 3D brain…" never goes away.** The device may have WebGL turned off. Try Chrome, or use **2D view**.
- **`npm` is not recognized.** Node.js isn't installed. See [step 1](#1-run-it-on-your-computer), then close and reopen the terminal.
- **The page is blank after editing `brainContent.ts`.** There is probably a missing quote, comma or bracket. Undo your last edit. When running `npm run dev`, the terminal shows the line with the problem.

---

## 7. For developers

**Stack:** Next.js (App Router) · TypeScript · Tailwind CSS 4 · React Three Fiber, drei, three.js · Framer Motion · Zustand.

```
npm run dev     # local development
npm run build   # production build (static)
npm run lint    # ESLint
```

```
src/
  data/brainContent.ts        ← ALL lesson content (the only file content editors touch)
  lib/
    content.ts                validation + helpers (tour ids, quiz builder)
    store.ts                  app state (view, mode, focus, quiz) + highlight rules
    layout.ts                 shared panel sizes so the camera centers the brain
  components/
    App.tsx                   page shell + keyboard shortcuts
    brain/                    3D (lazy-loaded)
      BrainCanvas.tsx         <Canvas>, model switch (built-in vs GLB), backdrop glow
      proceduralBrain.ts      builds the stylized brain (runs in a Web Worker)
      BrainScene.tsx          maps brainContent regions ⇄ model parts
      RegionMesh.tsx          one region: holographic shader, highlight + activity
      NetworkLines.tsx        animated connection lines + pulses
      CameraRig.tsx           controls, fly-to-region, auto-rotate, panel-aware framing
      Picker.tsx              hover/click picking on low-poly proxies
      GlbBrain.tsx            optional real model loader
    ui/                       panels, toggle, tour, quiz, modals, 2D fallback
```

**Performance notes**
- The 3D chunk is lazy-loaded after the page appears. The procedural geometry (~100k triangles) is built in a Web Worker.
- Device pixel ratio is capped at 1.5. drei's `PerformanceMonitor` drops it to 1 and turns off backdrop blur if FPS falls.
- Hover picking raycasts against ~10k-triangle proxies at most 30 times per second.
- The glow comes from additive fresnel shading rather than a post-processing bloom pass, which is much cheaper on integrated GPUs.
- `prefers-reduced-motion` turns off auto-rotate, camera flights, shimmer and UI animations.

**Accessibility:** every control is keyboard-reachable with visible focus rings. The region list is the non-3D way to select regions. Colors always appear with a text label, and the mode toggle is an ARIA radiogroup. The tour and quiz announce changes to screen readers.
