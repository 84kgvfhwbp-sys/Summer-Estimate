# Summer Estimate — Mobile-First GitHub App

A clean, installable web app that turns the original Summer Estimate spreadsheet formulas into a phone-friendly quote builder.

## What changed in this version

- No horizontal scrolling
- One vertical service screen at a time
- Large touch-friendly toggles and inputs
- Collapsed quote sections with live totals
- Fixed total bar while editing
- Home screen with recent estimates
- Saved-estimate search, open, duplicate, and delete
- Desktop layout and mobile layout from the same code
- Local draft recovery
- Installable PWA and offline app shell
- Cloud-sync database structure prepared for a later connection

## Quick visual preview

- Open `showcase.html` to see a completed example immediately.
- Open `demo.html` for a standalone version that can be tested without a local server.
- `preview.png` shows the actual rendered mobile screens.

## Run it locally

Because the app uses JavaScript modules, open it through a local web server rather than double-clicking `index.html`.

From this folder:

```bash
python3 -m http.server 8080
```

Then open:

```text
http://localhost:8080
```

## Publish on GitHub Pages

1. Create or open the GitHub repository.
2. Upload everything in this folder to the repository root.
3. Commit the files to the `main` branch.
4. In the repository settings, enable GitHub Pages from the `main` branch and root folder.
5. Open the Pages address GitHub provides.

No build command or package installation is required.

## Install it like an app

After it is published through HTTPS, open it in the phone browser and use the browser’s **Add to Home Screen** option. It will open in a standalone app window.

## Saving today

Saved estimates and the current draft use browser storage on the current device.

## Shared website + app saving later

See:

- `docs/CLOUD_SYNC.md`
- `supabase/schema.sql`

The calculation engine is in `js/calculations.js`. The local saving boundary is in `js/store.js`, so cloud syncing can be connected without redesigning the app.

## Main files

- `index.html` — app entry point
- `styles.css` — mobile and desktop layouts
- `js/app.js` — screens and interactions
- `js/calculations.js` — spreadsheet formula engine
- `js/store.js` — saved estimates and draft storage
- `manifest.webmanifest` — installable app settings
- `service-worker.js` — offline app shell
