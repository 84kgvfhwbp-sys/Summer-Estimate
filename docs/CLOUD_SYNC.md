# Summer Estimate Cloud Sync

This release connects the responsive GitHub Pages app to Supabase.

## Connected project

- Project URL: `https://jjijzazcntunmvqpvvfz.supabase.co`
- Frontend key type: Supabase publishable key
- Shared workspace: `R2R Property Care`

The publishable key in `js/config.js` is intended for browser apps. Database access is controlled by Supabase Auth and Row Level Security. Never add a secret key, service-role key, database password, or connection string to this repository.

## What syncs

- Saved estimates
- Estimate totals and all calculator inputs
- Estimate names, numbers, addresses, seasons and prepared-by values
- Shared default rates
- Estimate history in the database

The current working draft remains stored locally so work is protected if the connection drops.

## First account

Create the first user in Supabase Authentication, then sign in through the app. The first authenticated user automatically creates the R2R Property Care workspace and becomes its owner.

## Existing local estimates

After signing in, open Settings and choose **Import Local Estimates to Cloud**. The app uploads the browser-saved estimates and then clears the old local saved-estimate list. The current draft remains local.

## Future member access

Additional users must be created or invited through Supabase Authentication and then added to `public.company_members`. A company-member management screen can be added in a later release.
