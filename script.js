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
    localStorage.setItem('appSettings', JSON.stringify(appSettings));
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
    localStorage.setItem('splitHistory', JSON.stringify(splitHistory));
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
    localStorage.setItem('workoutData', JSON.stringify(workoutData));
    rerenderAllExercises();
}

// Save completion data
function saveCompletionData() {
    localStorage.setItem('completionData', JSON.stringify(completionData));
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

// copy an exercise's fields onto the same-named exercise in the paired day
// (name, done and collapsed stay per-day)
function syncPairedExercise(day, index) {
    const pairedDay = getPairedWorkoutDay(day);
    if (!pairedDay) return;

    const source = workoutData[day][index];

    workoutData[pairedDay].forEach(function(exercise) {
        if (exercise.name === source.name) {
            exercise.machinePosition = source.machinePosition;
            exercise.tips = source.tips;
            exercise.targetMuscle = source.targetMuscle;
            exercise.startingSide = source.startingSide;
            exercise.sets = source.sets;
            exercise.reps = source.reps;
            exercise.rest = source.rest;
            exercise.currentWeight = source.currentWeight;
            exercise.currentReps = source.currentReps;
            exercise.actualReps = source.actualReps;
            exercise.increaseWeightBy = source.increaseWeightBy;
            exercise.goToFailure = source.goToFailure;
        }
    });

    localStorage.setItem('workoutData', JSON.stringify(workoutData));
}

// ============================================================
// RENDERING
// ============================================================

//load data from localStorage when page loads
function loadWorkoutData() {
    const savedData = localStorage.getItem('workoutData');

    if (savedData) {
        workoutData = JSON.parse(savedData);
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

    // duplicate = same-named exercise exists in the paired day
    let hasDuplicate = false;
    if (pairedDay) {
        workoutData[pairedDay].forEach(function(e) {
            if (e.name === exercise.name) {
                hasDuplicate = true;
            }
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
        metaRow('Tips', exercise.tips);

    exerciseCard.innerHTML = `
        ${isUpNext ? '<div class="card-upnext">Up next</div>' : ''}
        <div class="card-head">
            <button class="btn-collapse" data-day="${day}" data-index="${index}" aria-label="Expand or collapse">${ICONS.chevron}</button>
            <button class="check exercise-done" data-day="${day}" data-index="${index}" aria-label="Mark exercise done">${ICONS.check}</button>
            <span class="exercise-name">${parseColorText(exercise.name)}</span>
            ${hasDuplicate ? `<span class="duplicate-badge">${ICONS.link}synced</span>` : ''}
        </div>
        <div class="card-body">
            <div class="stat-grid">
                ${statTile('Weight', exercise.currentWeight)}
                ${statTile('Reps', exercise.currentReps, exercise.actualReps)}
                ${statTile('Sets', exercise.sets)}
                ${statTile('Rest', exercise.rest)}
            </div>
            ${metaRows ? `<div class="card-meta">${metaRows}</div>` : ''}
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
        done: false,
        collapsed: false,
        altGroup: null
    }

    // add to correct workout day array
    workoutData[workoutDay].push(exerciseObj);

    // save to localStorage
    localStorage.setItem('workoutData', JSON.stringify(workoutData));

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
        localStorage.setItem('workoutData', JSON.stringify(workoutData));
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
                }
            });
        } else {
            exercise.done = newDone;
        }

        localStorage.setItem('workoutData', JSON.stringify(workoutData));
        rerenderAllExercises();
    }

    // full edit - opens the shared bottom sheet
    if (btn.classList.contains('btn-edit')) {
        openEditSheet(workoutDay, exerciseIndex, null);
    }

    // quick log - same sheet, cursor already in the Weight field
    if (btn.classList.contains('btn-quick-edit')) {
        openEditSheet(workoutDay, exerciseIndex, 'currentWeight');
    }

    // delete (with confirm)
    if (btn.classList.contains('btn-delete')) {
        if (confirm('Are you sure you want to delete this exercise?')) {
            const removed = workoutData[workoutDay].splice(exerciseIndex, 1)[0];

            // a group of one is no group - unlink the leftover partner
            if (removed && removed.altGroup) {
                cleanupAltGroup(workoutDay, removed.altGroup);
            }

            localStorage.setItem('workoutData', JSON.stringify(workoutData));
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

        localStorage.setItem('workoutData', JSON.stringify(workoutData));
        rerenderAllExercises();
    }

    // reorder down
    if (btn.classList.contains('btn-down')) {
        const exercises = workoutData[workoutDay];

        if (exerciseIndex === exercises.length - 1) return;

        const temp = exercises[exerciseIndex];
        exercises[exerciseIndex] = exercises[exerciseIndex + 1];
        exercises[exerciseIndex + 1] = temp;

        localStorage.setItem('workoutData', JSON.stringify(workoutData));
        rerenderAllExercises();
    }
});

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
        input.value = exercise[field] || (field === 'goToFailure' ? 'No' : '');
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
    }

    localStorage.setItem('workoutData', JSON.stringify(workoutData));

    // keep the same-named exercise in the paired day in sync
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
    localStorage.setItem('workoutData', JSON.stringify(workoutData));

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
    localStorage.setItem('workoutHistory', JSON.stringify(workoutHistory));
}

// Add workout to history
function addToHistory(workoutDay) {
    const historyEntry = {
        date: new Date().toISOString(),
        workout: workoutDay
    };
    workoutHistory.unshift(historyEntry); // Add to beginning of array
    saveWorkoutHistory();
}

function calculateStreak() {
    if (workoutHistory.length === 0) return 0;

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
        const workoutsThisWeek = workoutHistory.filter(entry => {
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

    return workoutHistory.filter(entry => {
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

// Render calendar
function renderCalendar() {
    const calendarGrid = document.getElementById('calendarGrid');
    const currentMonthTitle = document.getElementById('currentMonth');
    const streakCount = document.getElementById('streakCount');
    const monthCount = document.getElementById('monthCount');

    // Update stats
    const streak = calculateStreak();
    const monthWorkouts = calculateMonthWorkouts();

    streakCount.textContent = streak + (streak === 1 ? ' week' : ' weeks');
    monthCount.textContent = monthWorkouts + (monthWorkouts === 1 ? ' workout' : ' workouts');

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

    // Add current month's days
    for (let day = 1; day <= daysInMonth; day++) {
        const dayDiv = document.createElement('div');
        dayDiv.className = 'calendar-day';
        dayDiv.textContent = day;

        // Check if this is today
        if (day === todayDate &&
            currentCalendarMonth === todayMonth &&
            currentCalendarYear === todayYear) {
            dayDiv.classList.add('today');
        }

        // Check if there's a workout on this day
        const hasWorkout = workoutHistory.some(entry => {
            const entryDate = new Date(entry.date);
            return entryDate.getDate() === day &&
                   entryDate.getMonth() === currentCalendarMonth &&
                   entryDate.getFullYear() === currentCalendarYear;
        });

        if (hasWorkout) {
            dayDiv.classList.add('has-workout');
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

// Rename old renderHistory to keep compatibility
function renderHistory() {
    renderCalendar();
}

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

const showHistoryModal = document.getElementById('showHistoryModal');
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
    renderCalendar();        // refresh the tiles

    // land on the pair that's now in play
    const nextTab = document.getElementById('tab-' + getNextIncompleteWorkout());
    if (nextTab && !nextTab.classList.contains('active')) {
        nextTab.click();
    }
}

split4dayBtn.addEventListener('click', function() { setSplit('4day'); });
split2dayBtn.addEventListener('click', function() { setSplit('2day'); });

showHistoryModal.addEventListener('click', function() {
    renderHistory();
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
                    // New format - import everything
                    workoutData = importedData.workoutData;
                    completionData = importedData.completionData;
                    workoutHistory = importedData.workoutHistory;

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
                    localStorage.setItem('workoutData', JSON.stringify(workoutData));
                    localStorage.setItem('completionData', JSON.stringify(completionData));
                    localStorage.setItem('workoutHistory', JSON.stringify(workoutHistory));

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

                    localStorage.setItem('workoutData', JSON.stringify(workoutData));
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

// auto-switch to next incomplete workout on page load
const nextWorkout = getNextIncompleteWorkout();
const nextTab = document.getElementById('tab-' + nextWorkout);
if (nextTab && !nextTab.classList.contains('active')) {
    nextTab.click();
}

// make sure the header matches whichever tab ended up active
updateHeader(document.querySelector('.tab-btn.active').id.replace('tab-', ''));
