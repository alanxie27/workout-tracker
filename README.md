# Workout Tracker

A progressive web application for tracking Upper/Lower body split workouts. Built with vanilla HTML, CSS, and JavaScript with local storage persistence.

## Features

### Core Functionality
- **4-Day Upper/Lower Split** - Organized workout rotation (Upper A, Lower A, Upper B, Lower B)
- **Exercise Management** - Add, edit, delete, and reorder exercises
- **Quick Edit Mode** - Rapidly update current weight and reps with ⚡ button
- **Progress Tracking** - Track current weight, reps, sets, rest periods, and weight progression
- **Workout Completion** - Mark workouts complete and auto-advance to next workout
- **Exercise Pairing** - Sync common exercises between Upper A/B and Lower A/B automatically

### Data Management
- **Local Storage Persistence** - All data saved automatically in browser
- **Export/Import** - Backup and restore workout data, history, and streaks as JSON
- **Backward Compatibility** - Imports both old (workout data only) and new format (includes history)

### Tracking & History
- **Workout History** - Complete calendar view of all completed workouts
- **Streak Counter** - Track consecutive weeks of completing all 4 workouts
- **Monthly Stats** - See total workouts completed in current month
- **Visual Calendar** - Days with workouts highlighted in gold

### User Experience
- **Dark Mode** - Toggle between light and dark themes (remembers preference)
- **Mobile Optimized** - Fully responsive design for phone, tablet, and desktop
- **Color Syntax** - Add colored text in tips/notes with `*red*text*red*`, `*blue*text*blue*`, etc.
- **Tab Checkmarks** - Visual indicators show completed workouts for the week
- **Auto-progression** - Automatically switches to next incomplete workout

### Exercise Details
Each exercise tracks:
- Exercise name
- Tips and form cues
- Target muscle
- Machine position
- Starting side (for unilateral exercises)
- Sets, reps, and rest periods
- Weight progression guidelines
- Go to failure flag (with DROP SET support)
- Current weight and rep performance

## Technology Stack

- **HTML5** - Semantic markup with extensive educational comments
- **CSS3** - Custom properties, flexbox, grid, responsive design
- **Vanilla JavaScript** - No frameworks, pure ES6+
- **Local Storage API** - Client-side data persistence
- **Progressive Web App** - Can be installed on iOS/Android home screen

## Installation

### Desktop
1. Open `index.html` in a web browser
2. Or serve with any local server:
   ```bash
   python3 -m http.server 8000
   ```

### Mobile (iOS)
1. Open the app in Safari
2. Tap the Share button
3. Select "Add to Home Screen"
4. The app will appear as "Workout Tracker" on your home screen

## Usage

### Adding Exercises
1. Click the gold `+` button (bottom right)
2. Enter exercise name
3. Click "Add Exercise"
4. Use "Edit" button to fill in all exercise details

### Completing Workouts
1. Navigate to your current workout tab
2. Update weights/reps as you complete exercises
3. Click "✓ Complete [Workout]" button when done
4. App auto-advances to next workout in sequence

### Quick Updates
- Use the purple ⚡ (lightning) button for rapid weight/rep updates
- Regular "Edit" button for full exercise editing
- Up/down arrows to reorder exercises

### Viewing History
1. Click the 📅 calendar button (bottom left)
2. View streak and monthly stats
3. Navigate between months with ◄ ► buttons
4. Days with workouts are highlighted in gold
5. Today's date has a gold border

### Backup & Restore
- **Export**: Downloads JSON file with all data, history, and streaks
- **Import**: Restores from JSON backup file
- Files are named `workout-data-YYYY-MM-DD.json`

## Data Structure

All data is stored in browser `localStorage` with three main objects:

### workoutData
```json
{
  "upperA": [{ exercise objects }],
  "lowerA": [{ exercise objects }],
  "upperB": [{ exercise objects }],
  "lowerB": [{ exercise objects }]
}
```

### completionData
```json
{
  "upperA": "2026-01-12T10:30:00.000Z",
  "lowerA": null,
  "upperB": null,
  "lowerB": null,
  "weekStart": "2026-01-06T00:00:00.000Z"
}
```

### workoutHistory
```json
[
  {
    "date": "2026-01-12T10:30:00.000Z",
    "workout": "upperA"
  }
]
```

## Mobile Optimizations

The app includes extensive mobile-specific styling:
- Responsive button sizing and positioning
- Flexbox reordering (buttons above titles on mobile)
- Text wrapping and overflow prevention
- Touch-friendly button targets
- Optimized calendar grid for small screens
- Scrollable modals with proper viewport handling

## Browser Compatibility

- Chrome/Edge (latest)
- Safari (latest)
- Firefox (latest)
- Mobile Safari (iOS 12+)
- Chrome Mobile (Android 6+)

## File Structure

```
workout-tracker/
├── index.html          # Main HTML with teaching comments
├── style.css          # Styling with CSS variable system
├── script.js          # Core functionality
├── CLAUDE.md          # Development guidelines
└── README.md          # This file
```

## Development Notes

- Code includes extensive educational comments
- CSS uses custom properties (CSS variables) for theming
- Follows semantic HTML principles
- Mobile-first responsive design approach
- No external dependencies or frameworks

## Future Enhancements

Potential features to add:
- Exercise templates/library
- Rest timer between sets
- Workout duration tracking
- Charts and progress graphs
- Exercise notes/PR tracking
- Exercise video links
- Custom workout templates

## License

Personal project - free to use and modify.