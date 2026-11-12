# CLAUDE.md — workout tracker

Vanilla JS PWA, no build step. Files: `index.html`, `script.js`, `sync.js`, `lifts.js` (pure logic: weight parsing, snapshots, imports), `style.css`. Tests: `node tests/lifts.test.js`.

## Deploy

- **Live URL:** https://workout.alanxie.dev (`CNAME`).
- **How it deploys:** GitHub Pages straight from `main`. Push to `main` and it's live in a minute or two. There is no build, so what's in the repo is what ships. Run `node tests/lifts.test.js` first. Phones cache the page, so reload once after a deploy.
- **Life OS hub:** os.alanxie.dev loads `https://workout.alanxie.dev/?embed=1` in an iframe. `sync.js` stores the flag in `sessionStorage` (the "embed mode" block) so it survives in-frame navigation.
- **Data:** state syncs five localStorage keys to the Supabase `state` table. A server CHECK constraint limits the allowed keys, so a new synced key needs a SQL migration in `supabase/`.
