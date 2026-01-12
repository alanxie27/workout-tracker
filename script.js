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

// Workout order for auto-progression
const workoutOrder = ['upperA', 'lowerA', 'upperB', 'lowerB'];

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
}

// Save completion data
function saveCompletionData() {
    localStorage.setItem('completionData', JSON.stringify(completionData));
}

// update tab checkmarks
function updateTabCheckmarks() {
    workoutOrder.forEach(day => {
        const tab = document.getElementById('tab-' + day);
        if (completionData[day]) {
            tab.classList.add('completed');
        } else {
            tab.classList.remove('completed');
        }
    });
}

// get next incomplete workout
function getNextIncompleteWorkout() {
    for (let day of workoutOrder) {
        if (!completionData[day]) {
            return day;
        }
    }
    // All complete - return first
    return 'upperA';
}

// parse color syntax and convert to html
function parseColorText(text) {
    if (!text) return '';

    // replace red, blue, yellow, orange with span tags
    let result = text;

    // Replace *red*text*red* with red span
    result = result.replace(/\*red\*(.*?)\*red\*/g, '<span style="color: #f44336;">$1</span>');

    // Replace *blue*text*blue* with blue span
    result = result.replace(/\*blue\*(.*?)\*blue\*/g, '<span style="color: #2196F3;">$1</span>');

    // Replace *yellow*text*yellow* with yellow span
    result = result.replace(/\*yellow\*(.*?)\*yellow\*/g, '<span style="color: #FFC107;">$1</span>');

    // Replace *orange*text*orange* with orange span
    result = result.replace(/\*orange\*(.*?)\*orange\*/g, '<span style="color: #FF8C00;">$1</span>');

    return result;
}

// special function to parse "Go to Failure" field with orange color for DROP SET
function parseGoToFailure(text) {
    if (!text) return '';

    // Make "DROP SET" orange in "Yes, also DROP SET!"
    if (text.includes('DROP SET')) {
        return text.replace('DROP SET', '<span style="color: #FF8C00;">DROP SET</span>');
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

//load data from localStorage when page loads
function loadWorkoutData() {
    const savedData = localStorage.getItem('workoutData');

    if (savedData) {
        workoutData = JSON.parse(savedData);
        renderAllExercises();
    }
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

        //render each exercise
        exercises.forEach(function(exercise, index) {
            // Create the card (same as before)
            const exerciseCard = document.createElement('div');
            exerciseCard.classList.add('exercise-card');
            exerciseCard.innerHTML = `
                <h3>${parseColorText(exercise.name)}</h3>
                <p><strong>Tips:</strong> ${parseColorText(exercise.tips)}</p>
                <p><strong>Target Muscle:</strong> ${parseColorText(exercise.targetMuscle)}</p>
                <p><strong>Machine Position:</strong> ${parseColorText(exercise.machinePosition)}</p>
                <p><strong>Starting Side:</strong> ${parseColorText(exercise.startingSide)}</p>
                <p><strong>Sets:</strong> ${parseColorText(exercise.sets)} <strong>Reps:</strong> ${parseColorText(exercise.reps)} <strong>Rest:</strong> ${parseColorText(exercise.rest)}</p>
                <p><strong>Increase Weight By:</strong> ${parseColorText(exercise.increaseWeightBy)}</p>
                <p><strong>Go to Failure:</strong> ${parseGoToFailure(exercise.goToFailure)}</p>
                <p><strong>Current Weight:</strong> ${parseColorText(exercise.currentWeight)}</p>
                <p><strong>Current Reps:</strong> ${parseColorText(exercise.currentReps)}</p>
                <button class="btn-arrow btn-up" data-day="${day}" data-index="${index}">↑</button>
                <button class="btn-arrow btn-down" data-day="${day}" data-index="${index}">↓</button>
                <button class="btn-quick-edit" data-day="${day}" data-index="${index}">⚡</button>
                <button class="btn-edit">Edit</button>
                <button class="btn-delete" data-day="${day}" data-index="${index}">Delete</button>
            `;

            exercisesList.appendChild(exerciseCard);

        });
    }
}

// call function when page loads
loadWorkoutData();

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
        
        targetSection.classList.add('active'); // Add 'active' class to the corresponding workout section
    });
  
});

addExerciseBtn.addEventListener('click', function() {
    const exerciseNameValue = exerciseName.value;

    if (exerciseNameValue.trim() === '') {
        alert("Please enter an exercise name!");
        return;
    }

    // create new div element for the exercise card
    const exerciseCard = document.createElement('div');

    // add exercise-card class to it
    exerciseCard.classList.add('exercise-card');

    const activeSection = document.querySelector('.workout-day.active');

    const exercisesList = activeSection.querySelector('.exercises-list');

    const emptyState = exercisesList.querySelector('.empty-state');
    if (emptyState) {
        emptyState.remove();
    }

    const activeSectionId = activeSection.id;

    const workoutDay = activeSectionId.replace('-section', '');

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
        increaseWeightBy: '',
        goToFailure: 'No'
    }

    // add to correct workout day array
    workoutData[workoutDay].push(exerciseObj);

    // Now get the correct index (after pushing to array)
    const exerciseIndex = workoutData[workoutDay].length - 1;

    // set inner HTML (content inside the card)
    exerciseCard.innerHTML = `
        <h3>${exerciseNameValue}</h3>
        <p><strong>Tips:</strong> </p>
        <p><strong>Target Muscle:</strong> </p>
        <p><strong>Machine Position:</strong> </p>
        <p><strong>Starting Side:</strong> </p>
        <p><strong>Sets:</strong>  <strong>Reps:</strong>  <strong>Rest:</strong> </p>
        <p><strong>Increase Weight By:</strong> </p>
        <p><strong>Go to Failure:</strong> </p>
        <p><strong>Current Weight:</strong> </p>
        <p><strong>Current Reps:</strong> </p>
        <button class="btn-arrow btn-up" data-day="${workoutDay}" data-index="${exerciseIndex}">↑</button>
        <button class="btn-arrow btn-down" data-day="${workoutDay}" data-index="${exerciseIndex}">↓</button>
        <button class="btn-quick-edit" data-day="${workoutDay}" data-index="${exerciseIndex}">⚡</button>
        <button class="btn-edit">Edit</button>
        <button class="btn-delete" data-day="${workoutDay}" data-index="${exerciseIndex}">Delete</button>
    `

    // add card to list
    exercisesList.appendChild(exerciseCard);

    // clear input field
    exerciseName.value = '';

    // save to localStorage
    localStorage.setItem('workoutData', JSON.stringify(workoutData));

    // After you clear the input field, add:
    addExerciseModal.classList.remove('active');


});

// event delegation for edit buttons
document.addEventListener('click', function(event) {
    if (event.target.classList.contains('btn-edit')) {
        const exerciseCard = event.target.closest('.exercise-card');

        const workoutSection = exerciseCard.closest('.workout-day');
        const sectionId = workoutSection.id;
        const workoutDay = sectionId.replace('-section', '');

        const exercisesList = workoutSection.querySelector('.exercises-list');
        const allCards = exercisesList.querySelectorAll('.exercise-card');
        let exerciseIndex = -1;

        allCards.forEach(function(card, index) {
            if (card === exerciseCard) {
                exerciseIndex = index;
            }
        });

        const exercise = workoutData[workoutDay][exerciseIndex];

        // replace card content with editable inputs
        exerciseCard.innerHTML = `
            <label>Exercise Name:</label>
            <input type="text" class="edit-input" data-field="name" value="${exercise.name}">

            <label>Tips:</label>
            <textarea class="edit-input" data-field="tips" rows="3">${exercise.tips}</textarea>

            <label>Target Muscle:</label>
            <input type="text" class="edit-input" data-field="targetMuscle" value="${exercise.targetMuscle}">

            <label>Machine Position:</label>
            <input type="text" class="edit-input" data-field="machinePosition" value="${exercise.machinePosition}">

            <label>Starting Side:</label>
            <input type="text" class="edit-input" data-field="startingSide" value="${exercise.startingSide}">

            <label>Sets:</label>
            <input type="text" class="edit-input" data-field="sets" value="${exercise.sets}">

            <label>Reps:</label>
            <input type="text" class="edit-input" data-field="reps" value="${exercise.reps}">

            <label>Rest:</label>
            <input type="text" class="edit-input" data-field="rest" value="${exercise.rest}">

            <label>Increase Weight By:</label>
            <input type="text" class="edit-input" data-field="increaseWeightBy" value="${exercise.increaseWeightBy}">

            <label>Go to Failure:</label>
            <select class="edit-input" data-field="goToFailure">
                <option value="No" ${exercise.goToFailure === 'No' ? 'selected' : ''}>No</option>
                <option value="Yes" ${exercise.goToFailure === 'Yes' ? 'selected' : ''}>Yes</option>
                <option value="Yes, also DROP SET!" ${exercise.goToFailure === 'Yes, also DROP SET!' ? 'selected' : ''}>Yes, also DROP SET!</option>
            </select>

            <label>Current Weight:</label>
            <input type="text" class="edit-input" data-field="currentWeight" value="${exercise.currentWeight}">

            <label>Current Reps:</label>
            <input type="text" class="edit-input" data-field="currentReps" value="${exercise.currentReps}">

            <button class="btn-save" data-day="${workoutDay}" data-index="${exerciseIndex}">Save</button>
            <button class="btn-cancel">Cancel</button>
        `;
    }

    if (event.target.classList.contains('btn-save')) {
        const dataDay = event.target.dataset.day;
        const dataIndex = event.target.dataset.index;
        const exerciseCard = event.target.closest('.exercise-card');

        const nameInput = exerciseCard.querySelector('.edit-input');
        const newName = nameInput.value.trim();

        if (newName === '') {
            alert('Exercise name cannot be empty!');
            return;
        }

        const inputs = exerciseCard.querySelectorAll('.edit-input');

        //loop through each input
        inputs.forEach(function(input) {
            const field = input.dataset.field;
            const value = input.value.trim();

            workoutData[dataDay][dataIndex][field] = value;

        });

        // save to storage
        localStorage.setItem('workoutData', JSON.stringify(workoutData));

        // sync with paired workout day
        const pairedDay = getPairedWorkoutDay(dataDay);

        if (pairedDay) {
            const exerciseName = workoutData[dataDay][dataIndex].name;

             // Find exercise with same name in paired day
            const pairedExercises = workoutData[pairedDay];

            pairedExercises.forEach(function(exercise, index) {
                if (exercise.name === exerciseName) {
                    //copy all fields except name
                    exercise.machinePosition = workoutData[dataDay][dataIndex].machinePosition;
                    exercise.tips = workoutData[dataDay][dataIndex].tips;
                    exercise.targetMuscle = workoutData[dataDay][dataIndex].targetMuscle;
                    exercise.sets = workoutData[dataDay][dataIndex].sets;
                    exercise.reps = workoutData[dataDay][dataIndex].reps;
                    exercise.rest = workoutData[dataDay][dataIndex].rest;
                    exercise.currentWeight = workoutData[dataDay][dataIndex].currentWeight;
                    exercise.currentReps = workoutData[dataDay][dataIndex].currentReps;
                    exercise.increaseWeightBy = workoutData[dataDay][dataIndex].increaseWeightBy;
                    exercise.goToFailure = workoutData[dataDay][dataIndex].goToFailure;
                }
            });

             // Save again after syncing
            localStorage.setItem('workoutData', JSON.stringify(workoutData));
        }

        // clear all exercise lists
        workoutSections.forEach(function(section) {
        const list = section.querySelector('.exercises-list');
        list.innerHTML = '<p class="empty-state">No exercises added yet.</p>';
        });

        // Then re-render from data
        renderAllExercises();

    }

    if (event.target.classList.contains('btn-cancel')) {
        // Clear all lists and re-render (discards unsaved changes)
        workoutSections.forEach(function(section) {
            const list = section.querySelector('.exercises-list');
            list.innerHTML = '<p class="empty-state">No exercises added yet.</p>';
        });
        
        renderAllExercises();
    }

    if (event.target.classList.contains('btn-delete')) {
        const workoutDay = event.target.dataset.day;
        const exerciseIndex = event.target.dataset.index;

        // confirm 
        if (confirm('Are you sure you want to delete this exercise?')) {

            //remove exercise from array
            workoutData[workoutDay].splice(exerciseIndex, 1);

            // Save to localStorage
            localStorage.setItem('workoutData', JSON.stringify(workoutData));

            //re-render
            workoutSections.forEach(function(section) {
                const list = section.querySelector('.exercises-list');
                list.innerHTML = '<p class="empty-state">No exercises added yet.</p>';
            });

            renderAllExercises();
        }

        
        
    }

    if (event.target.classList.contains('btn-up')) {
        const workoutDay = event.target.dataset.day;
        const currentIndex = parseInt(event.target.dataset.index);

        if (currentIndex === 0) return;

        const exercises = workoutData[workoutDay];
        const temp = exercises[currentIndex];
        exercises[currentIndex] = exercises[currentIndex - 1];
        exercises[currentIndex - 1] = temp;

        // Save and re-render
        localStorage.setItem('workoutData', JSON.stringify(workoutData));
        
        workoutSections.forEach(function(section) {
            const list = section.querySelector('.exercises-list');
            list.innerHTML = '<p class="empty-state">No exercises added yet.</p>';
        });
        
        renderAllExercises();
    }

    if (event.target.classList.contains('btn-down')) {
        const workoutDay = event.target.dataset.day;
        const currentIndex = parseInt(event.target.dataset.index);
        
        const exercises = workoutData[workoutDay];
        
        // Can't move down if already at bottom
        if (currentIndex === exercises.length - 1) return;
        
        // Swap with next exercise
        const temp = exercises[currentIndex];
        exercises[currentIndex] = exercises[currentIndex + 1];
        exercises[currentIndex + 1] = temp;
        
        // Save and re-render
        localStorage.setItem('workoutData', JSON.stringify(workoutData));
        
        workoutSections.forEach(function(section) {
            const list = section.querySelector('.exercises-list');
            list.innerHTML = '<p class="empty-state">No exercises added yet.</p>';
        });
        
        renderAllExercises();
    }

    // quick edit
    if (event.target.classList.contains('btn-quick-edit')) {
        const workoutDay = event.target.dataset.day;
        const exerciseIndex = event.target.dataset.index;
        
        // Get the exercise card and data
        const exerciseCard = event.target.closest('.exercise-card');
        const exercise = workoutData[workoutDay][exerciseIndex];

        // replace card content with quick edit inputs
        exerciseCard.innerHTML = `
        <h3>${exercise.name}</h3>
        <h2 style="margin-top: 20px;"><strong>Quick Update</strong></h2>
        
        <label>Current Weight:</label>
        <input type="text" class="edit-input" id="quick-weight" value="${exercise.currentWeight}">
        
        <label>Current Reps:</label>
        <input type="text" class="edit-input" id="quick-reps" value="${exercise.currentReps}">
        
        <button class="btn-save-quick" data-day="${workoutDay}" data-index="${exerciseIndex}">Save</button>
        <button class="btn-cancel">Cancel</button>
        `;

        //auto focus on reps
        const repsInput = document.getElementById('quick-reps');
        repsInput.focus();
        repsInput.setSelectionRange(repsInput.value.length, repsInput.value.length);
    }

    // save quick edit
    if (event.target.classList.contains('btn-save-quick')) {
        const workoutDay = event.target.dataset.day;
        const exerciseIndex = event.target.dataset.index;
        
        // Get the input values
        const quickWeight = document.getElementById('quick-weight').value.trim();
        const quickReps = document.getElementById('quick-reps').value.trim();

        // Update only these two fields
        workoutData[workoutDay][exerciseIndex].currentWeight = quickWeight;
        workoutData[workoutDay][exerciseIndex].currentReps = quickReps;
        
        // Sync with paired workout day (if same-named exercise exists)
        const pairedDay = getPairedWorkoutDay(workoutDay);

        if (pairedDay) {
            const exerciseName = workoutData[workoutDay][exerciseIndex].name;
            const pairedExercises = workoutData[pairedDay];

            pairedExercises.forEach(function(exercise) {
                if (exercise.name === exerciseName) {
                exercise.currentWeight = quickWeight;
                exercise.currentReps = quickReps;
                }
            });
        }

        // Save to localStorage
        localStorage.setItem('workoutData', JSON.stringify(workoutData));
        
        // Re-render
        workoutSections.forEach(function(section) {
            const list = section.querySelector('.exercises-list');
            list.innerHTML = '<p class="empty-state">No exercises added yet.</p>';
        });
        
        renderAllExercises();

    
    }

 });

 // select export button
 const exportBtn = document.getElementById('exportBtn');

 // export data functionality
 exportBtn.addEventListener('click', function() {

    // Create complete export with all data
    const completeData = {
        workoutData: workoutData,
        completionData: completionData,
        workoutHistory: workoutHistory
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

                    // Save all to localStorage
                    localStorage.setItem('workoutData', JSON.stringify(workoutData));
                    localStorage.setItem('completionData', JSON.stringify(completionData));
                    localStorage.setItem('workoutHistory', JSON.stringify(workoutHistory));

                    // Update UI
                    updateTabCheckmarks();

                    // Clear and re-render
                    workoutSections.forEach(function(section) {
                        const list = section.querySelector('.exercises-list');
                        list.innerHTML = '<p class="empty-state">No exercises added yet.</p>';
                    });

                    renderAllExercises();

                    alert('Data imported successfully with history and streaks!');
                }
                // Check if it's the old format (just workout data)
                else if (importedData.upperA && importedData.upperB &&
                    importedData.lowerA && importedData.lowerB) {

                    // Old format - import just workout data
                    workoutData = importedData;

                    // Save to localStorage
                    localStorage.setItem('workoutData', JSON.stringify(workoutData));

                    // Clear and re-render
                    workoutSections.forEach(function(section) {
                        const list = section.querySelector('.exercises-list');
                        list.innerHTML = '<p class="empty-state">No exercises added yet.</p>';
                    });

                    renderAllExercises();

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

const darkModeToggle = document.getElementById('darkModeToggle');

// apply dark mode on default
document.body.classList.add('dark-mode');

const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'light') {
    document.body.classList.remove('dark-mode');
    darkModeToggle.textContent = '🌙';
}

// toggle dark mode on button click
darkModeToggle.addEventListener('click', function() {
    document.body.classList.toggle('dark-mode');

    // Update button icon
    if (document.body.classList.contains('dark-mode')) {
        darkModeToggle.textContent = '☀️';
        localStorage.setItem('theme', 'dark');
    } else {
        darkModeToggle.textContent = '🌙';
        localStorage.setItem('theme', 'light');
    }

});

// add exercise moda controls
const showAddModal = document.getElementById('showAddModal');
const addExerciseModal = document.getElementById('addExerciseModal');
const closeModal = document.getElementById('closeModal');

showAddModal.addEventListener('click', function() {
    addExerciseModal.classList.add('active');
    document.getElementById('exerciseName').focus();
});

closeModal.addEventListener('click', function() {
    addExerciseModal.classList.remove('active');
    // Clear input field
    document.getElementById('exerciseName').value = '';
});

addExerciseModal.addEventListener('click', function(event) {
    // event.target is what was clicked
    // If they clicked the dark overlay (not the white box), close it
    if (event.target === addExerciseModal) {
        addExerciseModal.classList.remove('active');
        document.getElementById('exerciseName').value = '';
    }
});

// load completion data andswitch to next incomplete workout
loadCompletionData();

// auto-switch to next incomplete workout on page load
const nextWorkout = getNextIncompleteWorkout();
const nextTab = document.getElementById('tab-' + nextWorkout);
if (nextTab && !nextTab.classList.contains('active')) {
    // trigger click on next incomplete workout tab
    nextTab.click();
}

// Complete Workout button handlers
document.addEventListener('click', function(event) {
    if (event.target.classList.contains('btn-complete-workout')) {
        const workoutDay = event.target.dataset.day;
        const currentDate = new Date().toISOString();
        
        // Find index of completed workout
        const completedIndex = workoutOrder.indexOf(workoutDay);
        
        // Auto-complete everything BEFORE this workout in the sequence
        for (let i = 0; i <= completedIndex; i++) {
            completionData[workoutOrder[i]] = currentDate;
        }

        // Add to history
        addToHistory(workoutDay);
        
        saveCompletionData();
        updateTabCheckmarks();
        
        // Check if all workouts are complete
        const allComplete = workoutOrder.every(day => completionData[day]);
        
        if (allComplete) {
            alert('🎉 Week Complete! All workouts done. Great job!');
            // Stay on current tab
        } else {
            // Find next incomplete workout
            const nextIndex = (completedIndex + 1) % workoutOrder.length;
            const nextDay = workoutOrder[nextIndex];
            
            // Switch to next tab
            const nextTabBtn = document.getElementById('tab-' + nextDay);
            if (nextTabBtn) {
                nextTabBtn.click();
            }
            
            alert('✓ Workout completed! Moving to next workout.');
        }
    }
});


// Workout History Tracking
let workoutHistory = [];

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

        // Check if all 4 workout types were completed
        const workoutTypes = new Set(workoutsThisWeek.map(w => w.workout));

        if (workoutTypes.has('upperA') && workoutTypes.has('lowerA') &&
            workoutTypes.has('upperB') && workoutTypes.has('lowerB')) {
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

// History Modal Controls
const showHistoryModal = document.getElementById('showHistoryModal');
const historyModal = document.getElementById('historyModal');
const closeHistoryModal = document.getElementById('closeHistoryModal');

showHistoryModal.addEventListener('click', function() {
    renderHistory();
    historyModal.classList.add('active');
});

closeHistoryModal.addEventListener('click', function() {
    historyModal.classList.remove('active');
});

// Close history modal when clicking outside
historyModal.addEventListener('click', function(event) {
    if (event.target === historyModal) {
        historyModal.classList.remove('active');
    }
});

// Load history on page load
loadWorkoutHistory();

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
