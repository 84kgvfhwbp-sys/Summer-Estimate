# Shared Cloud Sync — Prepared Next Step

The app currently works fully in local mode. Estimates are saved in the browser on the device being used.

The repository includes `supabase/schema.sql` so the app can later use one shared estimate library on the website, iPhone, iPad, and computer.

## What will change when cloud sync is connected

- Jess and Devlen sign in to the same company workspace.
- Both devices load the same saved estimates.
- A change made on one device is available on the other.
- The calculator formulas remain in the app; the database stores the entered values and calculated total.
- Local draft saving can remain as an offline safety net.

## Information needed to connect it

1. A Supabase project.
2. The project URL.
3. The public anonymous key.
4. User accounts for the people who need access.
5. One company record and membership records connecting those users to the company.

Do not commit a Supabase service-role key or any other private administrative key to GitHub.

## Planned code connection

The current `js/store.js` is the storage boundary. It can be replaced with a cloud-backed store without changing the calculation engine or mobile layout.

The cloud store will implement the same basic actions:

- list estimates
- save an estimate
- update an estimate
- delete an estimate
- load/save the current local draft

This is intentionally separated so the visual app does not need to be rebuilt when syncing is added.
