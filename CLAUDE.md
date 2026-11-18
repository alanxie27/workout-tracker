# CLAUDE.md — workout tracker

Vanilla JS PWA, no build step. Files: `index.html`, `script.js`, `sync.js`, `lifts.js` (pure logic: weight parsing, snapshots, imports), `style.css`. Tests: `node tests/lifts.test.js`.

## Deploy

- **Live URL:** https://workout.alanxie.dev (`CNAME`).
- **How it deploys:** GitHub Pages straight from `main`. Push to `main` and it's live in a minute or two. There is no build, so what's in the repo is what ships. Run `node tests/lifts.test.js` first. Phones cache the page, so reload once after a deploy.
- **Life OS hub:** os.alanxie.dev loads `https://workout.alanxie.dev/?embed=1` in an iframe. `sync.js` stores the flag in `sessionStorage` (the "embed mode" block) so it survives in-frame navigation.
- **Data:** state syncs five localStorage keys to the Supabase `state` table. A server CHECK constraint limits the allowed keys, so a new synced key needs a SQL migration in `supabase/`.
- **Views (redesign):** a Train · Progress · History switcher under the header (`showView()` in `script.js`, remembered per tab in `sessionStorage`). The gear opens Settings (split, export, import past weeks; the old history sheet). The + button shows on Train only. At 960px and up the page widens and each view goes side by side. Train there is a day rail (tabs stacked, "N of 4 done this week"), one column of cards, and a sticky "This session" panel (`renderTrainSide()`: slots checked off with alternatives counted once, how the day's lifts are trending, Complete and Add exercise); the in-card Complete button and the + button hide.
- **Progress (Life OS phase 8, redesigned):** counts (going up, holding, slipping), group filters, search, then lifts in groups: Time to add weight (`bump`: same weight 3+ sessions and every set at the target), Going up, Holding, Slipping. Tap a lift for its chart (3M/6M/1Y/All), Now/Best/Since tiles, a reps note and sessions. `Lifts.progress(history)` in `lifts.js` builds it (one point per lift per day, heaviest wins, rows without a numeric weight left out; adds `group`, `status`, `held`, `repsShort`, `bump`); `renderProgress()` draws it. Each exercise card has a "Last" line from the same data that opens the lift. The hub's Me card reads the same history with `latestLifts` in life-os `src/lib/lifts.ts`; keep the two readings the same.
- **History:** calendar with a dot per finished workout (blue upper, green lower); tap a day for that session with each lift's change from its previous session. Imported weeks have no date of their own, so they show in Progress but not on the calendar.
