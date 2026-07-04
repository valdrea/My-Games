// =============================================================
// VOICE – isolated voice‑acting module (Web Audio / single element)
// =============================================================

let voiceAudio = null;           // persistent Audio element
let voiceFreeze = false;
let voiceCurrentCallback = null; // called when current speech ends

// Called once when the player clicks “BEGIN EXPLORATION”
function unlockVoice() {
    if (voiceAudio) return;
    voiceAudio = new Audio();
    // Play a silent WAV to unlock the browser’s audio system
    voiceAudio.src = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA";
    voiceAudio.play().then(() => {
        voiceAudio.pause();
        voiceAudio.removeAttribute('src');
        voiceAudio.load();
    }).catch(() => {});
}

// Internal play function – never exposes promises outside
function playVoiceFile(path, freeze = true, callback = null) {
    if (!voiceAudio) { unlockVoice(); if (!voiceAudio) voiceAudio = new Audio(); }
    // Stop any currently playing voice
    if (voiceAudio.src) {
        voiceAudio.pause();
        if (voiceCurrentCallback) {
            const cb = voiceCurrentCallback;
            voiceCurrentCallback = null;
            cb();
        }
    }
    voiceAudio.removeAttribute('src');
    voiceAudio.load();

    voiceAudio.src = path;
    voiceFreeze = freeze;
    voiceCurrentCallback = callback;

    voiceAudio.onended = () => {
        voiceAudio.onended = null;
        if (voiceFreeze) { playerFrozen = false; voiceFreeze = false; }
        const cb = voiceCurrentCallback;
        voiceCurrentCallback = null;
        if (cb) cb();
    };
    voiceAudio.onerror = () => {
        console.warn('Voice file missing:', path);
        voiceAudio.onended = null;
        if (voiceFreeze) { playerFrozen = false; voiceFreeze = false; }
        const cb = voiceCurrentCallback;
        voiceCurrentCallback = null;
        if (cb) cb();
    };

    if (freeze) playerFrozen = true;
    voiceAudio.play().catch(err => {
        console.warn('Play prevented for', path);
        voiceAudio.onended = null;
        if (voiceFreeze) { playerFrozen = false; voiceFreeze = false; }
        const cb = voiceCurrentCallback;
        voiceCurrentCallback = null;
        if (cb) cb();
    });
}

function skipVoice() {
    if (voiceAudio && voiceAudio.src) {
        voiceAudio.pause();
        if (voiceAudio.onended) {
            voiceAudio.onended();
        } else {
            if (voiceFreeze) { playerFrozen = false; voiceFreeze = false; }
            if (voiceCurrentCallback) {
                const cb = voiceCurrentCallback;
                voiceCurrentCallback = null;
                cb();
            }
        }
        voiceAudio.removeAttribute('src');
        voiceAudio.load();
    }
}

/* ------------------------------------------------------------------ */
/*  VOICE MAPPINGS (identical to what was in hud.js)                   */
/* ------------------------------------------------------------------ */
const DIALOGUE_VOICE_MAP = {
    Origami_Crow: {
        start: 'Barnaby_greeting',
        explain_name: 'Barnaby_explain_name',
        whoami: 'Barnaby_who_are_you',
        exit: 'Barnaby_door_hint',
        quest: 'Barnaby_quest_offer',
        compass: 'Barnaby_compass_cost',
        give_compass: 'Barnaby_compass_given',
        examine_sphere: 'Barnaby_sphere_puzzle',
        done: 'Barnaby_farewell'
    },
    Baron_von_Bounce: {
        start: 'Baron_greeting',
        explain_ballroom: 'Baron_explain_ballroom',
        waltz_challenge: 'Baron_waltz_challenge',
        done: 'Baron_success'
    },
    Uncle_Gesso: {
        start: 'Gesso_greeting',
        explain_nursery: 'Gesso_explain_nursery',
        eye_search: 'Gesso_eye_search',
        done: 'Gesso_farewell'
    },
    Curator_Vance: {
        start: 'Vance_greeting',
        explain_gallery: 'Vance_explain_gallery',
        shadow_hint: 'Vance_shadow_hint',
        done: 'Vance_shadow_returned'
    },
    Faceless_Queen: {
        start: 'Queen_greeting',
        done: 'Queen_dismissal'
    },
    Chirp: {
        start: 'Chirp_greeting',
        done: 'Chirp_farewell'
    },
    Keyhole_Specter: {
        start: 'Specter_greeting',
        done: 'Specter_farewell'
    },
    Spindle: {
        start: 'Spindle_greeting',
        puzzle: 'Spindle_thorn_challenge',
        done: 'Spindle_farewell'
    },
    Lost_Scout: {
        start: 'Scout_greeting',
        done: 'Scout_farewell'
    },
    Keeper_of_the_Rust: {
        start: 'Keeper_greeting',
        explain: 'Keeper_explain_keys',
        done: 'Keeper_farewell'
    },
    Lovelace_the_Fern: {
        start: 'Lovelace_greeting',
        done: 'Lovelace_farewell'
    },
    Epitaphist: {
        start: 'Epitaphist_greeting',
        riddle: 'Epitaphist_riddle',
        done: 'Epitaphist_farewell'
    },
    Grand_Pendulum: {
        start: 'Pendulum_greeting',
        done: 'Pendulum_farewell'
    }
};

const MERCY_VOICE_MAP = {
    crow_sphere: 'Barnaby_mercy_sphere',
    fern_wp: 'Lovelace_mercy',
    epitaphist_curi: 'Epitaphist_mercy',
    pendulum_wp: 'Pendulum_mercy',
    waltz: 'Baron_mercy_waltz',
    gesso_eye: 'Gesso_mercy_eye',
    vance_shadow_wp: 'Vance_mercy_shadow',
    vance_shadow_ch: 'Vance_mercy_shadow',
    queen_charm: 'Queen_mercy_charm',
    queen_wp: 'Queen_mercy_willpower',
    chirp_wp: 'Chirp_mercy',
    specter_curi: 'Specter_mercy',
    spindle_wp: 'Spindle_mercy',
    scout_curi: 'Scout_mercy',
    rust_curi: 'Keeper_mercy'
};

const NARRATOR_VOICE_MAP = {
    "Your Curiosity is too low to bear the compass.": "narr_compass_low",
    "You spot the lever and pull it. A Vial of Lavender Ink drops onto the desk.": "narr_sphere_ink",
    "The mechanism eludes you. Perhaps another glance.": "narr_sphere_fail",
    "You received the Folded Compass. Your Curiosity dims slightly.": "narr_compass_receive",
    "You waltz flawlessly. The Baron presents you with Helium Loafers.": "narr_waltz_success",
    "You stumble onto a floating table. Perhaps another attempt?": "narr_waltz_fail",
    "You find the eye marked with the letter \"I\". It glows warmly.": "narr_eye_found",
    "The drawers all look the same. Perhaps come back with sharper eyes.": "narr_eye_fail",
    "Your shadow obeys and snaps back to your feet.": "narr_shadow_command",
    "You paint a lovely portrait; the frame accepts it and releases your shadow.": "narr_shadow_paint",
    "Your painting is... unrecognisable. The frame rejects it.": "narr_shadow_paint_fail",
    "Your shadow wavers but doesn't return.": "narr_shadow_command_fail",
    "The Queen is delighted by your eloquence. She hands you the letter \"A\".": "narr_queen_charm",
    "The Queen respects your resolve and grants you the letter \"A\".": "narr_queen_will",
    "Your argument falls flat. The Queen sentences you to hard labor.": "narr_queen_charm_fail",
    "Your submission only amuses her. Hard labor it is.": "narr_queen_will_fail",
    "You glide through the aviary without a sound. Chirp offers you a glass feather.": "narr_chirp_success",
    "A twig snaps underfoot. Glass shards rain down.": "narr_chirp_fail",
    "You press your ear to the C-sharp keyhole. The Specter hands you a skeleton key.": "narr_specter_success",
    "All keyholes sound the same. The Specter sighs and vanishes.": "narr_specter_fail",
    "You brave the thorns and Spindle hands you a thistle key.": "narr_spindle_success",
    "The thorns scratch you. Spindle chuckles.": "narr_spindle_fail",
    "You find a dry match and hand it to the Scout. He gives you one in return.": "narr_scout_success",
    "You come up empty. The Scout sighs.": "narr_scout_fail",
    "You pull a key that glints faintly. It may open nothing, but it feels important.": "narr_keeper_success",
    "The key crumbles in your hand.": "narr_keeper_fail",
    "You pull the shard from the fern. It hums softly with the letter D.": "narr_fern_success",
    "Thorns prick your skin. The plant giggles.": "narr_fern_fail",
    "The gargoyle nods and hands you the Chisel of Renown.": "narr_epitaphist_success",
    "The gargoyle cackles. \"Wrong! Come back when you have listened to your own feet.\"": "narr_epitaphist_fail",
    "The pendulum swings aside, granting you passage.": "narr_pendulum_pass",
    "The pendulum clips your shoulder.": "narr_pendulum_fail",

    // Pickup voices
    "You unfold the compass. It tugs toward a distant room.": "narr_pickup_compass",
    "The ink shimmers; it might make doors more agreeable.": "narr_pickup_lavender_ink",
    "You feel a surge of determination.": "narr_pickup_resolve",
    "The loafers feel weightless. They might lift you over dangers.": "narr_pickup_loafers",
    "You pocket the letter D.": "narr_pickup_shard_D",
    "The eye gazes softly. You pocket the letter I.": "narr_pickup_shard_I",
    "You take the shard. It hums with courtroom authority.": "narr_pickup_shard_A",
    "You pocket the letter N.": "narr_pickup_shard_N",
    "You pocket the second N.": "narr_pickup_shard_N2",
    "You pocket the letter E.": "narr_pickup_shard_E",
    "The feather chimes softly as you pocket it.": "narr_pickup_feather",
    "You pocket the skeleton key. It feels important.": "narr_pickup_skeleton_key",
    "You carefully pocket the thistle key.": "narr_pickup_thistle_key",
    "You take the dry match. It might light something later.": "narr_pickup_dry_match",
    "The chisel feels heavy with possibility.": "narr_pickup_chisel"
};

// Helper to build the full audio path from a room folder + filename
function buildVoicePath(filename) {
    const key = getCurrentRoom();
    const roomFormatted = key.replace(',','-');
    return `assets/audio/room_${roomFormatted}/${filename}.mp3`;
}

// ---- Custom event listeners ----

// Listen for voice requests from the rest of the game
document.addEventListener('voice:play', (e) => {
    const detail = e.detail || {};
    let path = null;
    let freeze = true;

    if (detail.type === 'dialogue') {
        const map = DIALOGUE_VOICE_MAP[detail.npcId];
        if (map) {
            const filename = map[detail.nodeKey];
            if (filename) path = buildVoicePath(filename);
        }
    } else if (detail.type === 'mercy') {
        const filename = MERCY_VOICE_MAP[detail.questId];
        if (filename) path = buildVoicePath(filename);
    } else if (detail.type === 'message' || detail.type === 'pickup') {
        const filename = NARRATOR_VOICE_MAP[detail.text];
        if (filename) path = buildVoicePath(filename);
        // pickup messages shouldn't freeze the player
        if (detail.type === 'pickup') freeze = false;
    } else if (detail.type === 'narration') {
        // room narration is at assets/audio/X-Y.mp3 (top level)
        path = `assets/audio/${detail.roomKey}.mp3`;
        freeze = false;   // narration already freezes via other means, but we can keep it false
    } else if (detail.type === 'door') {
        // door voice path determined by the text index
        const text = detail.text;
        const isLocked = LOCKED_LINES.includes(text);
        const pool = isLocked ? LOCKED_LINES : UNLOCKED_LINES;
        const idx = pool.indexOf(text) + 1;
        if (idx >= 1) path = `assets/audio/doors/door_${isLocked ? 'locked' : 'unlocked'}_${String(idx).padStart(2,'0')}.mp3`;
        freeze = false;   // doors shouldn't freeze
    }

    if (path) {
        playVoiceFile(path, freeze, detail.callback || null);
    } else if (detail.callback) {
        detail.callback();
    }
});

// Stop current voice (called by spacebar)
document.addEventListener('voice:stop', () => {
    skipVoice();
});