# Phase 2 plan: Workout history + import + deploy docs + mobile pass

Risk: **High** (saved workout data). Review: code-reviewer-deep after tasks 1-2.
Lead: Opus. Task 1 and 2 core logic: opus-worker. Tasks 3-4: sonnet-worker.

## What the code does today (read from workout-tracker, script.js / sync.js)

- Finish handler (`.btn-complete-workout`, script.js ~1012) calls `addToHistory(workoutDay)`, which only unshifts `{date, workout}`. Then it sets `exercise.done = false` on that day. Weights/reps are never snapshotted.
- `currentWeight`, `currentReps`, `actualReps` are free-text strings.
- **currentReps** = the max/target reps you're working at ("Reps" tile). **actualReps** = optional "Reps this time, only if below max" note (e.g. `7-6-6`), shown faded as "got ...".
- actualReps is cleared only when you edit currentReps without touching the note (script.js ~939). It is **not** cleared on workout completion, so it can go stale across weeks.
- Synced exercises (`syncGroup`) copy weight/reps/note between paired days (A/B), so the same lift appears twice in an export.
- `workoutHistory` is read by streak/week/month/calendar code (~1114-1250) and is a PRECIOUS blob in sync.js. Supabase `state.key` has a CHECK constraint on the five known keys, so adding a new sync key means a SQL migration. This plan avoids that.
- Existing Import replaces workoutData/completionData/workoutHistory wholesale. It cannot be used for weekly imports.

## Answer to the open question: reps

What you actually did = `actualReps` if non-empty, else `currentReps`. Caveat: a stale actualReps note will be read as this session's result. Decision needed (below).

## Task 1: save weights and reps per finished workout (opus-worker)

- New shared helper `parseWeight(str)` (rules below), used by live saves and import so charts are consistent.
- `addToHistory` snapshots the finished day's exercises into the entry, backward compatible:
  `{ date, workout, exercises: [{ name, canon, weightRaw, weight, repsRaw, repsDone, done }] }`
  - `repsDone` = actualReps if non-empty else currentReps. Raw strings are always kept, parsed number is added alongside, nothing is lost if parsing fails.
  - Only exercises with `done === true` are snapshotted. For alt groups that means the one you did. If none are marked done, snapshot all of the day's exercises.
  - Snapshot is taken **before** the existing `done = false` reset.
- Old entries without `exercises` keep working. No change to sync keys or SQL.

## Task 2: import past weekly exports (opus-worker)

- New "Import past weeks" control in the history sheet, separate from the existing Import (which stays as is). Accepts multiple `workout-data-YYYY-MM-DD.json` files.
- Date for each file: the filename date (fallback: newest `workoutHistory` date in the file, else ask).
- Per file: read `workoutData.{upperA,upperB,lowerA,lowerB}[]`, one data point per canonical exercise (synced duplicates collapse; if the duplicate values conflict they go to review).
- Stored as entries in `workoutHistory` with `{ date, imported: true, workout: null, exercises: [...] }`. Add one helper `realWorkouts()` (filters `imported`) and use it at the streak / this-week / month / calendar sites so imports never count as sessions.
- Idempotent: key = date + canonical name, so re-importing a file does not duplicate.
- Merge, never replace. Existing history is untouched.

### Weight parsing (decided rules)
- Plain number: as is.
- Plates summed for one side, never doubled, bar and machine ignored: `2x 45 1x 35 per side` = 125. Spacing, lb/lbs and word order ignored.
- Slash = drop set, take first number: `100/90` = 100.
- Anything else (`2x45 + 1x10/25 per side`, `50 or above 42.5`) goes to the review list.

### Name merging
- `Incline Dumbbell Press` and `Dumbbell Incline Bench Press` are one lift (explicit alias map).
- `Other ...` exercises stay separate.

### Review list
- After parsing, one modal lists every unparseable row (file date, exercise, raw text) with an input to fix. Nothing is saved until the list is resolved or the row is skipped. One pass, then save.

## Task 3: Deploy section in each repo's CLAUDE.md (sonnet-worker)

Per repo: live URL, how it deploys, and that the hub loads it with `?embed=1`. Needs each of the six repos attached to the session. Workout repo has no CLAUDE.md yet; create it.

## Task 4: mobile pass at 390 px, all six apps (sonnet-worker)

Built-in browser at 390 px wide, per app: horizontal overflow, tap targets, embed mode inside the hub frame. Fix CSS only. Log anything non-CSS instead of fixing.

## Order and checks

1. Task 1, then test: finish a workout, confirm the entry has `exercises`, streaks unchanged.
2. Task 2 with the 4-5 real exports. Check the review list on the known odd strings, and that streaks/calendar are identical before and after import.
3. code-reviewer-deep on tasks 1-2 diff.
4. Tasks 3 and 4.

## Decisions (confirmed by Alan)

1. **Do not clear `actualReps` on completion.** Existing behavior stays: editing `currentReps` already wipes the "got ..." note. Snapshot records `actualReps` if non-empty, else `currentReps`.
2. **Imports live inside `workoutHistory`**, flagged `imported`. No SQL change.
3. **Snapshot only exercises marked done** (fallback to the whole day if none are checked).
