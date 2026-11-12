// ============================================================
// LIFTS: turns what you typed into numbers history can chart
//
// Pure functions only (no DOM, no storage) so they can be tested on
// their own. Used by two places in script.js:
//   - finishing a workout snapshots each done exercise into history
//   - "Import past weeks" turns old weekly exports into history entries
// Both go through the same rules so charts never mix two ways of reading
// the same text.
// ============================================================

(function (root) {
    'use strict';

    // ---------- weight ----------
    // Returns a number, or null when the text needs a human to read it.
    //   "125"                     -> 125
    //   "100/90"                  -> 100   (drop set: first number)
    //   "2x 45 1x 35 per side"    -> 125   (one side summed, never doubled,
    //                                       bar and machine ignored)
    //   "2x45 + 1x10/25 per side" -> null  (review)
    //   "50 or above 42.5"        -> null  (review)
    //   ""                        -> null  (nothing typed; see isBlank)
    const NUM = '\\d+(?:\\.\\d+)?';
    const PLAIN = new RegExp('^' + NUM + '$');
    const DROP = new RegExp('^(' + NUM + ')(?:/' + NUM + ')+$');
    const PLATE = new RegExp('^(\\d+)x(' + NUM + ')$');
    const PLATES = [2.5, 5, 10, 15, 25, 35, 45, 55, 100];   // lb plate sizes

    function isBlank(text) {
        return text === undefined || text === null || String(text).trim() === '';
    }

    function stripColors(text) {
        // the app's own color markup: *red*text*red*
        return String(text).replace(/\*(red|blue|yellow|orange|green|purple)\*/gi, '');
    }

    function parseWeight(text) {
        if (isBlank(text)) return null;
        let s = stripColors(text).toLowerCase();
        s = s.replace(/(\d)\s*lbs?\b/g, '$1 ').replace(/\blbs?\b/g, ' ');  // units don't matter
        s = s.replace(/\s+/g, ' ').trim();

        // plain number, or a drop set of plain numbers
        const compact = s.replace(/\s+/g, '');
        if (PLAIN.test(compact)) return Number(compact);
        const drop = compact.match(DROP);
        if (drop) return Number(drop[1]);

        // Plate loading only when it says "per side" / "each side" - "2x45"
        // alone could mean two 45 lb dumbbells. Anything that could also be
        // sets x reps goes to review: a wrong number is worse than none.
        if (!/\b(per|each|a|one)\s+side\b/.test(s)) return null;
        if (s.indexOf('/') !== -1) return null;   // "1x10/25" is ambiguous

        let rest = s
            .replace(/\b(per|each|a|one)\s+side\b/g, ' ')
            .replace(/\b(plus|and|on|the|bar|barbell|machine|sled)\b/g, ' ')
            .replace(/[+,&]/g, ' ')
            .replace(/(\d)\s*x\s*(\d)/g, '$1x$2')  // "2x 45" -> "2x45"
            .replace(/\s+/g, ' ')
            .trim();
        if (rest === '') return null;
        const toks = rest.split(' ');

        // "45 per side": a lone number is the load on one side
        if (toks.length === 1 && PLAIN.test(toks[0])) return Number(toks[0]);

        let total = 0;
        for (const tok of toks) {
            const plate = tok.match(PLATE);
            if (!plate) return null;                         // bare number mixed with plates, words: review
            const count = Number(plate[1]);
            const kg = Number(plate[2]);
            if (count < 1 || count > 4) return null;         // "3x10" smells like sets x reps
            if (PLATES.indexOf(kg) === -1) return null;      // not a plate size: "3x8"
            total += count * kg;
        }
        // one "3x10"-style token on its own is too close to sets x reps
        // (3x45 or 4x2.5 per side are clearly plates; 3x5/3x10/3x15 aren't)
        if (toks.length === 1) {
            const only = toks[0].match(PLATE);
            if (Number(only[1]) >= 3 && [5, 10, 15].indexOf(Number(only[2])) !== -1) return null;
        }
        // float noise from 2.5 plates
        return Math.round(total * 100) / 100;
    }

    // ---------- names ----------
    // Lifts with two names map to one key. "Other ..." exercises are never
    // folded into anything; they keep their own key.
    const ALIASES = {
        'dumbbell incline bench press': 'incline dumbbell press'
    };

    function liftKey(name) {
        const n = stripColors(name || '')
            .toLowerCase()
            .replace(/[^a-z0-9 ]+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        return ALIASES[n] || n;
    }

    // ---------- reps ----------
    // currentReps is the max you're working at; actualReps is the optional
    // "got 7-6-6" note when you fell short. What you did = the note if there
    // is one, otherwise the max.
    function repsDone(exercise) {
        if (!isBlank(exercise.actualReps)) return String(exercise.actualReps).trim();
        if (!isBlank(exercise.currentReps)) return String(exercise.currentReps).trim();
        return '';
    }

    // one history row for one exercise. Raw text always kept, so a failed
    // parse never loses what was typed.
    function snapshotExercise(exercise, day) {
        const weightRaw = isBlank(exercise.currentWeight) ? '' : String(exercise.currentWeight).trim();
        return {
            name: exercise.name || '',
            lift: liftKey(exercise.name),
            day: day,
            weightRaw: weightRaw,
            weight: parseWeight(weightRaw),
            reps: repsDone(exercise),
            maxReps: isBlank(exercise.currentReps) ? '' : String(exercise.currentReps).trim(),
            sets: isBlank(exercise.sets) ? '' : String(exercise.sets).trim()
        };
    }

    // finishing a workout: snapshot what you checked off. If nothing is
    // checked (forgot to tick), take the whole day rather than nothing.
    // Alternatives ("A or B") check off together, so both read as done.
    // The one you actually tapped carries didThis: true; when a group has
    // one, the others in that group are left out. A group checked before
    // didThis existed keeps every member.
    function snapshotDay(exercises, day) {
        const list = Array.isArray(exercises) ? exercises : [];
        const tapped = {};
        list.forEach(function (e) {
            if (e && e.done === true && e.altGroup && e.didThis === true) tapped[e.altGroup] = true;
        });
        const done = list.filter(function (e) {
            if (!e || e.done !== true) return false;
            if (e.altGroup && tapped[e.altGroup]) return e.didThis === true;
            return true;
        });
        const chosen = done.length ? done : list;
        return chosen
            .filter(function (e) { return e && !isBlank(e.name); })
            .map(function (e) { return snapshotExercise(e, day); });
    }

    // ---------- importing an old weekly export ----------
    const DAYS = ['upperA', 'lowerA', 'upperB', 'lowerB'];

    function localDay(d) {
        const p = function (n) { return (n < 10 ? '0' : '') + n; };
        return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
    }

    // date for an export, 'YYYY-MM-DD' (local) or null.
    // The export names files by the UTC date, so a Sunday-evening export
    // in Central time is named Monday and would land in the next week.
    // When the newest workout in the file is on the filename's day or the
    // day before, that local day is the real one. Otherwise the filename.
    function exportDate(fileName, data) {
        const hist = data && Array.isArray(data.workoutHistory) ? data.workoutHistory : [];
        let newest = null;
        hist.forEach(function (h) {
            const t = h && h.date ? new Date(h.date) : null;
            if (t && !isNaN(t) && (!newest || t > newest)) newest = t;
        });
        const m = String(fileName || '').match(/(\d{4})-(\d{2})-(\d{2})/);
        if (!m) return newest ? localDay(newest) : null;

        const named = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
        if (newest) {
            const last = localDay(newest);
            const before = new Date(named); before.setDate(before.getDate() - 1);
            if (last === localDay(named) || last === localDay(before)) return last;
        }
        return localDay(named);
    }

    // Reads one export. Returns { date, rows, review } where review is the
    // subset of rows whose weight could not be read. Throws on a file that
    // isn't a workout export at all.
    function readExport(fileName, data) {
        const wd = data && data.workoutData;
        if (!wd || !DAYS.some(function (d) { return Array.isArray(wd[d]); })) {
            throw new Error('not a workout export (no workoutData)');
        }
        const date = exportDate(fileName, data);
        if (!date) throw new Error('no date in the file name or history');

        const rows = [];
        const seen = {};
        DAYS.forEach(function (day) {
            (wd[day] || []).forEach(function (e) {
                if (!e || isBlank(e.name)) return;
                if (isBlank(e.currentWeight) && isBlank(e.currentReps) && isBlank(e.actualReps)) return;
                const row = snapshotExercise(e, day);
                // Synced A/B copies of one lift are the same data point:
                // keep one. Same name with different numbers is two real
                // data points (different days), so both stay.
                const sig = row.lift + '|' + row.weightRaw + '|' + row.reps;
                if (seen[sig]) return;
                seen[sig] = true;
                rows.push(row);
            });
        });
        const review = rows.filter(function (r) { return r.weightRaw !== '' && r.weight === null; });
        return { date: date, rows: rows, review: review };
    }

    // history entry for one imported week. Noon local so a timezone shift
    // never moves it to the neighboring day.
    function importEntry(fileName, parsed) {
        const parts = parsed.date.split('-').map(Number);
        const when = new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);
        return {
            date: when.toISOString(),
            workout: null,
            imported: true,
            source: String(fileName || ''),
            exercises: parsed.rows
        };
    }

    // Adds imported entries to history without touching real ones. One
    // imported entry per date: importing the same week again replaces it,
    // so re-running an import never doubles anything. Returns a new array,
    // newest first.
    function mergeImports(history, entries) {
        const dayOf = function (iso) {
            const d = new Date(iso);
            return d.getFullYear() + '-' + d.getMonth() + '-' + d.getDate();
        };
        const incoming = {};
        entries.forEach(function (e) { incoming[dayOf(e.date)] = e; });
        const kept = (history || []).filter(function (h) {
            return !(h && h.imported === true && incoming[dayOf(h.date)]);
        });
        const merged = kept.concat(Object.keys(incoming).map(function (k) { return incoming[k]; }));
        // stable sort keeps the existing order of same-time entries
        return merged
            .map(function (h, i) { return { h: h, i: i, t: new Date(h.date).getTime() }; })
            .sort(function (a, b) { return (b.t - a.t) || (a.i - b.i); })
            .map(function (x) { return x.h; });
    }

    // Real sessions only. Streaks, the calendar and month counts read this,
    // so imported weeks never count as workouts you did.
    function realWorkouts(history) {
        return (history || []).filter(function (h) { return h && h.imported !== true; });
    }

    const Lifts = {
        parseWeight: parseWeight,
        liftKey: liftKey,
        repsDone: repsDone,
        snapshotExercise: snapshotExercise,
        snapshotDay: snapshotDay,
        exportDate: exportDate,
        readExport: readExport,
        importEntry: importEntry,
        mergeImports: mergeImports,
        realWorkouts: realWorkouts,
        isBlank: isBlank
    };

    if (typeof module !== 'undefined' && module.exports) module.exports = Lifts;
    else root.Lifts = Lifts;
})(this);
