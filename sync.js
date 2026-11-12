// ============================================================
// SYNC: keeps your workout data in Supabase so phone and laptop match
//
// How it works, in plain words:
//
//  - The app still reads and writes the browser's own storage first, exactly
//    as before. That is why it stays instant and works with no signal.
//  - Every time the app saves one of the five data blobs below, this file
//    notes "that one has a change the server has not seen" and uploads it a
//    moment later.
//  - When the app opens or comes back into view, this file asks the server
//    for its copies. If another device changed something, the newer copy is
//    saved here and the page reloads to show it.
//
// Each blob on the server carries a version number that goes up by one per
// upload. An upload says "replace version 7 with my copy". If the server is
// already on version 8, some other device got there first and the upload is
// refused. The server's copy then wins, and this device's copy is set aside
// under a `backup:` key instead of being thrown away. Without that check the
// laptop, opened on Monday with last week's data, would quietly overwrite
// what the phone logged on Sunday.
//
// Loaded before script.js. script.js calls Sync.save() wherever it used to
// call localStorage.setItem() for these five keys.
// ============================================================

(function () {
    'use strict';

    // Cameron's Supabase project: one account for the planner, the hub and this.
    // The key is the publishable one, meant to be public. What protects the
    // data is row-level security: the database only hands a row to its owner.
    const SUPABASE_URL = 'https://nbfniqqdgvvzqoyscboe.supabase.co';
    const SUPABASE_KEY = 'sb_publishable_FZcIiaGsOpfYL869-hGxcg_Uiv2Rve6';

    // The five blobs that sync. `theme` stays per-device on purpose.
    const KEYS = ['workoutData', 'completionData', 'workoutHistory', 'appSettings', 'splitHistory'];
    const META_KEY = 'sync:meta';
    const PUSH_DELAY_MS = 700;      // wait for a burst of saves to settle
    const PULL_THROTTLE_MS = 10000; // focus events fire in clumps

    // ---------- embed mode (shown inside the Life OS hub) ----------
    // The hub loads this page as ?embed=1. The header here holds real content
    // (week, day, streak), so nothing is hidden; it only loses the extra top
    // space meant for a phone's status bar. Remembered for the tab so it
    // survives the reloads sync does.
    try {
        if (new URLSearchParams(location.search).get('embed') === '1') sessionStorage.setItem('embed', '1');
        if (sessionStorage.getItem('embed') === '1') document.documentElement.classList.add('embed');
    } catch (e) { /* storage blocked: the page still works, just with normal spacing */ }

    // ---------- bookkeeping kept on this device ----------
    // { user: <id>, pulled: <bool>, keys: { workoutData: { v: 7, dirty: false }, ... } }
    //   v      the server version this device last saw (0 = never on the server)
    //   dirty  this device has a change the server has not accepted yet
    //   pulled this device has compared itself with the server at least once
    function loadMeta() {
        try {
            const m = JSON.parse(localStorage.getItem(META_KEY));
            if (m && typeof m === 'object' && m.keys) return m;
        } catch (e) { /* fall through to a fresh one */ }
        return { user: null, pulled: false, keys: {} };
    }
    let meta = loadMeta();
    function saveMeta() { localStorage.setItem(META_KEY, JSON.stringify(meta)); }
    function keyMeta(k) { return meta.keys[k] || (meta.keys[k] = { v: 0, dirty: false }); }

    // ---------- state shown in the header chip ----------
    let client = null;
    let user = null;
    let phase = 'starting';   // starting | signedOut | syncing | synced | pending | error
    let detail = '';          // one line for the sheet, in plain words
    let notice = '';          // a conflict message that should stay until read
    let lastSyncedAt = null;

    function setPhase(p, d) { phase = p; detail = d || ''; render(); }
    function anyDirty() { return KEYS.some(function (k) { return keyMeta(k).dirty; }); }

    // ---------- the save hook script.js calls ----------
    function save(key, jsonString) {
        localStorage.setItem(key, jsonString);
        if (KEYS.indexOf(key) === -1) return;
        keyMeta(key).dirty = true;
        saveMeta();
        if (user) { if (phase !== 'error') setPhase('pending'); schedulePush(); }
    }

    // ---------- upload ----------
    let pushTimer = null;
    let working = Promise.resolve(); // one network job at a time, in order
    function enqueue(job) { working = working.then(job, job); return working; }

    function schedulePush() {
        clearTimeout(pushTimer);
        pushTimer = setTimeout(function () { enqueue(pushDirty); }, PUSH_DELAY_MS);
    }

    async function pushDirty() {
        // A device that has never compared itself with the server does not
        // upload. Its storage may hold nothing but first-run defaults, and
        // those must not replace real data. pull() runs first and decides.
        if (!client || !user || !meta.pulled) return;
        let conflict = false;
        for (const k of KEYS) {
            const m = keyMeta(k);
            if (!m.dirty) continue;
            const sent = localStorage.getItem(k);
            if (sent === null) { m.dirty = false; continue; }
            let value;
            try { value = JSON.parse(sent); } catch (e) { m.dirty = false; continue; }

            let ok = false;
            if (m.v === 0) {
                // Never on the server: create it. "23505" is the database saying
                // the row already exists, meaning another device created it first.
                const res = await client.from('state').insert({ key: k, value: value, version: 1 });
                if (res.error && res.error.code === '23505') { conflict = true; continue; }
                if (res.error) return fail(res.error);
                ok = true;
            } else {
                // Replace version m.v, and only that version. No row coming back
                // means the server has moved on: another device got there first.
                const res = await client.from('state')
                    .update({ value: value, version: m.v + 1 })
                    .eq('key', k).eq('version', m.v).select('version');
                if (res.error) return fail(res.error);
                if (!res.data || res.data.length === 0) { conflict = true; continue; }
                ok = true;
            }
            if (ok) {
                m.v += 1;
                // Still dirty if the app saved again while this upload was in the air.
                m.dirty = localStorage.getItem(k) !== sent;
                saveMeta();
            }
        }
        if (conflict) return pull(true);
        if (anyDirty()) { schedulePush(); return; }
        lastSyncedAt = new Date();
        setPhase('synced');
    }

    function fail(error) {
        // Loud on purpose. A failed save that looks like a successful one is
        // how data goes missing without anyone noticing.
        const offline = !navigator.onLine || /fetch|network/i.test(String(error && error.message));
        setPhase('error', offline
            ? 'No connection. Your changes are saved on this device and will upload when it is back.'
            : 'Could not sync: ' + ((error && error.message) || 'unknown error'));
    }

    // ---------- comparing two copies ----------
    // The database stores each blob with its fields in its own order, so the
    // same data comes back as different text. Comparing text would call two
    // identical copies different. This rewrites both with fields sorted first.
    function canon(v) {
        if (Array.isArray(v)) return v.map(canon);
        if (v && typeof v === 'object') {
            const o = {};
            Object.keys(v).sort().forEach(function (k) { o[k] = canon(v[k]); });
            return o;
        }
        return v;
    }
    function same(localText, serverValue) {
        if (localText === null) return false;
        try { return JSON.stringify(canon(JSON.parse(localText))) === JSON.stringify(canon(serverValue)); }
        catch (e) { return false; }
    }
    // The blobs that hold what you logged. Losing one of these to the server's
    // copy is worth telling you about; the others rebuild themselves.
    const PRECIOUS = ['workoutData', 'workoutHistory'];

    // ---------- download ----------
    let lastPullAt = 0;
    let retryTimer = null;

    function requestPull() {
        if (!client || !user) return;
        if (Date.now() - lastPullAt < PULL_THROTTLE_MS) return;
        enqueue(function () { return pull(false); });
    }

    async function pull(afterConflict) {
        if (!client || !user) return;
        lastPullAt = Date.now();
        if (phase !== 'pending') setPhase('syncing');

        const res = await client.from('state').select('key, value, version');
        if (res.error) return fail(res.error);
        const remote = {};
        (res.data || []).forEach(function (row) { remote[row.key] = row; });

        // Work out what would change before touching anything.
        const incoming = [];   // server copies to save here
        const setAside = [];   // local copies that lose to the server
        const firstPull = !meta.pulled;
        for (const k of KEYS) {
            const r = remote[k];
            const m = keyMeta(k);
            const local = localStorage.getItem(k);
            if (!r) {
                // Not on the server yet. Whatever is here goes up.
                if (local !== null) m.dirty = true;
                m.v = 0;
                continue;
            }
            const serverCopy = JSON.stringify(r.value);
            const identical = same(local, r.value);
            if (firstPull) {
                // New device or new sign-in: the server's copy is the real one.
                // If this device already held real data of its own (say, an
                // import done before signing in), say so instead of swapping
                // it out quietly.
                if (local !== null && !identical) setAside.push([k, local, m.dirty && PRECIOUS.indexOf(k) !== -1]);
                incoming.push([k, serverCopy, r.version, identical]);
            } else if (r.version !== m.v) {
                // Another device uploaded since this one last looked. If both
                // ended up with the same data (both rolled over to the new
                // week, for instance) nothing was lost and nothing is said.
                if (m.dirty && local !== null && !identical) setAside.push([k, local, true]);
                incoming.push([k, serverCopy, r.version, identical]);
            }
        }

        const changesScreen = incoming.some(function (c) { return !c[3]; });
        if (changesScreen && document.querySelector('.modal.active:not(#syncSheet)')) {
            // A sheet is open, maybe with half-typed numbers in it. Saving the
            // server's copy now and reloading would lose them, and saving
            // without reloading would let the open sheet write stale data back
            // over it. So change nothing and try again shortly.
            clearTimeout(retryTimer);
            retryTimer = setTimeout(function () { lastPullAt = 0; requestPull(); }, 5000);
            setPhase('pending', 'Newer data from another device is waiting. It loads when you close this sheet.');
            return;
        }

        let lostRealEdit = false;
        setAside.forEach(function (s) {
            try { localStorage.setItem('backup:' + s[0], JSON.stringify({ at: new Date().toISOString(), value: s[1] })); }
            catch (e) { /* storage full: the server keeps daily copies too */ }
            if (s[2]) lostRealEdit = true;
        });
        incoming.forEach(function (c) {
            // An identical copy keeps this device's own text, so the running
            // page and its storage still match and no reload is needed.
            if (!c[3]) localStorage.setItem(c[0], c[1]);
            meta.keys[c[0]] = { v: c[2], dirty: false };
        });
        meta.pulled = true;
        meta.user = user.id;
        saveMeta();

        if (lostRealEdit) {
            try { sessionStorage.setItem('sync:notice', 'Your account already had newer data, so that copy was kept. What this device had was set aside on this device, not deleted. If it was the copy you wanted, do not clear this browser and ask for it to be restored.'); } catch (e) { /* shown this once only */ }
        }
        if (changesScreen) {
            // script.js holds everything in memory and only reads storage at
            // startup, so the simplest correct way to show new data is to start over.
            location.reload();
            return;
        }
        if (anyDirty()) return pushDirty();
        lastSyncedAt = new Date();
        setPhase('synced');
    }

    // ---------- sign in / out ----------
    async function signIn(email, password) {
        const res = await client.auth.signInWithPassword({ email: email, password: password });
        if (res.error) return res.error.message === 'Invalid login credentials'
            ? 'Wrong email or password.' : res.error.message;
        return null;
    }

    function onSession(session) {
        const next = session ? session.user : null;
        if (!next) { user = null; setPhase('signedOut'); return; }
        if (user && user.id === next.id) return; // token refresh, nothing new
        user = next;
        if (meta.user && meta.user !== user.id) {
            // A different account on this device: start its bookkeeping over.
            meta = { user: user.id, pulled: false, keys: {} };
            saveMeta();
        }
        lastPullAt = 0;
        enqueue(function () { return pull(false); });
    }

    // ---------- UI: header chip + sheet ----------
    const LABEL = {
        starting: 'Sync…', signedOut: 'Sign in', syncing: 'Syncing…',
        synced: 'Synced', pending: 'Saving…', error: 'Not synced'
    };
    let chip, sheet, body;

    function buildUi() {
        const actions = document.querySelector('.header-actions');
        if (!actions) return;
        chip = document.createElement('button');
        chip.id = 'syncChip';
        chip.type = 'button';
        chip.className = 'sync-chip';
        // role=status: a screen reader announces "Not synced" when it appears.
        chip.innerHTML = '<span class="sync-dot" aria-hidden="true"></span><span role="status" id="syncChipText"></span>';
        actions.insertBefore(chip, actions.firstChild);

        sheet = document.createElement('div');
        sheet.id = 'syncSheet';
        sheet.className = 'modal';
        sheet.innerHTML = '<div class="sheet" role="dialog" aria-modal="true" aria-labelledby="syncTitle">' +
            '<div class="sheet-grab"></div><h2 id="syncTitle">Sync</h2><div id="syncBody"></div>' +
            '<button type="button" id="syncClose" class="btn-ghost btn-close-sheet">Close</button></div>';
        document.querySelector('main').appendChild(sheet);
        body = sheet.querySelector('#syncBody');

        chip.addEventListener('click', function () { sheet.classList.add('active'); render(); });
        sheet.querySelector('#syncClose').addEventListener('click', closeSheet);
        sheet.addEventListener('click', function (e) { if (e.target === sheet) closeSheet(); });
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && sheet.classList.contains('active')) closeSheet();
        });
    }
    function closeSheet() { sheet.classList.remove('active'); chip.focus(); }

    function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

    function render() {
        if (!chip) return;
        chip.dataset.phase = notice && phase !== 'error' ? 'notice' : phase;
        chip.querySelector('#syncChipText').textContent = notice && phase === 'synced' ? 'Synced · read me' : LABEL[phase];
        if (!sheet.classList.contains('active')) return;
        // Do not rebuild the sign-in form under someone typing in it.
        if (phase === 'signedOut' && body.querySelector('#syncForm')) return;

        if (!client) {
            body.innerHTML = '<p class="sync-note" role="alert">Sync could not start, so nothing leaves this device. Everything still saves here.</p>';
            return;
        }
        if (phase === 'signedOut' || phase === 'starting') {
            body.innerHTML =
                '<p class="sync-note">Sign in to keep this device and your others in step. Same email and password as Cameron. Until you do, everything saves on this device only.</p>' +
                '<form id="syncForm">' +
                '<div class="field"><label class="f-label" for="syncEmail">Email</label><input class="sheet-input" id="syncEmail" type="email" autocomplete="username" required></div>' +
                '<div class="field"><label class="f-label" for="syncPassword">Password</label><input class="sheet-input" id="syncPassword" type="password" autocomplete="current-password" required></div>' +
                '<p id="syncError" class="sync-error" role="alert" hidden></p>' +
                '<button type="submit" class="btn-secondary sync-wide">Sign in</button></form>';
            body.querySelector('#syncForm').addEventListener('submit', async function (e) {
                e.preventDefault();
                const btn = e.target.querySelector('button');
                const err = body.querySelector('#syncError');
                btn.disabled = true; btn.textContent = 'Signing in…'; err.hidden = true;
                const message = await signIn(body.querySelector('#syncEmail').value.trim(), body.querySelector('#syncPassword').value);
                if (message) { err.textContent = message; err.hidden = false; btn.disabled = false; btn.textContent = 'Sign in'; }
            });
            return;
        }
        const line = {
            syncing: 'Checking with the server…',
            pending: detail || 'Uploading your latest changes…',
            synced: 'Everything is saved to your account' + (lastSyncedAt ? ' as of ' + lastSyncedAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) + '.' : '.'),
            error: detail
        }[phase] || '';
        body.innerHTML =
            '<p class="sync-note">Signed in as <strong>' + esc(user ? (user.email || '') : '') + '</strong></p>' +
            (notice ? '<p class="sync-error" role="alert">' + esc(notice) + '</p>' : '') +
            '<p class="' + (phase === 'error' ? 'sync-error' : 'sync-note') + '"' + (phase === 'error' ? ' role="alert"' : '') + '>' + esc(line) + '</p>' +
            '<div class="backup-row">' +
            (phase === 'error' ? '<button type="button" id="syncRetry" class="btn-secondary">Try again</button>' : '') +
            '<button type="button" id="syncSignOut" class="btn-secondary">Sign out</button></div>';
        notice = ''; // it has now been shown in full
        const retry = body.querySelector('#syncRetry');
        if (retry) retry.addEventListener('click', function () { lastPullAt = 0; requestPull(); });
        body.querySelector('#syncSignOut').addEventListener('click', function () {
            // Signing out stops syncing. The data on this device stays.
            client.auth.signOut();
        });
    }

    // ---------- start ----------
    function start() {
        buildUi();
        try { notice = sessionStorage.getItem('sync:notice') || ''; sessionStorage.removeItem('sync:notice'); } catch (e) { /* none */ }

        if (!window.supabase || !window.supabase.createClient) { setPhase('error', 'Sync could not start.'); return; }
        try {
            client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
                db: { schema: 'workout' },
                auth: { persistSession: true, autoRefreshToken: true }
            });
        } catch (e) { setPhase('error', 'Sync could not start.'); return; }

        // Fires once at startup with the saved sign-in (or none), then again on
        // every sign-in, sign-out and hourly token refresh.
        client.auth.onAuthStateChange(function (_event, session) {
            // Supabase asks that nothing slow runs inside this callback.
            setTimeout(function () { onSession(session); }, 0);
        });

        window.addEventListener('online', function () { lastPullAt = 0; requestPull(); });
        window.addEventListener('focus', requestPull);
        document.addEventListener('visibilitychange', function () {
            if (document.visibilityState === 'visible') requestPull();
        });
    }

    window.Sync = { save: save };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
    else start();
})();
