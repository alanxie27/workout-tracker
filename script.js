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
