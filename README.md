# Summer Estimate

A GitHub-ready, installable web app based on the approved spreadsheet-style Summer Estimate layout.

## What it does

- Calculates each service automatically as numbers are entered
- Shows live section totals and the total contract value
- Saves estimates in the browser on the current device
- Searches, reopens, duplicates, prints, and deletes saved estimates
- Works on desktop, tablet, and phone
- Can be installed as an app from a supported browser
- Continues to open offline after the first successful visit

## Put it on GitHub Pages

1. Create a new GitHub repository.
2. Upload everything in this folder to the repository root.
3. Commit the files to the `main` branch.
4. Enable GitHub Pages for the `main` branch and root folder.
5. Open the GitHub Pages address shown by GitHub.

No build command or package installation is required. The app is a static website.

## Important saving note

Version 1 stores saved estimates in that browser on that device. Publishing the app to GitHub does not automatically create a shared cloud database. Shared saving for Jess and Devlen can be added later without changing the calculator layout.

## Files

- `index.html` — complete calculator and user interface
- `manifest.webmanifest` — installable-app settings
- `service-worker.js` — offline app support
- `assets/` — logo and app icons
