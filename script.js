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
        exercises.forEach(function(exercise) {
            // Create the card (same as before)
            const exerciseCard = document.createElement('div');
            exerciseCard.classList.add('exercise-card');
            exerciseCard.innerHTML = `
                <h3>${exercise.name}</h3>
                <p>Machine Position: ${exercise.machinePosition}</p>
                <p>Tips: ${exercise.tips}</p>
                <p>Starting Side: ${exercise.startingSide}</p>
                <p>Target Muscle: ${exercise.targetMuscle}</p>
                <p>Sets: ${exercise.sets}</p>
                <p>Reps: ${exercise.reps}</p>
                <p>Rest: ${exercise.rest}</p>
                <p>Current Weight: ${exercise.currentWeight}</p>
                <p>Current Reps: ${exercise.currentReps}</p>
                <p>Increase Weight By: ${exercise.increaseWeightBy}</p>
                <p>Go to Failure: ${exercise.goToFailure}</p>
                <button class="btn-edit">Edit</button>
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

    // set inner HTML (content inside the card)
    exerciseCard.innerHTML = `
        <h3>${exerciseNameValue}</h3>
        <p>Machine Position: </p>
        <p>Tips: </p>
        <p>Starting Side: </p>
        <p>Target Muscle: </p>
        <p>Sets: </p>
        <p>Reps: </p>
        <p>Rest: </p>
        <p>Current Weight: </p>
        <p>Current Reps: </p>
        <p>Increase Weight By: </p>
        <p>Go to Failure: </p>
        <button class="btn-edit">Edit</button>
    `

    const activeSection = document.querySelector('.workout-day.active');

    const exercisesList = activeSection.querySelector('.exercises-list');

    const emptyState = exercisesList.querySelector('.empty-state');
    if (emptyState) {
        emptyState.remove();
    }

    // add card to list
    exercisesList.appendChild(exerciseCard);

    // clear input field
    exerciseName.value = '';

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

    // save to localStorage
    localStorage.setItem('workoutData', JSON.stringify(workoutData));

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
            
            <label>Machine Position:</label>
            <input type="text" class="edit-input" data-field="machinePosition" value="${exercise.machinePosition}">

            <label>Tips:</label>
            <textarea class="edit-input" data-field="tips" rows="3">${exercise.tips}</textarea>

            <label>Starting Side:</label>
            <input type="text" class="edit-input" data-field="startingSide" value="${exercise.startingSide}">

            <label>Target Muscle:</label>
            <input type="text" class="edit-input" data-field="targetMuscle" value="${exercise.targetMuscle}">
            
            <label>Sets:</label>
            <input type="text" class="edit-input" data-field="sets" value="${exercise.sets}">
            
            <label>Reps:</label>
            <input type="text" class="edit-input" data-field="reps" value="${exercise.reps}">
            
            <label>Rest:</label>
            <input type="text" class="edit-input" data-field="rest" value="${exercise.rest}">
            
            <label>Current Weight:</label>
            <input type="text" class="edit-input" data-field="currentWeight" value="${exercise.currentWeight}">
            
            <label>Current Reps:</label>
            <input type="text" class="edit-input" data-field="currentReps" value="${exercise.currentReps}">
            
            <label>Increase Weight By:</label>
            <input type="text" class="edit-input" data-field="increaseWeightBy" value="${exercise.increaseWeightBy}">

            <label>Go to Failure:</label>
            <select class="edit-input" data-field="goToFailure">
                <option value="No" ${exercise.goToFailure === 'No' ? 'selected' : ''}>No</option>
                <option value="Yes" ${exercise.goToFailure === 'Yes' ? 'selected' : ''}>Yes</option>
            </select>

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
 });
