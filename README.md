# Fuel Log

A personal food, training and body tracker that runs on your phone as a home-screen app (PWA).
It's a single HTML file with no build step and no framework, and it doesn't need any AI or Claude account.

- **Works offline.** Everything saves on the phone first.
- **Optional cloud sync** through Supabase, so each person signs in and their own log syncs across devices.
- **Optional phone reminders** through Web Push: today's workout, logging meals, weekly weigh-in and a weekly check-in.
- **Family-friendly.** Share one link and each person gets their own private log.

Current version: **14** (19 Oct 2026). To check which version a phone is running, open **Me → Dev**.

---

## What's in the app

| Tab | What it's for |
|---|---|
| **Today** | Kcal, protein and fibre left for today, today's planned workout and quick links |
| **Food** | Log meals by kcal, protein and fibre. No food database or presets, so you enter real portions |
| **Train** | Weights (sets × reps × kg), runs (distance, time, auto pace and calories), exercise dropdown fed from your plan, PR alerts |
| **Progress** | **Overview** (plain-language summary), **Strength** (records, sets per muscle, plateau alerts), **Running**, **Body** (weight and measurements). It also has the Week check-in and the Month report |
| **Me** | **Plan** (weekly templates such as "Monday: Pull"), **Targets** (goal presets), **Alerts** (notifications), **Data** (sign-in, export), **Dev** (connection, storage, version) |

### How the numbers are worked out

- **BMR:** Mifflin–St Jeor, from weight, height, age and sex.
- **Daily burn (TDEE):** BMR × activity. Activity is your job level (1.2 / 1.35 / 1.5) plus a bonus for workouts per week (+0 to +0.4). Alternatively, you can count each logged workout separately.
- **Goal presets:** a kcal change per kg per week (1 kg ≈ 7,700 kcal) and protein in g per kg. The target never goes below BMR, or below 1,500 kcal for men and 1,200 kcal for women.
- **Run calories:** ACSM running equation from pace and body weight.
- **Lift calories:** about 3.5 MET for roughly 2.5 minutes per set.
- **Strength progress:** estimated 1-rep max (Epley, capped at 12 reps). A PR is a new best e1RM, or more total reps for bodyweight moves. You get a plateau alert when a lift hasn't improved in several sessions.
- **Weight trend:** a smoothed average, so daily water swings don't mislead you. The weekly check-in compares what you ate with how your weight moved, then suggests a real-world calorie target.
- **BMI:** Malaysian cut-offs.

---

## Files

| File | Upload to Netlify? | Purpose |
|---|---|---|
| `index.html` | ✅ | The whole app |
| `config.js` | ✅ | Your Supabase URL, publishable key and VAPID public key (all safe to be public) |
| `sw.js` | ✅ | Offline copy, update handling and notifications |
| `manifest.webmanifest` | ✅ | Home-screen name, colours and icons |
| `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `apple-touch-icon.png` | ✅ | Icons |
| `supabase-setup.sql` | ❌ | One-time Supabase table for sync |
| `supabase-notifications.sql` | ❌ **keep private** | One-time table plus a 15-minute schedule for reminders. It contains your cron secret |
| `supabase/functions/fuel-push/index.ts` | ❌ | Supabase Edge Function that sends reminders |
| `README.md` | ❌ | This file |

> `fuel-log-ready.zip` contains exactly the ✅ files with your settings filled in. That's the one to upload.

---

## Setup

### 1. Phone only (no account)

1. Leave `config.js` empty.
2. Upload the ✅ files to Netlify.
3. Open the link on your phone and add it to the home screen.

Data stays in that phone's browser storage. Use **Me → Data → Export your log** now and then as a backup.

### 2. Add cloud sync (Supabase, free)

1. Create a project at [supabase.com](https://supabase.com). Southeast Asia (Singapore) is the nearest region; use the Free plan.
2. In **SQL Editor → New query**, paste `supabase-setup.sql` and click **Run**.
3. Set up email sign-in:
   - In **Authentication → URL Configuration → Site URL**, enter your Netlify address.
   - Optionally, under **Authentication → Sign In / Providers → Email**, turn off **Confirm email** so family can sign in straight away.
4. Copy the **Project URL** and the **publishable** key (`sb_publishable_…`) from **Project Settings → API Keys**, then paste them into `config.js`.
   - ⚠️ Never use the **secret** or **service_role** key in the app.
5. Re-upload to Netlify, then on each phone use **Me → Data → Create account**.

Anything already logged on that phone is uploaded to the new account. Each change saves locally first and syncs when online, and edits from two devices are merged item by item.

### 3. Add reminders (optional)

Reminders need sync from step 2. On iPhone they also need iOS 16.4 or later, and they only work from the **home-screen app**, not from a Safari tab.

1. **Keys.** Generate a VAPID key pair (for example with `npx web-push generate-vapid-keys`) and a random cron secret.
   - The **public** key goes in `config.js` as `vapidPublicKey`.
   - The private key and the cron secret never go in the app.
2. **Function.** In **Edge Functions**, create a function named **`fuel-push`** and paste in `supabase/functions/fuel-push/index.ts`.
   - Turn **off** "Verify JWT" for this function. The function checks the cron secret and the user's sign-in itself.
3. **Secrets.** Under **Edge Functions → Secrets**, add:
   - `VAPID_PUBLIC_KEY`
   - `VAPID_PRIVATE_KEY`
   - `VAPID_SUBJECT` (for example `mailto:you@example.com`)
   - `CRON_SECRET`
4. **Schedule.** In `supabase-notifications.sql`, put your project URL and cron secret in the `net.http_post` call, then run it in the SQL Editor. This creates the `push_subscriptions` table and a job that checks every 15 minutes.
5. **Phone.** In the app, open **Me → Alerts**, turn notifications on, choose times and days, and tap **Send a test**.

| Reminder | Default | Sent only when… |
|---|---|---|
| Workout of the day | 07:00 | Today has a plan template that isn't done yet |
| Log your meals | 21:00 | Nothing has been logged today |
| Weigh-in | Sunday 08:00 | There's no weight in the last 6 days |
| Weekly check-in | Monday 08:30 | Last week has some workouts or food logged |

---

## Updating the app

1. In Netlify, open the **existing project** and drop the new zip into its own deploy box. On the Deploys tab, it's the "Need to update your project? Drag and drop…" area.
   - Don't use the Netlify Drop page, because that creates a brand-new project with a new link.
2. Reopen the app. It checks for a new version every time it opens and reloads itself.
3. Check **Me → Dev**: the app version and "Offline copy" should match. If they don't, tap **Force reload latest app**.

To remove the "Powered by Netlify" badge, go to **Project configuration → General → Powered by Netlify badge**, turn it off and save.

---

## Sharing with family

- Send the same link. Each person taps **Create account** with their own email and only ever sees their own log, because row-level security limits each row to `auth.uid()`.
- As the Supabase project owner, you *can* see everyone's rows in the Table Editor, so let them know.
- Signing out removes the log from that phone but keeps it in the account. Signing back in restores it.
- There's no "forgot password" in the app. Reset passwords in **Supabase → Authentication → Users**.

---

## Good to know

- **Free Supabase projects pause** after about a week with no activity. The app keeps working on the phone. Click **Restore project** on supabase.com and it syncs again without losing data.
- **Space:** the free plan has 500 MB, and a year of heavy logging is roughly 0.4 MB per person.
- **iPhone tips:**
  - Inputs are 16 px so Safari doesn't zoom in.
  - Times and paces use separate boxes because the number keypad has no colon.
- **Backups:** **Me → Data** exports a readable text report and a CSV.

---

## For developers

- **Storage:** `localStorage` key `fuel-log-v1`. The state is shaped like `{ days, body, profile, plan: { templates, week, muscles }, meta }`. `meta` holds per-item timestamps and tombstones used for merging.
- **Sync:** plain `fetch` to Supabase Auth (`/auth/v1/…`) and PostgREST (`/rest/v1/fuel_log`, upsert with `Prefer: resolution=merge-duplicates`). It doesn't use supabase-js.
- **Service worker:** network-first for `index.html` and `config.js`, and cache-first for icons and fonts. The page reloads automatically when a new worker takes over. Bump `CACHE` in `sw.js` and `APP_VERSION` in `index.html` together.
- **Deep links:** `#food`, `#train`, `#body`, `#checkin` and `#month`, which are used by notification taps.
- **Testing:** the reminder rules in `remindersDue()` don't do any I/O, so they can run in Node with `--experimental-strip-types`.
