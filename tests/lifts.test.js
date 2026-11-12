// node tests/lifts.test.js
const assert = require('assert');
const L = require('../lifts.js');

const w = [
  ['125', 125], ['125 lbs', 125], ['125lb', 125], [' 42.5 ', 42.5],
  ['100/90', 100], ['100 / 90 / 80', 100], ['100/90lbs', 100],
  ['2x 45 1x 35 per side', 125], ['2x45 1x35 per side', 125],
  ['per side 2x45 1x35', 125], ['2 x 45, 1 x 35 lbs per side', 125],
  ['1x35 2x45 each side', 125], ['45 per side', 45], ['2x45 + 1x10 per side', 100],
  ['2x45 per side + bar', 90], ['2x45 per side machine', 90], ['4x2.5 per side', 10],
  ['*red*125*red*', 125],
  ['2x45 + 1x10/25 per side', 100], ['1x45 + 1x20 per side', 65], ['85 or 80', 80], ['47.5? after 42.5', 42.5], ['47.5 (one above 50)', 47.5], ['50 or above 42.5', 42.5], ['2x45', null],
  ['heavy', null],
  ['per side: 2x 45', 90], ['per side: 2x 45 1x 10', 100], ['per side: 1x 45 1x 35', 80],
  ['45 per side 3x8', null], ['3x10 per side', null], ['45 each side 2 sides', null], ['2 sides', null],
  ['2x45 side', null], ['5x45 per side', null], ['2x45 45 per side', null], ['', null], [null, null], ['per side', null],
];
for (const [inp, out] of w) assert.strictEqual(L.parseWeight(inp), out, 'parseWeight(' + JSON.stringify(inp) + ')');

assert.strictEqual(L.liftKey('Incline Dumbbell Press'), L.liftKey('Dumbbell Incline Bench Press'));
assert.strictEqual(L.liftKey('  incline   dumbbell PRESS '), 'incline dumbbell press');
assert.notStrictEqual(L.liftKey('Other Incline Dumbbell Press'), L.liftKey('Incline Dumbbell Press'));

assert.strictEqual(L.repsDone({ currentReps: '8', actualReps: '7-6-6' }), '7-6-6');
assert.strictEqual(L.repsDone({ currentReps: '8', actualReps: '' }), '8');
assert.strictEqual(L.repsDone({}), '');

// snapshotDay: done only, fallback to all
const day = [
  { name: 'Bench', currentWeight: '135', currentReps: '8', done: true },
  { name: 'Fly', currentWeight: '30', currentReps: '12', done: false },
  { name: '', currentWeight: '1', done: true },
];
assert.deepStrictEqual(L.snapshotDay(day, 'upperA').map(r => r.name), ['Bench']);
assert.deepStrictEqual(L.snapshotDay(day.map(e => ({ ...e, done: false })), 'upperA').map(r => r.name), ['Bench', 'Fly']);
assert.strictEqual(L.snapshotDay(day, 'upperA')[0].weight, 135);
assert.deepStrictEqual(L.snapshotDay(undefined, 'upperA'), []);
// alternatives: only the tapped one; legacy group (no didThis) keeps both
const alt = [
  { name: 'Leg Press', currentWeight: '300', done: true, altGroup: 'g', didThis: false },
  { name: 'Hack Squat', currentWeight: '200', done: true, altGroup: 'g', didThis: true },
  { name: 'Curl', currentWeight: '90', done: true },
];
assert.deepStrictEqual(L.snapshotDay(alt, 'lowerA').map(r => r.name), ['Hack Squat', 'Curl']);
assert.deepStrictEqual(L.snapshotDay(alt.map(e => ({ ...e, didThis: undefined })), 'lowerA').map(r => r.name), ['Leg Press', 'Hack Squat', 'Curl']);

// readExport
const exp = { workoutData: {
  upperA: [
    { name: 'Incline Dumbbell Press', currentWeight: '60', currentReps: '10', actualReps: '9-8-8', syncGroup: 's1' },
    { name: 'Row', currentWeight: '2x45 + 1x10/25 per side', currentReps: '8' },
    { name: 'Empty', currentWeight: '', currentReps: '' },
  ],
  upperB: [
    { name: 'Dumbbell Incline Bench Press', currentWeight: '60', currentReps: '10', actualReps: '9-8-8', syncGroup: 's1' },
    { name: 'Row', currentWeight: '100', currentReps: '8' },
  ],
  lowerA: [], lowerB: [] }, workoutHistory: [] };
const p = L.readExport('workout-data-2026-10-05.json', exp);
assert.strictEqual(p.date, '2026-10-05');
assert.strictEqual(p.rows.length, 3, 'synced dup collapsed, empty skipped, different Row kept');
assert.strictEqual(p.review.length, 0);
assert.strictEqual(p.rows[1].weight, 100);
assert.strictEqual(p.rows[0].reps, '9-8-8');
assert.throws(() => L.readExport('x.json', { foo: 1 }));
assert.strictEqual(L.exportDate('backup.json', { workoutHistory: [{ date: '2026-09-01T10:00:00Z' }, { date: '2026-09-03T10:00:00Z' }] }), '2026-09-03');
assert.throws(() => L.readExport('backup.json', { workoutData: { upperA: [] }, workoutHistory: [] }));

// mergeImports: idempotent, real entries untouched, newest first
const real = [{ date: '2026-10-07T18:00:00.000Z', workout: 'upperA' }, { date: '2026-09-29T18:00:00.000Z', workout: 'lowerA' }];
const e1 = L.importEntry('workout-data-2026-10-05.json', p);
let h = L.mergeImports(real, [e1]);
assert.strictEqual(h.length, 3);
assert.strictEqual(h[1].imported, true);
h = L.mergeImports(h, [L.importEntry('workout-data-2026-10-05.json', p)]);
assert.strictEqual(h.length, 3, 're-import replaces, no duplicate');
assert.deepStrictEqual(L.realWorkouts(h), real);
assert.strictEqual(new Date(e1.date).getDate(), 5);

// exportDate: UTC-named file shifts back to the local day of the last workout
const sunEve = new Date(2026, 9, 11, 19, 30).toISOString();   // Sun Oct 11, 7:30pm local
assert.strictEqual(L.exportDate('workout-data-2026-10-12.json', { workoutHistory: [{ date: sunEve }] }), '2026-10-11');
assert.strictEqual(L.exportDate('workout-data-2026-10-12.json', { workoutHistory: [{ date: new Date(2026, 9, 1, 10).toISOString() }] }), '2026-10-12');
assert.strictEqual(L.exportDate('workout-data-2026-10-12.json', { workoutHistory: [] }), '2026-10-12');

console.log('all lifts tests passed');
