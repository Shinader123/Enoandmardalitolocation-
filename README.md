# Enoandmardalitolocation

Mobile-friendly rental site starter for Netlify + Supabase. The official business name, address, and four phone numbers are intentionally fixed in the frontend; they are not editable from the admin panel.

## Included
- Customer email/password sign-up and login via Supabase Auth.
- Expanded starter fleet across SUVs, pickups, sedans, vans, and minibuses. Starter prices are examples and can be changed by an authorized admin. The four originally specified vehicles and prices are retained.
- Customer reservation requests; admin can approve/reject them.
- Admin-only car add/edit/availability controls (role enforced through Supabase RLS).
- Manual MonCash/Natcash transfer reference submission for admin review.
- PayPal JavaScript SDK buttons are wired to Netlify serverless functions for creating/capturing PayPal orders, including a card funding option where the merchant account is eligible. This has not been tested against live credentials.
- SQL schema, RLS policies, seed data, and an exclusion constraint preventing overlapping *approved* reservations for the same vehicle.

## 1. Supabase setup
1. Create/open the Supabase project.
2. Open **SQL Editor**, paste and run `supabase/schema.sql`.
3. In **Authentication > URL Configuration**, set the site URL and allowed redirect URLs to your Netlify site.
4. Create a customer account through the site.
5. In **Authentication > Users**, copy that account's UUID. In SQL Editor run:
   `update public.profiles set role='admin' where id='YOUR-REAL-USER-UUID';`
   Replace the placeholder with the actual UUID. Never make admin role self-selectable.
6. Under **Project Settings > API**, copy Project URL and publishable/anon key. Put these into Netlify environment variables as `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

## 2. Netlify setup
- Connect this folder/repository to Netlify.
- Build command: `npm run build`
- Publish directory: `dist`
- Functions directory: `netlify/functions`
- Set `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET` in Netlify environment variables. Never put `SUPABASE_SERVICE_ROLE_KEY` or `PAYPAL_CLIENT_SECRET` in any `VITE_` variable or public file.
- For PayPal sandbox testing, set `PAYPAL_API_BASE=https://api-m.sandbox.paypal.com`; for live mode use `https://api-m.paypal.com`.

## 3. Payments: important before launch
- MonCash/Natcash: the current UI records a transfer reference as pending for manual admin verification. Do not collect PINs or passwords. Uploading proof-of-payment is not included yet.
- PayPal JavaScript SDK buttons and server functions are included, but checkout is **not live-ready until configured and tested** with your own sandbox credentials. Card processing depends on provider/account eligibility; do not assume a Haitian business account can use every provider. Confirm PayPal merchant onboarding and card-payment availability for your actual business account.
- Payment totals are computed server-side from approved reservation and vehicle price. Confirm rental-day counting and terms with the business before launch.

## 4. Security / limitations
- The business name `Enoandmardalitolocation`, address `Cayes, Torbeck, anvan koub Saint-Véronique`, and phone numbers `35236733`, `34803338`, `41939408`, `41306823` are fixed in code and are not editable in the admin UI.
- The admin panel is shown only to a profile with `role='admin'`; database access is enforced by RLS, not just by hiding UI.
- The ZIP contains no real keys or credentials. Configure your own environment variables securely.
- Run the SQL in the included schema before deploying. Until configured, the website shows the public design and demo car list, but sign-up, real reservations, and admin features cannot work.
- Build test: `npm install` then `npm run build`.

## Managing the fleet
- The public homepage shows each active vehicle and its daily USD price directly beneath the vehicle details.
- An authorized admin can use **Machin ak pri** to add vehicles, change vehicle names, prices, descriptions and image URLs, or mark vehicles unavailable. These updates save to Supabase.
- The additional vehicle models and prices are starter examples, not a claim that every model is available. Confirm actual fleet and prices before publishing.
- If the database already exists, rerun the updated `supabase/schema.sql` in Supabase SQL Editor to add any missing starter vehicles; the seed uses name checks to avoid duplicating existing vehicle names.
