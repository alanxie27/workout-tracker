// A cached old index.html (no lifts.js tag) with a fresh script.js would
// crash on load right after a deploy. Reload once to get the new page.
if (typeof Lifts === 'undefined') {
    try {
        if (!sessionStorage.getItem('liftsReload')) {
            sessionStorage.setItem('liftsReload', '1');
            location.reload();
        }
    } catch (e) { /* storage blocked: fall through and fail loudly */ }
    throw new Error('lifts.js did not load - reload the page');
}
try { sessionStorage.removeItem('liftsReload'); } catch (e) { /* fine */ }

// ============================================================
// STATE + DOM REFERENCES
// ============================================================

const tabButtons = document.querySelectorAll('.tab-btn');
const workoutSections = document.querySelectorAll('.workout-day');
const exerciseName = document.getElementById('exerciseName');
const addExerciseBtn = document.getElementById('addExerciseBtn');

let workoutData = {
    upperA: [],
    upperB: [],
    lowerA: [],
    lowerB: [],
};

let completionData = {
    upperA: null,
    lowerA: null,
    upperB: null,
    lowerB: null,
    weekStart: null
}

// declared up here (not further down) so the header stats can read it on load
let workoutHistory = [];

// Workout order for auto-progression
const workoutOrder = ['upperA', 'lowerA', 'upperB', 'lowerB'];

// app settings: 4-day split (all four workouts each week) or 2-day split
// (one upper + one lower per week, alternating A/B cycles by COMPLETION -
// finishing the pair flips the cycle; an unfinished week stays on it)
let appSettings = {
    split: '4day',
    currentCycle: 'A'
};

function loadSettings() {
    const saved = localStorage.getItem('appSettings');
    if (saved) {
        appSettings = JSON.parse(saved);
    }
}

function saveSettings() {
    Sync.save('appSettings', JSON.stringify(appSettings));
}

// the workouts that count toward the current week
function activePairDays() {
    if (appSettings.split === '2day') {
        return appSettings.currentCycle === 'A' ? ['upperA', 'lowerA'] : ['upperB', 'lowerB'];
    }
    return workoutOrder;
}

// log of split changes over time, so past weeks are always judged by the
// split that was actually in effect back then (switching modes never
// rewrites streak history)
let splitHistory = [];

function loadSplitHistory() {
    const saved = localStorage.getItem('splitHistory');
    if (saved) {
        splitHistory = JSON.parse(saved);
    } else {
        // first run: assume the current split has applied all along
        splitHistory = [{ date: new Date(0).toISOString(), split: appSettings.split }];
        saveSplitHistory();
    }
}

function saveSplitHistory() {
    Sync.save('splitHistory', JSON.stringify(splitHistory));
}

// the split that governed a given week = the last change before it ended
function splitForWeek(weekEnd) {
    let split = splitHistory.length ? splitHistory[0].split : appSettings.split;
    splitHistory.forEach(function(entry) {
        if (new Date(entry.date) < weekEnd) {
            split = entry.split;
        }
    });
    return split;
}

const dayNames = {
    upperA: 'Upper Body A',
    upperB: 'Upper Body B',
    lowerA: 'Lower Body A',
    lowerB: 'Lower Body B'
};

// inline SVG icons used in rendered cards (Lucide-style line icons)
const ICONS = {
    chevron: '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 6.5l4 4 4-4"/></svg>',
    check: '<svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 8.5l3.5 3.5L13 4.5"/></svg>',
    link: '<svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 11l-1.5 1.5a2.5 2.5 0 0 1-3.5-3.5L4.5 7"/><path d="M9 5l1.5-1.5a2.5 2.5 0 0 1 3.5 3.5L11.5 9"/><path d="M6 10l4-4"/></svg>',
    bolt: '<svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M8.8 1 3 9h3.6l-1.4 6L11 7H7.6z"/></svg>',
    pencil: '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11.5 2.5l2 2L5.5 12.5l-2.8.8.8-2.8z"/></svg>',
    up: '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 13V3M4 7l4-4 4 4"/></svg>',
    down: '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 3v10M4 9l4 4 4-4"/></svg>',
    trash: '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.5 4h11M6 4V2.5h4V4M4 4l.7 9h6.6l.7-9"/></svg>',
    sun: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><circle cx="8" cy="8" r="3"/><path d="M8 1.2v1.8M8 13v1.8M1.2 8H3M13 8h1.8M3.2 3.2l1.3 1.3M11.5 11.5l1.3 1.3M12.8 3.2l-1.3 1.3M4.5 11.5l-1.3 1.3"/></svg>',
    moon: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13.5 9.8A6 6 0 1 1 6.2 2.5a4.8 4.8 0 0 0 7.3 7.3z"/></svg>'
};

// ============================================================
// COMPLETION DATA (per-week workout completion)
// ============================================================

// load completion data from localStorage
function loadCompletionData() {
    const saved = localStorage.getItem('completionData');
    if (saved) {
        completionData = JSON.parse(saved);

    // check if it's a new week (monday)
    const now = new Date();
    const currentMonday = getMondayOfWeek(now);

    if (!completionData.weekStart || new Date(completionData.weekStart) < currentMonday) {
        resetWeekCompletion();
    }

    updateTabCheckmarks();
    } else {
        // first time, set week start
        completionData.weekStart = getMondayOfWeek(new Date()).toISOString();
        saveCompletionData();
        updateTabCheckmarks();
    }
}

// get monday of current week
function getMondayOfWeek(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    const monday = new Date(d.setDate(diff));

    monday.setHours(0,0,0,0);

    return monday;
}

// reset completion for new week
function resetWeekCompletion() {
    completionData = {
        upperA: null,
        lowerA: null,
        upperB: null,
        lowerB: null,
        weekStart: getMondayOfWeek(new Date()).toISOString()
    };
    saveCompletionData();
    updateTabCheckmarks();

    // also uncheck every exercise for the new week
    for (let day in workoutData) {
        workoutData[day].forEach(function(exercise) {
            exercise.done = false;
        });
    }
    Sync.save('workoutData', JSON.stringify(workoutData));
    rerenderAllExercises();
}

// Save completion data
function saveCompletionData() {
    Sync.save('completionData', JSON.stringify(completionData));
}

// update tab checkmarks + the header stats that depend on completion
function updateTabCheckmarks() {
    workoutOrder.forEach(day => {
        const tab = document.getElementById('tab-' + day);
        if (completionData[day]) {
            tab.classList.add('completed');
        } else {
            tab.classList.remove('completed');
        }
    });

    // in 2-day mode the off-cycle pair's tabs shrink and dim
    // (still tappable if the user wants to peek)
    const activePair = activePairDays();
    workoutOrder.forEach(day => {
        const tab = document.getElementById('tab-' + day);
        tab.classList.toggle('off-cycle', appSettings.split === '2day' && activePair.indexOf(day) === -1);
    });

    updateWeekInfo();
    updateStreakChip();
}

// header kicker: "Week of Jul 6 · 2 of 4 done" (or "of 2" on the 2-day split)
function updateWeekInfo() {
    const monday = getMondayOfWeek(new Date());
    const monthDay = monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    let doneCount = 0;
    workoutOrder.forEach(function(day) {
        if (completionData[day]) doneCount++;
    });

    let text;
    if (appSettings.split === '2day') {
        // count everything completed this week (the cycle may already have
        // flipped after the pair was finished) but cap at the weekly goal
        text = Math.min(2, doneCount) + ' of 2 done';
    } else {
        text = doneCount + ' of 4 done';
    }

    document.getElementById('weekInfo').textContent = 'Week of ' + monthDay + ' · ' + text;
}

// header streak chip
function updateStreakChip() {
    document.getElementById('streakChipVal').textContent = calculateStreak() + ' wk';
}

// header title follows the active tab
function updateHeader(day) {
    document.getElementById('dayTitle').textContent = dayNames[day];
}

// get next incomplete workout (within the active pair on the 2-day split)
function getNextIncompleteWorkout() {
    const days = activePairDays();
    for (let day of days) {
        if (!completionData[day]) {
            return day;
        }
    }
    // All complete - return first
    return days[0];
}

// ============================================================
// TEXT HELPERS (color markup + day pairing)
// ============================================================

// parse color syntax and convert to html
// (classes instead of inline colors so each theme can pick legible tones)
function parseColorText(text) {
    if (!text) return '';

    let result = text;

    // Replace *red*text*red* with red span
    result = result.replace(/\*red\*(.*?)\*red\*/g, '<span class="c-red">$1</span>');

    // Replace *blue*text*blue* with blue span
    result = result.replace(/\*blue\*(.*?)\*blue\*/g, '<span class="c-blue">$1</span>');

    // Replace *yellow*text*yellow* with yellow span
    result = result.replace(/\*yellow\*(.*?)\*yellow\*/g, '<span class="c-yellow">$1</span>');

    // Replace *orange*text*orange* with orange span
    result = result.replace(/\*orange\*(.*?)\*orange\*/g, '<span class="c-orange">$1</span>');

    return result;
}

// special function to parse "Go to Failure" field with orange color for DROP SET
function parseGoToFailure(text) {
    if (!text) return '';

    if (text.includes('DROP SET')) {
        return text.replace('DROP SET', '<span class="c-orange">DROP SET</span>');
    }

    return text;
}

// function to get paired workout day
function getPairedWorkoutDay(workoutDay) {
    if (workoutDay === 'upperA') {
        return 'upperB';
    } else if (workoutDay === 'upperB') {
        return 'upperA';
    } else if (workoutDay === 'lowerA') {
        return 'lowerB';
    } else if (workoutDay === 'lowerB') {
        return 'lowerA';
    }

    return null;
}

// copy an exercise's fields onto its explicitly-linked partner in the paired
// day (name, done and collapsed stay per-day). The link is user-controlled
// via the "Sync with" field (exercise.syncGroup) - it no longer happens
// automatically just because two exercises share a name.
function syncPairedExercise(day, index) {
    const pairedDay = getPairedWorkoutDay(day);
    if (!pairedDay) return;

    const source = workoutData[day][index];
    if (!source.syncGroup) return;

    const target = workoutData[pairedDay].find(function(exercise) {
        return exercise.syncGroup === source.syncGroup;
    });
    if (!target) return;

    target.machinePosition = source.machinePosition;
    target.tips = source.tips;
    target.targetMuscle = source.targetMuscle;
    target.startingSide = source.startingSide;
    target.sets = source.sets;
    target.reps = source.reps;
    target.rest = source.rest;
    target.currentWeight = source.currentWeight;
    target.currentReps = source.currentReps;
    target.actualReps = source.actualReps;
    target.increaseWeightBy = source.increaseWeightBy;
    target.goToFailure = source.goToFailure;
    target.cooldown = source.cooldown;

    Sync.save('workoutData', JSON.stringify(workoutData));
}

// severs a sync link: clears syncGroup off every exercise (in day + its
// paired day) that currently carries it
function breakSyncLink(day, groupId) {
    if (!groupId) return;
    const pairedDay = getPairedWorkoutDay(day);
    [day, pairedDay].forEach(function(d) {
        if (!d) return;
        workoutData[d].forEach(function(exercise) {
            if (exercise.syncGroup === groupId) {
                exercise.syncGroup = null;
            }
        });
    });
}

// exercises used to auto-sync just by sharing a name with their paired-day
// counterpart. Link any such pairs still unlinked into explicit syncGroups
// so old data keeps behaving the same way. Operates on whatever object is
// passed in (module-level workoutData, or freshly imported data).
function linkNameMatchedSyncPairs(data) {
    let changed = false;
    ['upperA', 'lowerA'].forEach(function(day) {
        const pairedDay = getPairedWorkoutDay(day);
        if (!data[day] || !data[pairedDay]) return;
        data[day].forEach(function(exercise) {
            if (exercise.syncGroup) return;
            const match = data[pairedDay].find(function(e) {
                return !e.syncGroup && e.name === exercise.name;
            });
            if (match) {
                const groupId = 'sync-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
                exercise.syncGroup = groupId;
                match.syncGroup = groupId;
                changed = true;
            }
        });
    });
    return changed;
}

// one-time migration on page load: never run again after the first time
// (an explicit "None" choice afterward must stick).
function migrateNameBasedSync() {
    if (localStorage.getItem('syncMigrationDone')) return;

    const changed = linkNameMatchedSyncPairs(workoutData);

    localStorage.setItem('syncMigrationDone', 'true');
    if (changed) {
        Sync.save('workoutData', JSON.stringify(workoutData));
    }
}

// imported backups made before the "Sync with" field existed carry no
// syncGroup at all - detect that (no exercise anywhere has the field) and
// recreate the old same-name auto-sync so restoring an old backup doesn't
// silently drop sync links. Backups made after this feature exists already
// carry explicit syncGroup values (possibly null from a deliberate unlink),
// so those are left exactly as exported.
function migrateImportedDataIfLegacy(data) {
    const hasAnySyncField = Object.keys(data).some(function(day) {
        return Array.isArray(data[day]) && data[day].some(function(e) {
            return 'syncGroup' in e;
        });
    });
    if (hasAnySyncField) return;

    linkNameMatchedSyncPairs(data);
}

// ============================================================
// RENDERING
// ============================================================

//load data from localStorage when page loads
function loadWorkoutData() {
    const savedData = localStorage.getItem('workoutData');

    if (savedData) {
        workoutData = JSON.parse(savedData);
        migrateNameBasedSync();
        renderAllExercises();
    }
}

// one "Label   value" meta row - returns nothing for empty or N/A values
// so cards don't fill up with dead lines
function metaRow(label, value) {
    if (!value || value.trim() === '' || value.trim().toLowerCase() === 'n/a') return '';
    return '<div class="m"><span class="k">' + label + '</span><span class="val">' + parseColorText(value) + '</span></div>';
}

// "Go to failure" row - only rendered when it's not the default "No"
function failureRow(value) {
    if (!value || value === 'No') return '';
    return '<div class="m"><span class="k">Failure</span><span class="val failure">' + parseGoToFailure(value) + '</span></div>';
}

// "Cooldown" row - only rendered when the reminder is turned on
function cooldownRow(value) {
    if (value !== 'Yes') return '';
    return '<div class="m"><span class="k">Cooldown</span><span class="val">Reminder when done</span></div>';
}

// one tile of the 4-column stat grid; `note` is an optional user-entered
// value shown faded underneath (e.g. reps actually hit when below max)
function statTile(label, value, note) {
    const display = (value && value.trim() !== '') ? parseColorText(value) : '—';

    let sub = '';
    if (note && note.trim() !== '' && note.trim() !== (value || '').trim()) {
        sub = '<div class="stat-note">got ' + parseColorText(note) + '</div>';
    }

    return '<div class="stat"><div class="l">' + label + '</div><div class="v">' + display + '</div>' + sub + '</div>';
}

// build one exercise card element (used for solo cards and alternative groups)
// The "last time" line at the bottom of a card: last weight and reps from
// history, a small line of every session, and how it moved. Tapping it opens
// the lift in Progress. Cached per history so 30 cards share one pass.
let cardTrendCache = { history: null, size: -1, map: null };
function cardTrendFor(name) {
    if (cardTrendCache.history !== workoutHistory || cardTrendCache.size !== workoutHistory.length) {
        const map = {};
        Lifts.progress(workoutHistory).forEach(function (l) { map[l.lift] = l; });
        cardTrendCache = { history: workoutHistory, size: workoutHistory.length, map: map };
    }
    return cardTrendCache.map[Lifts.liftKey(name)] || null;
}

function cardTrend(name) {
    const l = cardTrendFor(name);
    if (!l) return '';
    const d = progressDelta(l);
    const last = progressNum(l.last) + (l.lastReps ? ' × ' + l.lastReps : '');
    const when = progressDay(l.lastDay);
    return '<button type="button" class="card-trend" data-lift="' + progressText(l.lift) + '" aria-label="Open ' + progressText(l.name) + ' in Progress">' +
        '<span class="t-l">Last · ' + when + '</span><span class="t-v">' + progressText(last) + '</span>' +
        (l.points.length > 1 ? '<span class="progress-spark ' + d.tone + '">' + progressChart(l.points, 52, 20, false).svg + '</span>' : '') +
        '<span class="t-d ' + d.tone + '">' + (l.bump ? 'add weight' : d.text) + '</span></button>';
}

function createExerciseCard(day, exercise, index, isUpNext, pairedDay) {
    const exerciseCard = document.createElement('div');
    exerciseCard.classList.add('exercise-card');

    // restore saved card states
    if (exercise.collapsed) {
        exerciseCard.classList.add('collapsed');
    }
    if (exercise.done) {
        exerciseCard.classList.add('done');
    }
    if (isUpNext) {
        exerciseCard.classList.add('next-up');
    }

    // synced = this exercise is explicitly linked (via "Sync with") to an
    // exercise in the paired day
    let isSynced = false;
    if (pairedDay && exercise.syncGroup) {
        isSynced = workoutData[pairedDay].some(function(e) {
            return e.syncGroup === exercise.syncGroup;
        });
    }

    // meta rows below the stat grid (empty/N-A fields are skipped)
    const metaRows =
        metaRow('Target', exercise.targetMuscle) +
        metaRow('Machine', exercise.machinePosition) +
        metaRow('Side', exercise.startingSide) +
        metaRow('Target reps', exercise.reps) +
        metaRow('Increase by', exercise.increaseWeightBy) +
        failureRow(exercise.goToFailure) +
        cooldownRow(exercise.cooldown) +
        metaRow('Tips', exercise.tips);

    exerciseCard.innerHTML = `
        ${isUpNext ? '<div class="card-upnext">Up next</div>' : ''}
        <div class="card-head">
            <button class="btn-collapse" data-day="${day}" data-index="${index}" aria-label="Expand or collapse">${ICONS.chevron}</button>
            <button class="check exercise-done" data-day="${day}" data-index="${index}" aria-label="Mark exercise done">${ICONS.check}</button>
            <span class="exercise-name">${parseColorText(exercise.name)}</span>
            ${isSynced ? `<span class="duplicate-badge">${ICONS.link}synced</span>` : ''}
        </div>
        <div class="card-body">
            <div class="stat-grid">
                ${statTile('Weight', exercise.currentWeight)}
                ${statTile('Reps', exercise.currentReps, exercise.actualReps)}
                ${statTile('Sets', exercise.sets)}
                ${statTile('Rest', exercise.rest)}
            </div>
            ${metaRows ? `<div class="card-meta">${metaRows}</div>` : ''}
            ${cardTrend(exercise.name)}
            <div class="card-actions">
                <button class="icon-btn btn-quick-edit log" data-day="${day}" data-index="${index}" aria-label="Quick log weight and reps">${ICONS.bolt}</button>
                <button class="icon-btn btn-edit" data-day="${day}" data-index="${index}" aria-label="Edit exercise">${ICONS.pencil}</button>
                <button class="icon-btn btn-up" data-day="${day}" data-index="${index}" aria-label="Move up">${ICONS.up}</button>
                <button class="icon-btn btn-down" data-day="${day}" data-index="${index}" aria-label="Move down">${ICONS.down}</button>
                <button class="icon-btn btn-delete danger" data-day="${day}" data-index="${index}" aria-label="Delete exercise">${ICONS.trash}</button>
            </div>
        </div>
    `;

    return exerciseCard;
}

// render all exercises from workoutData
function renderAllExercises() {
    //loop through each workout day
    for (let day in workoutData) {
        const exercises = workoutData[day];

        //get section for this day
        const sectionId = day + '-section';
        const section = document.getElementById(sectionId);
        const exercisesList = section.querySelector('.exercises-list');

        // clear no exercises message
        const emptyState = exercisesList.querySelector('.empty-state');
        if (emptyState && exercises.length > 0) {
            emptyState.remove();
        }

        // paired day for duplicate detection (upperA<->upperB, lowerA<->lowerB)
        const pairedDay = getPairedWorkoutDay(day);

        // topmost exercise that still needs to be completed gets the "Up next" label
        const firstIncompleteIndex = exercises.findIndex(function(e) {
            return !e.done;
        });

        // exercises already rendered as part of an alternative group get skipped
        const renderedIndexes = new Set();

        exercises.forEach(function(exercise, index) {
            if (renderedIndexes.has(index)) return;

            // collect every exercise sharing this one's altGroup id
            let groupIndexes = [index];
            if (exercise.altGroup) {
                groupIndexes = [];
                exercises.forEach(function(e, i) {
                    if (e.altGroup === exercise.altGroup) {
                        groupIndexes.push(i);
                    }
                });
            }

            if (groupIndexes.length > 1) {
                // alternatives render together as one bordered unit,
                // separated by an "or" divider
                const wrapper = document.createElement('div');
                wrapper.classList.add('alt-group');

                const groupIsUpNext = groupIndexes.indexOf(firstIncompleteIndex) !== -1;

                groupIndexes.forEach(function(i, pos) {
                    if (pos > 0) {
                        const divider = document.createElement('div');
                        divider.classList.add('alt-divider');
                        divider.textContent = 'or';
                        wrapper.appendChild(divider);
                    }
                    // "Up next" label only on the group's first card
                    wrapper.appendChild(createExerciseCard(day, exercises[i], i, groupIsUpNext && pos === 0, pairedDay));
                    renderedIndexes.add(i);
                });

                exercisesList.appendChild(wrapper);
            } else {
                exercisesList.appendChild(createExerciseCard(day, exercise, index, index === firstIncompleteIndex, pairedDay));
                renderedIndexes.add(index);
            }
        });
    }
}

// scroll instantly, without smooth-scroll animation
function scrollToInstant(y) {
    const html = document.documentElement;
    const previousBehavior = html.style.scrollBehavior;
    html.style.scrollBehavior = 'auto';
    window.scrollTo(0, y);
    html.style.scrollBehavior = previousBehavior;
}

// clear every exercise list and rebuild from workoutData,
// keeping the page scrolled where the user left it
function rerenderAllExercises() {
    const scrollPos = window.scrollY;

    workoutSections.forEach(function(section) {
        const list = section.querySelector('.exercises-list');
        list.innerHTML = '<p class="empty-state">No exercises added yet.</p>';
    });

    renderAllExercises();

    scrollToInstant(scrollPos);
}

// ============================================================
// TABS
// ============================================================

tabButtons.forEach(function(button) {

    button.addEventListener('click', function() {

        tabButtons.forEach(function(btn) {
            btn.classList.remove('active');
        });

        workoutSections.forEach(function(section) {
            section.classList.remove('active');
        });

        button.classList.add('active');

        const buttonId = button.id;
        const workoutDay = buttonId.replace('tab-', '');
        const sectionId = workoutDay + '-section';
        const targetSection = document.getElementById(sectionId);

        targetSection.classList.add('active');

        // keep the big header title in sync with the visible day
        updateHeader(workoutDay);
    });

});

// ============================================================
// ADD EXERCISE
// ============================================================

addExerciseBtn.addEventListener('click', function() {
    const exerciseNameValue = exerciseName.value;

    if (exerciseNameValue.trim() === '') {
        alert("Please enter an exercise name!");
        return;
    }

    const activeSection = document.querySelector('.workout-day.active');
    const workoutDay = activeSection.id.replace('-section', '');

    // create exercise object
    const exerciseObj = {
        name: exerciseNameValue,
        machinePosition: '',
        tips: '',
        startingSide: '',
        targetMuscle: '',
        sets: '',
        reps: '',
        rest: '',
        currentWeight: '',
        currentReps: '',
        actualReps: '',
        increaseWeightBy: '',
        goToFailure: 'No',
        cooldown: 'No',
        done: false,
        collapsed: false,
        altGroup: null,
        syncGroup: null
    }

    // add to correct workout day array
    workoutData[workoutDay].push(exerciseObj);

    // save to localStorage
    Sync.save('workoutData', JSON.stringify(workoutData));

    // rebuild the lists from data (one template lives in renderAllExercises,
    // so new cards always look identical to loaded ones)
    rerenderAllExercises();

    // clear input field and close the sheet
    exerciseName.value = '';
    addExerciseModal.classList.remove('active');

});

// ============================================================
// CARD BUTTONS (event delegation)
// Cards are re-created on every render, so we listen on document
// and find the clicked button. Clicks usually land on the SVG
// inside the button, so closest('button') walks up to it.
// ============================================================

document.addEventListener('click', function(event) {
    const btn = event.target.closest('button');
    if (!btn) return;

    const workoutDay = btn.dataset.day;
    const exerciseIndex = parseInt(btn.dataset.index);

    // expand / collapse a card
    if (btn.classList.contains('btn-collapse')) {
        workoutData[workoutDay][exerciseIndex].collapsed = !workoutData[workoutDay][exerciseIndex].collapsed;
        Sync.save('workoutData', JSON.stringify(workoutData));
        rerenderAllExercises();
    }

    // check off an exercise as done for this session
    // (alternatives check off together - doing one IS doing the slot)
    if (btn.classList.contains('exercise-done')) {
        const exercise = workoutData[workoutDay][exerciseIndex];
        const newDone = !exercise.done;

        if (exercise.altGroup) {
            workoutData[workoutDay].forEach(function(e) {
                if (e.altGroup === exercise.altGroup) {
                    e.done = newDone;
                    // remember which alternative you actually did, so
                    // history logs that one and not the others
                    e.didThis = newDone && e === exercise;
                }
            });
        } else {
            exercise.done = newDone;
        }

        Sync.save('workoutData', JSON.stringify(workoutData));
        rerenderAllExercises();

        // this exercise wants a cooldown - remind on the way to the next one
        if (newDone && exercise.cooldown === 'Yes') {
            showCooldownReminder();
        }
    }

    // full edit - opens the shared bottom sheet
    if (btn.classList.contains('btn-edit')) {
        openEditSheet(workoutDay, exerciseIndex, null);
    }

    // quick log - same sheet, cursor already in the Reps field
    if (btn.classList.contains('btn-quick-edit')) {
        openEditSheet(workoutDay, exerciseIndex, 'currentReps');
    }

    // delete (with confirm)
    if (btn.classList.contains('btn-delete')) {
        if (confirm('Are you sure you want to delete this exercise?')) {
            const removed = workoutData[workoutDay].splice(exerciseIndex, 1)[0];

            // a group of one is no group - unlink the leftover partner
            if (removed && removed.altGroup) {
                cleanupAltGroup(workoutDay, removed.altGroup);
            }

            // deleting one half of a sync link frees the other half
            if (removed && removed.syncGroup) {
                breakSyncLink(workoutDay, removed.syncGroup);
            }

            Sync.save('workoutData', JSON.stringify(workoutData));
            rerenderAllExercises();
        }
    }

    // reorder up
    if (btn.classList.contains('btn-up')) {
        if (exerciseIndex === 0) return;

        const exercises = workoutData[workoutDay];
        const temp = exercises[exerciseIndex];
        exercises[exerciseIndex] = exercises[exerciseIndex - 1];
        exercises[exerciseIndex - 1] = temp;

        Sync.save('workoutData', JSON.stringify(workoutData));
        rerenderAllExercises();
    }

    // reorder down
    if (btn.classList.contains('btn-down')) {
        const exercises = workoutData[workoutDay];

        if (exerciseIndex === exercises.length - 1) return;

        const temp = exercises[exerciseIndex];
        exercises[exerciseIndex] = exercises[exerciseIndex + 1];
        exercises[exerciseIndex + 1] = temp;

        Sync.save('workoutData', JSON.stringify(workoutData));
        rerenderAllExercises();
    }
});

// ============================================================
// COOLDOWN REMINDER TOAST
// Shown when an exercise with "Begin cooldown: Yes" is checked
// off. Tap anywhere on it to dismiss; it also auto-hides.
// ============================================================

const cooldownToast = document.getElementById('cooldownToast');
let cooldownToastTimer = null;

function showCooldownReminder() {
    cooldownToast.classList.add('show');
    clearTimeout(cooldownToastTimer);
    cooldownToastTimer = setTimeout(hideCooldownReminder, 10000);
}

function hideCooldownReminder() {
    cooldownToast.classList.remove('show');
    clearTimeout(cooldownToastTimer);
}

cooldownToast.addEventListener('click', hideCooldownReminder);

// ============================================================
// EDIT SHEET
// One shared form for both Edit and Quick Log. Each input's
// data-field attribute names the exercise property it edits,
// so filling and saving are simple loops.
// ============================================================

const editSheet = document.getElementById('editSheet');
const editSave = document.getElementById('editSave');
const editCancel = document.getElementById('editCancel');
const altOfSelect = document.getElementById('ef-altOf');
const syncOfSelect = document.getElementById('ef-syncOf');

let editingDay = null;
let editingIndex = null;

// if a group has fewer than 2 members left, dissolve it
function cleanupAltGroup(day, groupId) {
    const members = workoutData[day].filter(function(e) {
        return e.altGroup === groupId;
    });
    if (members.length < 2) {
        members.forEach(function(e) {
            e.altGroup = null;
        });
    }
}

function openEditSheet(day, index, focusField) {
    editingDay = day;
    editingIndex = index;

    const exercise = workoutData[day][index];

    // fill every field from the exercise object
    editSheet.querySelectorAll('[data-field]').forEach(function(input) {
        const field = input.dataset.field;
        // selects default to "No" so exercises saved before the field existed still work
        input.value = exercise[field] || ((field === 'goToFailure' || field === 'cooldown') ? 'No' : '');
    });

    // rebuild the "Alternative to" dropdown with this day's other exercises
    altOfSelect.innerHTML = '<option value="">None</option>';
    workoutData[day].forEach(function(e, i) {
        if (i === index) return;
        const option = document.createElement('option');
        option.value = i;
        // strip color markup so option text reads clean
        option.textContent = e.name.replace(/\*(red|blue|yellow|orange)\*/g, '');
        altOfSelect.appendChild(option);
    });

    // preselect the current partner if this exercise is already linked
    if (exercise.altGroup) {
        workoutData[day].forEach(function(e, i) {
            if (i !== index && e.altGroup === exercise.altGroup) {
                altOfSelect.value = i;
            }
        });
    }

    // rebuild the "Sync with" dropdown from the paired day's exercises
    // (upperA <-> upperB, lowerA <-> lowerB)
    const pairedDayForSync = getPairedWorkoutDay(day);
    syncOfSelect.innerHTML = '<option value="">None</option>';
    if (pairedDayForSync) {
        workoutData[pairedDayForSync].forEach(function(e, i) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = e.name.replace(/\*(red|blue|yellow|orange)\*/g, '');
            syncOfSelect.appendChild(option);
        });

        // preselect the current sync partner, if linked
        if (exercise.syncGroup) {
            workoutData[pairedDayForSync].forEach(function(e, i) {
                if (e.syncGroup === exercise.syncGroup) {
                    syncOfSelect.value = i;
                }
            });
        }
    }

    editSheet.classList.add('active');

    // quick log lands the cursor in the requested field, ready to type
    if (focusField) {
        const target = editSheet.querySelector('[data-field="' + focusField + '"]');
        if (target) {
            target.focus();
            if (target.setSelectionRange) {
                target.setSelectionRange(target.value.length, target.value.length);
            }
        }
    }
}

function closeEditSheet() {
    editSheet.classList.remove('active');
    editingDay = null;
    editingIndex = null;
}

editSave.addEventListener('click', function() {
    if (editingDay === null) return;

    const nameInput = editSheet.querySelector('[data-field="name"]');
    if (nameInput.value.trim() === '') {
        alert('Exercise name cannot be empty!');
        return;
    }

    const previousReps = workoutData[editingDay][editingIndex].currentReps;
    const previousNote = workoutData[editingDay][editingIndex].actualReps;

    // write every field back to the exercise object
    editSheet.querySelectorAll('[data-field]').forEach(function(input) {
        workoutData[editingDay][editingIndex][input.dataset.field] = input.value.trim();
    });

    const exercise = workoutData[editingDay][editingIndex];

    // an updated max makes the old shortfall note stale - clear it,
    // unless the user typed a fresh note in this same save
    if (exercise.currentReps !== previousReps && exercise.actualReps === previousNote) {
        exercise.actualReps = '';
    }
    const previousGroup = exercise.altGroup || null;

    if (altOfSelect.value === '') {
        // unlink
        exercise.altGroup = null;
        if (previousGroup) {
            cleanupAltGroup(editingDay, previousGroup);
        }
    } else {
        const target = workoutData[editingDay][parseInt(altOfSelect.value)];

        // join the target's existing group, or start a new one for both
        const groupId = target.altGroup || ('alt-' + Date.now());
        target.altGroup = groupId;
        exercise.altGroup = groupId;

        if (previousGroup && previousGroup !== groupId) {
            cleanupAltGroup(editingDay, previousGroup);
        }

        // a group shares one done state - align it so the checkmarks agree
        const groupDone = target.done === true;
        workoutData[editingDay].forEach(function(e) {
            if (e.altGroup === groupId) {
                e.done = groupDone;
            }
        });
        // the one just linked in wasn't the one you tapped this session;
        // if the group was already checked off, it was the target
        exercise.didThis = false;
        if (groupDone && !workoutData[editingDay].some(function(e) {
            return e.altGroup === groupId && e.didThis === true;
        })) {
            target.didThis = true;
        }
    }

    // "Sync with" - explicit link to one exercise in the paired day.
    // Unlike alt groups this is always exactly a pair, so picking a new
    // partner first severs whatever link either side already had.
    if (syncOfSelect.value === '') {
        if (exercise.syncGroup) {
            breakSyncLink(editingDay, exercise.syncGroup);
        }
    } else {
        const pairedDayForSync = getPairedWorkoutDay(editingDay);
        const syncTarget = workoutData[pairedDayForSync][parseInt(syncOfSelect.value)];

        if (exercise.syncGroup && exercise.syncGroup !== syncTarget.syncGroup) {
            breakSyncLink(editingDay, exercise.syncGroup);
        }
        if (syncTarget.syncGroup && syncTarget.syncGroup !== exercise.syncGroup) {
            breakSyncLink(pairedDayForSync, syncTarget.syncGroup);
        }

        const syncGroupId = exercise.syncGroup || syncTarget.syncGroup || ('sync-' + Date.now());
        exercise.syncGroup = syncGroupId;
        syncTarget.syncGroup = syncGroupId;
    }

    Sync.save('workoutData', JSON.stringify(workoutData));

    // push this exercise's stats onto its explicitly-linked partner, if any
    syncPairedExercise(editingDay, editingIndex);

    closeEditSheet();
    rerenderAllExercises();
});

editCancel.addEventListener('click', closeEditSheet);

// clicking the dark backdrop (not the sheet itself) also cancels
editSheet.addEventListener('click', function(event) {
    if (event.target === editSheet) {
        closeEditSheet();
    }
});

// ============================================================
// COMPLETE WORKOUT
// ============================================================

document.addEventListener('click', function(event) {
    const btn = event.target.closest('.btn-complete-workout');
    if (!btn) return;

    const workoutDay = btn.dataset.day;
    const currentDate = new Date().toISOString();

    if (appSettings.split === '2day') {
        // 2-day split: only the clicked workout is marked (no sequence
        // assumption - upper and lower can happen in either order)
        completionData[workoutDay] = currentDate;
    } else {
        // 4-day split: completing a workout also completes everything
        // before it in the rotation
        const completedIndex = workoutOrder.indexOf(workoutDay);
        for (let i = 0; i <= completedIndex; i++) {
            completionData[workoutOrder[i]] = currentDate;
        }
    }

    // Add to history
    addToHistory(workoutDay);

    saveCompletionData();

    // uncheck this day's exercises so the next session starts fresh
    workoutData[workoutDay].forEach(function(exercise) {
        exercise.done = false;
    });
    Sync.save('workoutData', JSON.stringify(workoutData));

    // is the week finished?
    const weekComplete = activePairDays().every(day => completionData[day]);

    if (appSettings.split === '2day' && weekComplete) {
        // completion (not the calendar) flips the A/B cycle:
        // next week's pair takes the spotlight right away
        const nextCycle = appSettings.currentCycle === 'A' ? 'B' : 'A';
        appSettings.currentCycle = nextCycle;
        saveSettings();

        updateTabCheckmarks();
        rerenderAllExercises();

        alert('🎉 Week complete! Up next: Upper ' + nextCycle + ' + Lower ' + nextCycle);
    } else if (weekComplete) {
        updateTabCheckmarks();
        rerenderAllExercises();

        alert('🎉 Week Complete! All workouts done. Great job!');
        // Stay on current tab
    } else {
        updateTabCheckmarks();
        rerenderAllExercises();

        alert('✓ Workout completed! Moving to next workout.');
    }

    // land on the next workout that still needs doing
    // (after a 2-day flip that's the first of the new pair;
    // a finished 4-day week stays where it is)
    if (appSettings.split === '2day' || !weekComplete) {
        const nextDay = getNextIncompleteWorkout();
        const nextTabBtn = document.getElementById('tab-' + nextDay);
        if (nextTabBtn && !nextTabBtn.classList.contains('active')) {
            nextTabBtn.click();
        }
    }
});

// ============================================================
// WORKOUT HISTORY + STREAKS
// ============================================================

// Load workout history from localStorage
function loadWorkoutHistory() {
    const saved = localStorage.getItem('workoutHistory');
    if (saved) {
        workoutHistory = JSON.parse(saved);
    }
}

// Save workout history
function saveWorkoutHistory() {
    Sync.save('workoutHistory', JSON.stringify(workoutHistory));
}

// Add workout to history, with what you lifted. Must run BEFORE the
// finished day's checkmarks are cleared - the snapshot reads them.
function addToHistory(workoutDay) {
    const historyEntry = {
        date: new Date().toISOString(),
        workout: workoutDay,
        exercises: Lifts.snapshotDay(workoutData[workoutDay], workoutDay)
    };
    workoutHistory.unshift(historyEntry); // Add to beginning of array
    saveWorkoutHistory();
}

function calculateStreak() {
    const sessions = Lifts.realWorkouts(workoutHistory);
    if (sessions.length === 0) return 0;

    let streak = 0;
    const today = new Date();

    // Start from LAST week (not current week) - the most recent COMPLETED week
    let checkDate = new Date(today);
    checkDate.setDate(checkDate.getDate() - 7);

    // Go backwards through completed weeks only
    for (let weekOffset = 0; weekOffset < 52; weekOffset++) {
        const weekStart = getMondayOfWeek(checkDate);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 7);

        // Get all workouts in this week
        const workoutsThisWeek = sessions.filter(entry => {
            const entryDate = new Date(entry.date);
            return entryDate >= weekStart && entryDate < weekEnd;
        });

        // What counts as a complete week depends on the split that was in
        // effect DURING that week (from splitHistory), not the current one:
        // 4-day needs all four types, 2-day needs one upper + one lower
        const workoutTypes = new Set(workoutsThisWeek.map(w => w.workout));

        const weekIsComplete = splitForWeek(weekEnd) === '2day'
            ? ((workoutTypes.has('upperA') || workoutTypes.has('upperB')) &&
               (workoutTypes.has('lowerA') || workoutTypes.has('lowerB')))
            : (workoutTypes.has('upperA') && workoutTypes.has('lowerA') &&
               workoutTypes.has('upperB') && workoutTypes.has('lowerB'));

        if (weekIsComplete) {
            streak++;
            // Go back one more week
            checkDate.setDate(checkDate.getDate() - 7);
        } else {
            // Week incomplete - streak ends
            break;
        }
    }

    return streak;
}

// Calculate workouts this month
function calculateMonthWorkouts() {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return Lifts.realWorkouts(workoutHistory).filter(entry => {
        const entryDate = new Date(entry.date);
        return entryDate.getMonth() === currentMonth &&
               entryDate.getFullYear() === currentYear;
    }).length;
}

// ============================================================
// CALENDAR
// ============================================================

// Calendar state
let currentCalendarMonth = new Date().getMonth();
let currentCalendarYear = new Date().getFullYear();
// Redesign state: which view is open, the open lift, filters, the picked day.
let currentView = 'train';
let openProgressLift = null;
let progressFilter = 'all';
let progressRange = 'all';
const WIDE = window.matchMedia('(min-width: 960px)');
let selectedHistoryDay = null;   // 'YYYY-MM-DD' (local)

// Render calendar
function renderCalendar() {
    const calendarGrid = document.getElementById('calendarGrid');
    const currentMonthTitle = document.getElementById('currentMonth');
    const streakCount = document.getElementById('streakCount');
    const monthCount = document.getElementById('monthCount');

    // Update stats
    const streak = calculateStreak();
    const monthWorkouts = calculateMonthWorkouts();

    streakCount.textContent = streak;
    monthCount.textContent = monthWorkouts;
    document.getElementById('streakUnit').textContent = streak === 1 ? 'full week' : 'full weeks';
    document.getElementById('monthUnit').textContent = monthWorkouts === 1 ? 'workout' : 'workouts';

    // Update month title
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December'];
    currentMonthTitle.textContent = monthNames[currentCalendarMonth] + ' ' + currentCalendarYear;

    // Clear calendar
    calendarGrid.innerHTML = '';

    // Add day headers
    const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    dayHeaders.forEach(day => {
        const header = document.createElement('div');
        header.className = 'calendar-day-header';
        header.textContent = day;
        calendarGrid.appendChild(header);
    });

    // Get first day of month and total days
    const firstDay = new Date(currentCalendarYear, currentCalendarMonth, 1);
    const lastDay = new Date(currentCalendarYear, currentCalendarMonth + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    // Get days from previous month to fill the grid
    const prevMonthLastDay = new Date(currentCalendarYear, currentCalendarMonth, 0).getDate();

    // Add previous month's trailing days
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
        const dayDiv = document.createElement('div');
        dayDiv.className = 'calendar-day other-month';
        dayDiv.textContent = prevMonthLastDay - i;
        calendarGrid.appendChild(dayDiv);
    }

    // Get today's date for comparison
    const today = new Date();
    const todayDate = today.getDate();
    const todayMonth = today.getMonth();
    const todayYear = today.getFullYear();

    // Add current month's days. Each is a button: tap one to see that day's
    // session. A dot marks a finished workout (blue upper, green lower).
    const real = Lifts.realWorkouts(workoutHistory);
    const pad = function (n) { return (n < 10 ? '0' : '') + n; };
    for (let day = 1; day <= daysInMonth; day++) {
        const dayDiv = document.createElement('button');
        dayDiv.type = 'button';
        dayDiv.className = 'calendar-day';
        const key = currentCalendarYear + '-' + pad(currentCalendarMonth + 1) + '-' + pad(day);
        dayDiv.dataset.day = key;
        dayDiv.textContent = day;

        if (day === todayDate && currentCalendarMonth === todayMonth && currentCalendarYear === todayYear) {
            dayDiv.classList.add('today');
        }
        if (key === selectedHistoryDay) dayDiv.classList.add('selected');

        const entries = real.filter(function (entry) { return localDayOf(entry.date) === key; });
        if (entries.length) {
            dayDiv.classList.add('has-workout');
            const dot = document.createElement('i');
            dot.className = 'dot ' + sessionKind(entries[0].workout);
            dayDiv.appendChild(dot);
            dayDiv.setAttribute('aria-label', key + ', ' + entries.map(function (e) { return dayNames[e.workout] || 'workout'; }).join(', '));
        }

        calendarGrid.appendChild(dayDiv);
    }

    // Add next month's starting days to complete the grid
    const totalCells = calendarGrid.children.length - 7; // Subtract day headers
    const remainingCells = 42 - totalCells - 7; // 6 rows × 7 days - current cells - headers
    for (let day = 1; day <= remainingCells; day++) {
        const dayDiv = document.createElement('div');
        dayDiv.className = 'calendar-day other-month';
        dayDiv.textContent = day;
        calendarGrid.appendChild(dayDiv);
    }
}

function renderHistory() {
    renderCalendar();
    renderSession();
    renderProgress();
}

// ============================================================
// VIEWS (Train / Progress / History)
// ============================================================

function showView(name) {
    currentView = name;
    try { sessionStorage.setItem('view', name); } catch (e) { /* storage blocked */ }
    document.body.dataset.view = name;
    document.querySelectorAll('.view').forEach(function (v) { v.classList.toggle('active', v.id === 'view-' + name); });
    document.querySelectorAll('.view-btn').forEach(function (b) {
        const on = b.dataset.view === name;
        b.classList.toggle('active', on);
        b.setAttribute('aria-pressed', String(on));
    });
    if (name === 'train') {
        const tab = document.querySelector('.tab-btn.active');
        if (tab) updateHeader(tab.id.replace('tab-', ''));
    } else {
        document.getElementById('dayTitle').textContent = name === 'progress' ? 'Progress' : 'History';
        renderHistory();
    }
    window.scrollTo(0, 0);
}

document.querySelector('.views').addEventListener('click', function (event) {
    const btn = event.target.closest('.view-btn');
    if (btn) { openProgressLift = null; showView(btn.dataset.view); }
});

// ============================================================
// PROGRESS (every lift over time)
// ============================================================
// Built from workoutHistory by Lifts.progress. Three counts on top, filters,
// then the lifts in groups: ready to add weight, going up, holding, slipping.
// Tapping a lift opens its chart: on a phone it replaces the list, on a wide
// screen it sits beside it.


function progressText(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
}

function progressNum(n) {
    return String(Math.round(n * 100) / 100);
}

function progressDay(day, withYear) {
    const p = day.split('-').map(Number);
    const opts = withYear ? { month: 'short', day: 'numeric', year: 'numeric' } : { month: 'short', day: 'numeric' };
    return new Date(p[0], p[1] - 1, p[2]).toLocaleDateString('en-US', opts);
}

function dayStamp(day) {
    const p = day.split('-').map(Number);
    return Date.UTC(p[0], p[1] - 1, p[2]);
}

// The line for one lift. x is spaced by real dates, so a gap in training
// shows as a gap. Imported weeks draw as hollow dots. `big` adds grid lines,
// a soft fill and a dot per session.
function progressChart(points, w, h, big) {
    const pad = big ? 12 : 3;
    const t = points.map(function (pt) { return dayStamp(pt.day); });
    const t0 = t[0], span = (t[t.length - 1] - t0) || 1;
    let lo = Infinity, hi = -Infinity;
    points.forEach(function (pt) { lo = Math.min(lo, pt.weight); hi = Math.max(hi, pt.weight); });
    const range = (hi - lo) || 1;
    const xy = points.map(function (pt, i) {
        const x = points.length === 1 ? w / 2 : pad + (w - 2 * pad) * (t[i] - t0) / span;
        const y = hi === lo ? h / 2 : h - pad - (h - 2 * pad) * (pt.weight - lo) / range;
        return [Math.round(x * 10) / 10, Math.round(y * 10) / 10];
    });
    const path = xy.map(function (p) { return p.join(','); }).join(' ');
    let out = '';
    if (big) {
        [pad, h / 2, h - pad].forEach(function (y) {
            out += '<line x1="0" x2="' + w + '" y1="' + y + '" y2="' + y + '" stroke="var(--line)" stroke-width="1" vector-effect="non-scaling-stroke"/>';
        });
        if (xy.length > 1) {
            out += '<polygon fill="var(--brass-soft)" points="' + path + ' ' + xy[xy.length - 1][0] + ',' + h + ' ' + xy[0][0] + ',' + h + '"/>';
        }
    }
    if (xy.length > 1) {
        out += '<polyline fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke" points="' + path + '"/>';
    }
    return { svg: '<svg class="progress-chart" viewBox="0 0 ' + w + ' ' + h + '" ' + (big ? 'preserveAspectRatio="none"' : 'width="' + w + '"') + ' height="' + h + '" aria-hidden="true">' + out +
        (big ? '' : '<circle cx="' + xy[xy.length - 1][0] + '" cy="' + xy[xy.length - 1][1] + '" r="2.5" fill="currentColor"/>') + '</svg>',
        xy: xy, lo: lo, hi: hi };
}

function progressDelta(l) {
    if (l.points.length < 2) return { text: 'first entry', tone: '' };
    if (l.status === 'slipping') return { text: '−' + progressNum(l.best - l.last) + ' from best', tone: 'down' };
    if (l.change === 0) return { text: 'same', tone: '' };
    return { text: (l.change > 0 ? '+' : '−') + progressNum(Math.abs(l.change)), tone: l.change > 0 ? 'up' : 'down' };
}

function progressSub(l) {
    const where = { upper: 'Upper', lower: 'Lower', core: 'Core', other: '' }[l.group];
    const reps = l.lastReps ? progressNum(l.last) + ' × ' + l.lastReps : progressDay(l.lastDay);
    return (where ? where + ' · ' : '') + reps;
}

function progressRow(l) {
    const d = progressDelta(l);
    return '<button type="button" class="progress-row' + (l.lift === openProgressLift ? ' sel' : '') + '" data-lift="' + progressText(l.lift) + '">' +
        '<span class="progress-name"><b>' + progressText(l.name) + '</b><small>' + progressText(progressSub(l)) + '</small></span>' +
        '<span class="progress-spark ' + d.tone + '">' + progressChart(l.points, 64, 26, false).svg + '</span>' +
        '<span class="progress-now"><b>' + progressNum(l.last) + '</b><small class="' + d.tone + '">' + d.text + '</small></span></button>';
}

function progressGroup(title, list, note) {
    if (!list.length) return '';
    return '<label class="f-label pg-label">' + title + (note ? '<span>' + note + '</span>' : '') + '</label>' +
        '<div class="progress-list">' + list.map(progressRow).join('') + '</div>';
}

function progressLifts() {
    return Lifts.progress(workoutHistory);
}

function renderProgress() {
    const box = document.getElementById('progressList');
    if (!box) return;
    const all = progressLifts();
    const tiles = document.getElementById('pgTiles');
    const filters = document.getElementById('pgFilters');
    const search = document.getElementById('pgSearch');
    const empty = all.length === 0;
    tiles.hidden = filters.hidden = search.hidden = empty;
    if (empty) {
        box.innerHTML = '<p class="progress-empty">Nothing to chart yet. Tap Complete workout at the end of a session and its weights show up here.</p>';
        document.getElementById('pgDetail').innerHTML = '';
        document.body.classList.remove('pg-open');
        return;
    }

    const count = function (status) { return all.filter(function (l) { return l.status === status; }).length; };
    const since = all.reduce(function (min, l) { return l.points[0].day < min ? l.points[0].day : min; }, all[0].points[0].day);
    tiles.innerHTML =
        '<div class="stat-tile"><div class="l">Going up</div><div class="v up">' + count('up') + '</div><div class="s">of ' + all.length + ' lifts</div></div>' +
        '<div class="stat-tile"><div class="l">Holding</div><div class="v">' + count('holding') + '</div><div class="s">same weight</div></div>' +
        '<div class="stat-tile"><div class="l">Slipping</div><div class="v' + (count('slipping') ? ' down' : '') + '">' + count('slipping') + '</div><div class="s">below best</div></div>';

    const groups = ['upper', 'lower', 'core', 'other'].filter(function (g) { return all.some(function (l) { return l.group === g; }); });
    if (progressFilter !== 'all' && groups.indexOf(progressFilter) < 0) progressFilter = 'all';
    filters.innerHTML = ['all'].concat(groups).map(function (g) {
        const n = g === 'all' ? all.length : all.filter(function (l) { return l.group === g; }).length;
        const on = g === progressFilter;
        return '<button type="button" class="pg-chip' + (on ? ' on' : '') + '" data-filter="' + g + '" aria-pressed="' + on + '">' +
            { all: 'All', upper: 'Upper', lower: 'Lower', core: 'Core', other: 'Other' }[g] + ' ' + n + '</button>';
    }).join('');

    const q = search.value.trim().toLowerCase();
    const shown = all.filter(function (l) {
        return (progressFilter === 'all' || l.group === progressFilter) && (!q || l.name.toLowerCase().indexOf(q) >= 0);
    });
    const by = function (test, sort) { return shown.filter(test).sort(sort || function () { return 0; }); };
    const gain = function (a, b) { return b.change - a.change; };
    const html =
        progressGroup('Time to add weight', by(function (l) { return l.bump; }), '3+ sessions, every set hit') +
        progressGroup('Going up', by(function (l) { return l.status === 'up' && !l.bump; }, gain), 'now · since ' + progressDay(since)) +
        progressGroup('Holding', by(function (l) { return (l.status === 'holding' || l.status === 'new') && !l.bump; })) +
        progressGroup('Slipping', by(function (l) { return l.status === 'slipping' && !l.bump; }), 'below your best');
    box.innerHTML = html || '<p class="progress-empty">No lifts match.</p>';

    // wide screens always show a chart beside the list
    if (WIDE.matches && !all.some(function (l) { return l.lift === openProgressLift; })) {
        const firstRow = box.querySelector('.progress-row');
        openProgressLift = firstRow ? firstRow.dataset.lift : all[0].lift;
        box.querySelectorAll('.progress-row').forEach(function (r) { r.classList.toggle('sel', r.dataset.lift === openProgressLift); });
    }
    renderProgressDetail(all);
}

function renderProgressDetail(all) {
    const box = document.getElementById('pgDetail');
    const l = (all || progressLifts()).find(function (x) { return x.lift === openProgressLift; });
    document.body.classList.toggle('pg-open', !!l);
    if (!l) { box.innerHTML = ''; return; }

    const cut = { '3m': 92, '6m': 183, '1y': 366 }[progressRange];
    const lastT = dayStamp(l.lastDay);
    let pts = cut ? l.points.filter(function (pt) { return lastT - dayStamp(pt.day) <= cut * 86400000; }) : l.points;
    if (!pts.length) pts = l.points;
    const chart = progressChart(pts, 320, 170, true);
    const dots = chart.xy.map(function (p, i) {
        return '<i class="' + (pts[i].imported ? 'hollow' : '') + '" style="left:' + (p[0] / 320 * 100) + '%;top:' + (p[1] / 170 * 100) + '%"></i>';
    }).join('');
    const pct = l.first ? Math.round(l.change / l.first * 100) : 0;
    const d = progressDelta(l);

    let note = '';
    if (l.bump) note = 'Same weight for ' + l.held + ' sessions and every set hit the target. Time to add weight.';
    else if (l.status === 'slipping') note = 'Your best was ' + progressNum(l.best) + ' on ' + progressDay(l.bestDay, true) + '.';
    else if (l.repsShort > 0) {
        // the goal is the target on every set: rebuild it from what was done plus what is missing
        const done = Lifts.repsList(l.lastReps);
        const target = Math.round((l.repsShort + done.reduce(function (a, b) { return a + b; }, 0)) / done.length);
        note = 'Reps at ' + progressNum(l.last) + ' were ' + l.lastReps + '. Hit ' + done.map(function () { return target; }).join('-') + ' and it is time to add weight.';
    }
    else if (l.repsShort === 0 && l.held < 3 && l.points.length > 1) note = 'Every set hit the target at ' + progressNum(l.last) + '. ' + (3 - l.held) + ' more like that and it is time to add weight.';

    const sessions = l.points.slice().reverse().map(function (pt, i, arr) {
        const prev = arr[i + 1];
        const diff = prev ? pt.weight - prev.weight : 0;
        return '<li><span class="d">' + progressDay(pt.day, true) + (pt.imported ? ' <i>imported</i>' : '') + '</span>' +
            '<span class="w">' + progressText(pt.weightRaw) + '</span>' +
            '<span class="r">' + progressText(pt.reps || '') + '</span>' +
            '<span class="c ' + (diff > 0 ? 'up' : diff < 0 ? 'down' : '') + '">' + (diff ? (diff > 0 ? '+' : '−') + progressNum(Math.abs(diff)) : '') + '</span></li>';
    }).join('');

    box.innerHTML =
        '<button type="button" class="pg-back" data-act="back">' + ICONS.chevron + 'Progress</button>' +
        '<div class="pg-head"><div><h2>' + progressText(l.name) + '</h2><p>' + { upper: 'Upper', lower: 'Lower', core: 'Core', other: '' }[l.group] + (l.points.length > 1 ? ' · ' + l.points.length + ' entries' : ' · 1 entry') + '</p></div>' +
        '<div class="pg-ranges">' + [['3m', '3M'], ['6m', '6M'], ['1y', '1Y'], ['all', 'All']].map(function (r) {
            return '<button type="button" data-range="' + r[0] + '" class="' + (r[0] === progressRange ? 'on' : '') + '" aria-pressed="' + (r[0] === progressRange) + '">' + r[1] + '</button>';
        }).join('') + '</div></div>' +
        '<div class="stat-tiles three">' +
        '<div class="stat-tile"><div class="l">Now</div><div class="v">' + progressNum(l.last) + '</div><div class="s">' + progressText(l.lastReps ? '× ' + l.lastReps : progressDay(l.lastDay)) + '</div></div>' +
        '<div class="stat-tile"><div class="l">Best</div><div class="v">' + progressNum(l.best) + '</div><div class="s">' + progressDay(l.bestDay) + '</div></div>' +
        '<div class="stat-tile"><div class="l">Since ' + progressDay(l.points[0].day) + '</div><div class="v ' + (l.change > 0 ? 'up' : l.change < 0 ? 'down' : '') + '">' + (l.change > 0 ? '+' : l.change < 0 ? '−' : '') + progressNum(Math.abs(l.change)) + '</div><div class="s">' + (l.change ? (pct > 0 ? '+' : '') + pct + '%' : d.text) + '</div></div>' +
        '</div>' +
        '<div class="pg-chart" role="img" aria-label="' + progressText(l.name) + ' weight over time, from ' + progressNum(pts[0].weight) + ' to ' + progressNum(pts[pts.length - 1].weight) + '">' +
        '<div class="pg-plot">' + chart.svg + dots + '<span class="hi">' + progressNum(chart.hi) + '</span>' + (chart.hi !== chart.lo ? '<span class="lo">' + progressNum(chart.lo) + '</span>' : '') + '</div>' +
        '<div class="pg-axis"><span>' + progressDay(pts[0].day, true) + '</span><span>' + (pts.length > 1 ? progressDay(pts[pts.length - 1].day, true) : '') + '</span></div></div>' +
        (note ? '<p class="pg-note' + (l.bump ? ' go' : '') + '">' + progressText(note) + '</p>' : '') +
        '<label class="f-label pg-label">Sessions<span>weight · reps · change</span></label>' +
        '<ul class="progress-sessions progress-list">' + sessions + '</ul>';
}

function openLift(lift) {
    openProgressLift = lift;
    if (currentView !== 'progress') showView('progress'); else renderProgress();
    if (!WIDE.matches) window.scrollTo(0, 0);
}

document.getElementById('view-progress').addEventListener('click', function (event) {
    const row = event.target.closest('.progress-row');
    if (row) { openLift(row.dataset.lift); return; }
    const chip = event.target.closest('.pg-chip');
    if (chip) { progressFilter = chip.dataset.filter; if (!WIDE.matches) openProgressLift = null; renderProgress(); return; }
    const range = event.target.closest('[data-range]');
    if (range) { progressRange = range.dataset.range; renderProgressDetail(); return; }
    if (event.target.closest('[data-act="back"]')) { openProgressLift = null; renderProgress(); }
});
document.getElementById('pgSearch').addEventListener('input', renderProgress);
WIDE.addEventListener('change', function () { if (currentView === 'progress') renderProgress(); });

// ============================================================
// HISTORY: the session for the day you tap
// ============================================================

function localDayOf(iso) {
    const d = new Date(iso);
    const p = function (n) { return (n < 10 ? '0' : '') + n; };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}

function sessionKind(workout) {
    return /^upper/i.test(workout || '') ? 'upper' : /^lower/i.test(workout || '') ? 'lower' : '';
}

function renderSession() {
    const real = Lifts.realWorkouts(workoutHistory).slice().sort(function (a, b) { return new Date(b.date) - new Date(a.date); });
    if (!selectedHistoryDay && real.length) selectedHistoryDay = localDayOf(real[0].date);

    // "this week" tile, same count as the header
    let doneCount = 0;
    workoutOrder.forEach(function (day) { if (completionData[day]) doneCount++; });
    const goal = appSettings.split === '2day' ? 2 : 4;
    document.getElementById('weekCount').textContent = Math.min(goal, doneCount) + ' of ' + goal;

    const lifts = progressLifts();
    const box = document.getElementById('hsSession');
    const todays = real.filter(function (h) { return localDayOf(h.date) === selectedHistoryDay; });
    if (!real.length) {
        box.innerHTML = '<p class="progress-empty hs-empty">No finished workouts yet. Tap Complete workout at the end of a session and it shows up here.</p>';
    } else if (!todays.length) {
        box.innerHTML = '<p class="progress-empty hs-empty">No workout on ' + progressDay(selectedHistoryDay, true) + '.</p>';
    } else {
        box.innerHTML = todays.map(function (h) {
            const rows = (h.exercises || []).map(function (e) {
                const l = lifts.find(function (x) { return x.lift === (e.lift || Lifts.liftKey(e.name)); });
                let diff = null;
                if (l && typeof e.weight === 'number') {
                    const at = l.points.findIndex(function (pt) { return pt.day === selectedHistoryDay; });
                    if (at > 0) diff = l.points[at].weight - l.points[at - 1].weight;
                }
                const change = diff === null ? '' : diff === 0 ? 'same' : (diff > 0 ? '+' : '−') + progressNum(Math.abs(diff));
                return '<button type="button" class="hs-lift" data-lift="' + progressText(e.lift || '') + '"><span class="n">' + progressText(e.name) + '</span>' +
                    '<span class="w">' + progressText(e.weightRaw || '') + (e.reps ? ' × ' + progressText(e.reps) : '') + '</span>' +
                    '<span class="c ' + (diff > 0 ? 'up' : diff < 0 ? 'down' : '') + '">' + change + '</span></button>';
            }).join('');
            return '<div class="progress-list hs-card"><div class="hs-head"><i class="dot ' + sessionKind(h.workout) + '"></i><div><b>' + progressText(dayNames[h.workout] || 'Workout') + '</b>' +
                '<small>' + new Date(h.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) +
                (rows ? ' · ' + h.exercises.length + (h.exercises.length === 1 ? ' lift' : ' lifts') : '') + '</small></div></div>' +
                (rows || '<p class="progress-empty">Weights were not saved for this one. Sessions finished from Nov 12 on keep them.</p>') + '</div>';
        }).join('');
    }

    document.getElementById('hsRecent').innerHTML = real.slice(0, 8).map(function (h) {
        const day = localDayOf(h.date);
        return '<button type="button" class="hs-recent' + (day === selectedHistoryDay ? ' sel' : '') + '" data-day="' + day + '"><i class="dot ' + sessionKind(h.workout) + '"></i>' +
            '<b>' + progressText(dayNames[h.workout] || 'Workout') + '</b><small>' + new Date(h.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) + '</small></button>';
    }).join('') || '<p class="progress-empty">Nothing yet.</p>';
}

function selectHistoryDay(day) {
    selectedHistoryDay = day;
    const p = day.split('-').map(Number);
    currentCalendarYear = p[0];
    currentCalendarMonth = p[1] - 1;
    renderCalendar();
    renderSession();
}

document.getElementById('view-history').addEventListener('click', function (event) {
    const cell = event.target.closest('.calendar-day[data-day]');
    if (cell) { selectHistoryDay(cell.dataset.day); return; }
    const recent = event.target.closest('.hs-recent');
    if (recent) { selectHistoryDay(recent.dataset.day); return; }
    const lift = event.target.closest('.hs-lift');
    if (lift && lift.dataset.lift) openLift(lift.dataset.lift);
});

// Calendar navigation buttons
const prevMonthBtn = document.getElementById('prevMonth');
const nextMonthBtn = document.getElementById('nextMonth');

prevMonthBtn.addEventListener('click', function() {
    currentCalendarMonth--;
    if (currentCalendarMonth < 0) {
        currentCalendarMonth = 11;
        currentCalendarYear--;
    }
    renderCalendar();
});

nextMonthBtn.addEventListener('click', function() {
    currentCalendarMonth++;
    if (currentCalendarMonth > 11) {
        currentCalendarMonth = 0;
        currentCalendarYear++;
    }
    renderCalendar();
});

// ============================================================
// MODALS (add exercise + history)
// ============================================================

const showAddModal = document.getElementById('showAddModal');
const addExerciseModal = document.getElementById('addExerciseModal');
const closeModal = document.getElementById('closeModal');

showAddModal.addEventListener('click', function() {
    addExerciseModal.classList.add('active');
    document.getElementById('exerciseName').focus();
});

closeModal.addEventListener('click', function() {
    addExerciseModal.classList.remove('active');
    document.getElementById('exerciseName').value = '';
});

addExerciseModal.addEventListener('click', function(event) {
    // clicking the dark overlay (not the sheet) closes it
    if (event.target === addExerciseModal) {
        addExerciseModal.classList.remove('active');
        document.getElementById('exerciseName').value = '';
    }
});

const showHistoryModal = document.getElementById('showSettings');   // the gear; the sheet now holds settings only
const historyModal = document.getElementById('historyModal');
const closeHistoryModal = document.getElementById('closeHistoryModal');

// ----- weekly split toggle (inside the history sheet) -----
const split4dayBtn = document.getElementById('split4day');
const split2dayBtn = document.getElementById('split2day');
const splitNote = document.getElementById('splitNote');

// reflect the current setting in the toggle + explainer text
function updateSplitUI() {
    split4dayBtn.classList.toggle('on', appSettings.split === '4day');
    split2dayBtn.classList.toggle('on', appSettings.split === '2day');

    if (appSettings.split === '2day') {
        const c = appSettings.currentCycle;
        splitNote.textContent = 'This week: Upper ' + c + ' + Lower ' + c + '. Finishing both counts the week and switches to the ' + (c === 'A' ? 'B' : 'A') + ' pair.';
    } else {
        splitNote.textContent = 'All four workouts each week.';
    }
}

function setSplit(mode) {
    if (appSettings.split === mode) return;

    appSettings.split = mode;

    if (mode === '2day') {
        // pick up wherever completion left off: if the A pair is already
        // done this week, this week's pair is B
        if (completionData.upperA && completionData.lowerA &&
            (!completionData.upperB || !completionData.lowerB)) {
            appSettings.currentCycle = 'B';
        } else {
            appSettings.currentCycle = 'A';
        }
    }

    saveSettings();

    // record when the switch happened - past weeks keep their old rule
    splitHistory.push({ date: new Date().toISOString(), split: mode });
    saveSplitHistory();

    updateSplitUI();
    updateTabCheckmarks();   // re-dim tabs + refresh week counter
    renderHistory();         // refresh the tiles, the calendar and Progress

    // land on the pair that's now in play
    const nextTab = document.getElementById('tab-' + getNextIncompleteWorkout());
    if (nextTab && !nextTab.classList.contains('active')) {
        nextTab.click();
    }
}

split4dayBtn.addEventListener('click', function() { setSplit('4day'); });
split2dayBtn.addEventListener('click', function() { setSplit('2day'); });

showHistoryModal.addEventListener('click', function() {
    updateSplitUI();
    historyModal.classList.add('active');
});

closeHistoryModal.addEventListener('click', function() {
    historyModal.classList.remove('active');
});

historyModal.addEventListener('click', function(event) {
    if (event.target === historyModal) {
        historyModal.classList.remove('active');
    }
});

// ============================================================
// EXPORT / IMPORT
// ============================================================

const exportBtn = document.getElementById('exportBtn');

exportBtn.addEventListener('click', function() {

    // Create complete export with all data
    const completeData = {
        workoutData: workoutData,
        completionData: completionData,
        workoutHistory: workoutHistory,
        settings: appSettings,
        splitHistory: splitHistory
    };

    //convert complete data to json string
    const dataStr = JSON.stringify(completeData, null, 2);

    // create a blob (binary large object) from the string
    const dataBlob = new Blob([dataStr], {type: 'application/json'});

    // create a download link
    const downloadLink = document.createElement('a');
    downloadLink.href = URL.createObjectURL(dataBlob);

    // set fileName with current date
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    downloadLink.download = `workout-data-${dateStr}.json`;

    // trigger the download
    downloadLink.click();
});

const importBtn = document.getElementById('importBtn');
const importFile = document.getElementById('importFile');

// when import btn is clicked, trigger file input
importBtn.addEventListener('click', function() {
    importFile.click(); // open file picker
});

// when a file is selected
importFile.addEventListener('change', function(event) {
    const file = event.target.files[0]; // Get the selected file

    if (file) {
        // create a fileReader to read file
        const reader = new FileReader();

        // when file is loaded
        reader.onload = function(e) {
            try {
                // Parse the JSON string into an object
                const importedData = JSON.parse(e.target.result);

                // Check if it's the new format (with workoutData, completionData, workoutHistory)
                if (importedData.workoutData && importedData.completionData && importedData.workoutHistory) {
                    // this wipes saved history, including logged weights -
                    // easy to mix up with "Import past weeks", so ask
                    if (!confirm('Restore this backup?\n\nIt REPLACES all exercises and history on this device, including logged weights. To add old weeks as data points, cancel and use "Import past weeks".')) {
                        return;
                    }
                    // New format - import everything
                    workoutData = importedData.workoutData;
                    completionData = importedData.completionData;
                    workoutHistory = importedData.workoutHistory;

                    // legacy backups (pre-"Sync with") get same-name pairs
                    // auto-linked, same as the first-load migration does
                    migrateImportedDataIfLegacy(workoutData);

                    // split settings ride along when present
                    // (older backups without them keep the current setting)
                    if (importedData.settings) {
                        appSettings = importedData.settings;
                        saveSettings();
                    }

                    // restore the split-change log; backups from before it
                    // existed get re-seeded from the (restored) setting
                    if (importedData.splitHistory) {
                        splitHistory = importedData.splitHistory;
                    } else {
                        splitHistory = [{ date: new Date(0).toISOString(), split: appSettings.split }];
                    }
                    saveSplitHistory();

                    // Save all to localStorage
                    Sync.save('workoutData', JSON.stringify(workoutData));
                    Sync.save('completionData', JSON.stringify(completionData));
                    Sync.save('workoutHistory', JSON.stringify(workoutHistory));

                    // Update UI
                    updateTabCheckmarks();
                    rerenderAllExercises();

                    alert('Data imported successfully with history and streaks!');
                }
                // Check if it's the old format (just workout data)
                else if (importedData.upperA && importedData.upperB &&
                    importedData.lowerA && importedData.lowerB) {

                    // Old format - import just workout data
                    workoutData = importedData;

                    // this format predates "Sync with" entirely - always legacy
                    migrateImportedDataIfLegacy(workoutData);

                    Sync.save('workoutData', JSON.stringify(workoutData));
                    rerenderAllExercises();

                    alert('Data imported successfully!');
                } else {
                    alert('Invalid file format. Please select a valid workout data file.');
                }
            } catch (error) {
                alert('Error reading file. Please make sure it\'s a valid JSON file.');
            }
        };

        // read the file as text
        reader.readAsText(file);
    }
});

// ============================================================
// IMPORT PAST WEEKS
// Old weekly exports become history data points (weights + reps per
// lift) for charts. Merges, never replaces; imported weeks are flagged
// so streaks and the calendar ignore them. Weights the rules can't read
// go to a review sheet first - nothing is saved until you press Save.
// ============================================================

const importWeeksBtn = document.getElementById('importWeeksBtn');
const importWeeksFile = document.getElementById('importWeeksFile');
const importReviewModal = document.getElementById('importReviewModal');
const importReviewList = document.getElementById('importReviewList');
const importReviewSummary = document.getElementById('importReviewSummary');
const importReviewSave = document.getElementById('importReviewSave');
const importReviewCancel = document.getElementById('importReviewCancel');

// the batch waiting on the review sheet: [{ fileName, parsed }]
let pendingImport = null;

importWeeksBtn.addEventListener('click', function() {
    importWeeksFile.value = '';   // picking the same files again still fires change
    importWeeksFile.click();
});

function readFileText(file) {
    return new Promise(function(resolve, reject) {
        const reader = new FileReader();
        reader.onload = function(e) { resolve(e.target.result); };
        reader.onerror = function() { reject(reader.error); };
        reader.readAsText(file);
    });
}

importWeeksFile.addEventListener('change', async function(event) {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    const batch = [];
    const problems = [];
    const byDate = {};
    for (const file of files) {
        try {
            const parsed = Lifts.readExport(file.name, JSON.parse(await readFileText(file)));
            if (byDate[parsed.date]) {
                problems.push(file.name + ': same week as ' + byDate[parsed.date] + ', skipped');
                continue;
            }
            byDate[parsed.date] = file.name;
            batch.push({ fileName: file.name, parsed: parsed });
        } catch (err) {
            problems.push(file.name + ': ' + (err && err.message ? err.message : 'could not read'));
        }
    }

    if (batch.length === 0) {
        alert('Nothing imported.\n\n' + problems.join('\n'));
        return;
    }

    pendingImport = { batch: batch, problems: problems };
    const reviewCount = batch.reduce(function(n, b) { return n + b.parsed.review.length; }, 0);
    if (reviewCount === 0) {
        commitImport();
    } else {
        openImportReview();
    }
});

function openImportReview() {
    importReviewList.innerHTML = '';
    let count = 0;
    pendingImport.batch.forEach(function(b, bi) {
        b.parsed.review.forEach(function(row) {
            count++;
            const wrap = document.createElement('div');
            wrap.className = 'review-row';

            const head = document.createElement('div');
            head.className = 'rr-head';
            const name = document.createElement('span');
            name.textContent = row.name;
            const date = document.createElement('span');
            date.className = 'rr-date';
            date.textContent = b.parsed.date;
            head.append(name, date);

            const raw = document.createElement('div');
            raw.className = 'rr-raw';
            raw.textContent = 'You typed: ' + row.weightRaw;

            const input = document.createElement('input');
            input.type = 'text';
            input.inputMode = 'decimal';
            input.className = 'sheet-input';
            input.placeholder = 'Weight in lb, or leave blank to skip';
            input.dataset.batch = bi;
            input.dataset.row = b.parsed.rows.indexOf(row);

            wrap.append(head, raw, input);
            importReviewList.appendChild(wrap);
        });
    });
    const weeks = pendingImport.batch.length;
    importReviewSummary.textContent = weeks + (weeks === 1 ? ' week' : ' weeks') + ' read. ' +
        count + (count === 1 ? ' weight needs' : ' weights need') +
        ' a number. Blank keeps what you typed with no number, so it won\'t chart.';
    importReviewModal.classList.add('active');
}

importReviewSave.addEventListener('click', function() {
    if (!pendingImport) return;
    const inputs = importReviewList.querySelectorAll('input');
    let bad = 0;
    inputs.forEach(function(input) {
        const text = input.value.trim();
        const ok = text === '' || Lifts.parseWeight(text) !== null;
        input.style.borderColor = ok ? '' : 'var(--red, #e5484d)';
        if (!ok) bad++;
    });
    if (bad > 0) {
        alert(bad + (bad === 1 ? ' entry isn\'t' : ' entries aren\'t') + ' a weight. Type a number like 125, or leave it blank.');
        return;
    }
    inputs.forEach(function(input) {
        const text = input.value.trim();
        if (text === '') return;
        const row = pendingImport.batch[Number(input.dataset.batch)].parsed.rows[Number(input.dataset.row)];
        row.weight = Lifts.parseWeight(text);
        row.weightFixed = text;   // what you corrected it to, kept next to the original
    });
    importReviewModal.classList.remove('active');
    commitImport();
});

importReviewCancel.addEventListener('click', function() {
    pendingImport = null;
    importReviewModal.classList.remove('active');
});

function commitImport() {
    const batch = pendingImport.batch;
    const problems = pendingImport.problems;
    pendingImport = null;

    const entries = batch.map(function(b) { return Lifts.importEntry(b.fileName, b.parsed); });
    workoutHistory = Lifts.mergeImports(workoutHistory, entries);
    saveWorkoutHistory();
    renderHistory();

    const lifts = entries.reduce(function(n, e) { return n + e.exercises.length; }, 0);
    let msg = 'Added ' + entries.length + (entries.length === 1 ? ' week' : ' weeks') +
        ' (' + lifts + ' lifts) to history. Streaks and the calendar are unchanged.';
    if (problems.length) msg += '\n\nSkipped:\n' + problems.join('\n');
    alert(msg);
}

// ============================================================
// THEME TOGGLE
// ============================================================

const darkModeToggle = document.getElementById('darkModeToggle');

// dark mode is the default
document.body.classList.add('dark-mode');
darkModeToggle.innerHTML = ICONS.sun;

const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'light') {
    document.body.classList.remove('dark-mode');
    darkModeToggle.innerHTML = ICONS.moon;
}

darkModeToggle.addEventListener('click', function() {
    document.body.classList.toggle('dark-mode');

    if (document.body.classList.contains('dark-mode')) {
        darkModeToggle.innerHTML = ICONS.sun;
        localStorage.setItem('theme', 'dark');
    } else {
        darkModeToggle.innerHTML = ICONS.moon;
        localStorage.setItem('theme', 'light');
    }
});

// ============================================================
// STARTUP
// Order matters: exercises and history load first so the
// completion check (which updates header stats) sees real data.
// ============================================================

loadSettings();
loadSplitHistory();
loadWorkoutData();
loadWorkoutHistory();
loadCompletionData();
rerenderAllExercises();   // cards drew before history loaded; redraw for their "last time" lines

// auto-switch to next incomplete workout on page load
const nextWorkout = getNextIncompleteWorkout();
const nextTab = document.getElementById('tab-' + nextWorkout);
if (nextTab && !nextTab.classList.contains('active')) {
    nextTab.click();
}

// make sure the header matches whichever tab ended up active
updateHeader(document.querySelector('.tab-btn.active').id.replace('tab-', ''));

// tap a card's "last time" line to open that lift in Progress
document.getElementById('view-train').addEventListener('click', function (event) {
    const t = event.target.closest('.card-trend');
    if (t) openLift(t.dataset.lift);
});

// reopen the view you were on (per tab, so a fresh launch starts on Train)
let savedView = null;
try { savedView = sessionStorage.getItem('view'); } catch (e) { /* storage blocked */ }
showView(savedView === 'progress' || savedView === 'history' ? savedView : 'train');

