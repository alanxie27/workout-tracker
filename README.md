# Workout Tracker

A progressive web application for tracking Upper/Lower body split workouts. Built with vanilla HTML, CSS, and JavaScript with local storage persistence. Dark, minimal UI — flat ink ground, hairline-bordered cards, a single brass accent, and monospace numerals for all workout data.

## Features

### Core Functionality
- **Upper/Lower Split** - Four workouts (Upper A, Lower A, Upper B, Lower B) on either a 4-day or 2-day weekly schedule
- **Exercise Management** - Add, edit, delete, and reorder exercises
- **Bottom-Sheet Editor** - Edit and quick-log (⚡) share one sheet that slides over the list; the page never scroll-jumps
- **Per-Exercise Checkboxes** - Check off exercises as you go; the topmost unchecked one is labeled "Up next"
- **Collapsible Cards** - Chevron collapses a card to its header row; state persists
- **Workout Completion** - Mark workouts complete and auto-advance to the next one
- **Exercise Pairing ("synced")** - Same-named exercises in Upper A/B (or Lower A/B) sync their values on save and show a synced chip
- **Alternative Exercises ("or" groups)** - Link same-day backups (e.g. two leg-curl machines) in the edit sheet; they render as one bordered group with an OR divider and check off together
- **Reps Note** - Reps tile shows your max; optionally log "reps this time" when you fall short and it shows faded underneath (auto-clears when you update your max)

### Weekly Splits
- **4-day** - All four workouts each week; completing one also completes everything before it in the rotation
- **2-day** - One upper + one lower per week; finishing the pair counts the week and flips to the other A/B pair (completion-based, not calendar-based); off-cycle tabs dim but stay tappable
- Toggle lives in the history sheet; every past week's streak is judged by the split that was in effect *that* week (`splitHistory` log), so switching modes never rewrites history

### Tracking & History
- **Workout History** - Calendar view of all completed workouts (📅 button)
- **Streak Counter** - Consecutive complete weeks, split-aware; also shown as a chip in the header
- **Weekly Progress** - Header kicker shows "Week of Jul 6 · 2 of 4 done" (or "of 2" on the 2-day split)
- **Monthly Stats** - Workouts completed in the current month

### Data Management
- **Local Storage Persistence** - All data saved automatically in the browser
- **Export/Import** - Backup and restore everything (exercises, completion, history, split settings) as JSON; buttons live in the history sheet
- **Backward Compatibility** - Imports old-format backups (workout data only) as well as full ones

### User Experience
- **Dark Mode Default** - Light theme available via the header toggle (remembers preference)
- **Mobile-First** - Designed for phones; installable on the iOS home screen
- **Color Syntax** - Colored text in any field with `*red*text*red*`, `*blue*`, `*yellow*`, `*orange*` — tones adapt per theme for legibility
- **Clean Cards** - Weight/Reps/Sets/Rest as a monospace stat grid; empty or "N/A" fields are hidden automatically

### Exercise Details
Each exercise tracks: name, tips (with color syntax), target muscle, machine position, starting side, sets, target reps, rest, current weight/reps, "reps this time" note, weight progression, go-to-failure flag (with DROP SET highlight), done/collapsed state, and alternative-group link.

## Technology Stack

- **HTML5 / CSS3 / Vanilla JavaScript** - No frameworks, no build step
- **CSS custom properties** - One token set for dark, one for light; inline SVG line icons
- **Local Storage API** - Client-side persistence
- **Progressive Web App** - Installable on iOS/Android home screen

## Installation

### Desktop
1. Open `index.html` in a web browser, or serve locally:
   ```bash
   python3 -m http.server 8000
   ```

### Mobile (iOS)
1. Open the app in Safari (e.g. via GitHub Pages or your computer's local IP on the same Wi-Fi)
2. Tap Share → "Add to Home Screen"

Note: localStorage is per-device and per-site — use Export/Import to move data between devices.

## Usage

### Adding & Editing
1. Gold `+` button → enter a name → Add
2. Pencil icon opens the edit sheet for all fields; ⚡ opens the same sheet with the cursor in Weight for quick logging
3. Up/down arrows reorder; trash deletes (with confirm)

### Alternatives
In the edit sheet, set **"Alternative to"** to another exercise in the same day. The two (or more) render as one group separated by "or" — checking either marks the whole group done. Set back to "None" to unlink; deleting a member dissolves a group of one.

### Completing Workouts
1. Check off exercises as you finish them ("Up next" tracks the topmost unchecked)
2. Hit "✓ Complete [Workout]" — checkmarks reset for next session and the app advances
3. On the 2-day split, finishing the week's pair flips to the other A/B pair automatically

### History & Settings
📅 button opens the history sheet: streak and monthly tiles, the workout calendar, the **weekly split toggle**, and **Export/Import**.

## Data Structure

localStorage keys:

| Key | Contents |
|---|---|
| `workoutData` | `{ upperA: [...], lowerA: [...], upperB: [...], lowerB: [...] }` — arrays of exercise objects |
| `completionData` | per-day completion timestamps + `weekStart` (resets each Monday) |
| `workoutHistory` | `[{ date, workout }]` — every completed workout, newest first |
| `appSettings` | `{ split: '4day'\|'2day', currentCycle: 'A'\|'B' }` |
| `splitHistory` | `[{ date, split }]` — log of split changes, used for split-aware streaks |
| `theme` | `'dark'` or `'light'` |

Exercise objects include display fields (name, tips, targetMuscle, machinePosition, startingSide, sets, reps, rest, increaseWeightBy, goToFailure), performance fields (currentWeight, currentReps, actualReps), and state (done, collapsed, altGroup).

Exports bundle `workoutData`, `completionData`, `workoutHistory`, `settings`, and `splitHistory` into one JSON file named `workout-data-YYYY-MM-DD.json`.

## File Structure

```
workout-tracker/
├── index.html          # Structure: header, tabs, sections, bottom sheets
├── style.css           # Design tokens + all styling (dark default, light override)
├── script.js           # State, rendering, and behavior
├── CLAUDE.md           # Development guidelines
└── README.md           # This file
```

## Development Notes

- Educational comments throughout the code
- All colors/spacing flow from CSS custom properties on `body` / `body.dark-mode`
- Cards re-render from data on every change (single template in `createExerciseCard`); scroll position is preserved
- Hard refresh (`Cmd+Shift+R`) after CSS changes — browser caching is common

## License

Personal project - free to use and modify.
