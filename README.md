# Summer Estimate

A responsive estimating app based on the original SS-Excel summer-services calculator.

## Current release

This version includes:

- Desktop and phone layouts from one codebase
- Vertical, touch-friendly mobile workflow
- Original plug-and-play estimate calculations
- Supabase email/password sign-in
- Shared cloud estimates across computers and phones
- Local draft protection when offline
- Local-estimate import into the cloud
- Shared default crew and service rates
- Search, reopen, duplicate, delete and print
- Installable Progressive Web App support
- GitHub Pages hosting with no build step

## Deployment

Publish the repository from the `main` branch and `/ (root)` folder in GitHub Pages.

## Security

The frontend contains only the Supabase project URL and publishable key. Row Level Security protects all company data. Never commit database passwords, connection strings, secret keys, or service-role keys.

## Files

- `index.html` — app entry page
- `styles.css` — responsive interface
- `js/app.js` — interface and workflow
- `js/calculations.js` — estimate formula engine
- `js/store.js` — local drafts and offline cache
- `js/cloud.js` — Supabase authentication and data access
- `js/config.js` — public Supabase project configuration
- `supabase/schema.sql` — database foundation
- `tests/calculations.test.mjs` — calculation tests
