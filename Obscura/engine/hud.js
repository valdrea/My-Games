// =============================================================
// HUD – UI updates, narration, dialogue, voice lines
// =============================================================

/* ------------------------------------------------------------------ */
/*  GLOBAL AUDIO QUEUE – ensures only one voice plays at a time       */
/* ------------------------------------------------------------------ */
let audioQueue = [];                  // queued items { path, freeze, resolve, reject }
let currentAudio = null;              // currently playing Audio element
let currentAudioFreeze = false;       // whether the current audio freezes the player

function stopCurrentAudio() {
    if (currentAudio) {
        currentAudio.pause();
        currentAudio = null;
        playerFrozen = false;         // unfreeze just in case
        currentAudioFreeze = false;
    }
}

/** Start the next item in the queue (if any) */
function processQueue() {
    if (audioQueue.length === 0) return;
    const item = audioQueue.shift();
    const { path, freeze, resolve, reject } = item;
    const audio = new Audio(path);
    audio.onended = () => {
        if (currentAudio === audio) {
            currentAudio = null;
            if (currentAudioFreeze) playerFrozen = false;
            currentAudioFreeze = false;
            resolve();
            processQueue();
        }
    };
    audio.onerror = () => {
        // If file missing, still resolve and continue
        if (currentAudio === audio) {
            currentAudio = null;
            if (currentAudioFreeze) playerFrozen = false;
            currentAudioFreeze = false;
            resolve();
            processQueue();
        }
    };
    // Pause any previous audio (shouldn't happen if queue is sequential, but safety)
    if (currentAudio) stopCurrentAudio();
    audio.play().catch(err => {
        // Browser may block autoplay – treat as resolved
        if (currentAudio === audio) {
            currentAudio = null;
            if (currentAudioFreeze) playerFrozen = false;
            currentAudioFreeze = false;
            resolve();
            processQueue();
        }
    });
    currentAudio = audio;
    currentAudioFreeze = freeze;
    if (freeze) playerFrozen = true;
}

/**
 * Enqueue an audio file. Returns a Promise that resolves when playback finishes.
 * @param {string}  path   – URL to the audio file
 * @param {boolean} freeze – if true, freeze player movement during playback
 */
function enqueueAudio(path, freeze = true) {
    return new Promise((resolve, reject) => {
        audioQueue.push({ path, freeze, resolve, reject });
        if (!currentAudio) processQueue();  // start playing if idle
    });
}

/** Skip the current audio (spacebar) */
function skipCurrentAudio() {
    if (currentAudio) {
        // Force end – this will trigger onended and continue the queue
        currentAudio.pause();
        currentAudio.currentTime = currentAudio.duration || 0;
        // onended will fire and clean up
        // Also unfreeze immediately
        if (currentAudioFreeze) playerFrozen = false;
        currentAudioFreeze = false;
        // The onended handler will set currentAudio = null, resolve, and process next
    }
}

/* ------------------------------------------------------------------ */
/*  VOICE MAPPINGS                                                     */
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

/* ------------------------------------------------------------------ */
/*  HELPER: build path from room folder + filename                     */
/* ------------------------------------------------------------------ */
function buildRoomAudioPath(filename) {
    const key = getCurrentRoom();
    const roomFormatted = key.replace(',','-');
    return `assets/audio/room_${roomFormatted}/${filename}.mp3`;
}

/* ------------------------------------------------------------------ */
/*  VOICE PLAYBACK USING QUEUE                                         */
/* ------------------------------------------------------------------ */
function playDialogueVoice(npcId, nodeKey) {
    const npcMap = DIALOGUE_VOICE_MAP[npcId];
    if (!npcMap) return;
    const filename = npcMap[nodeKey];
    if (!filename) return;
    enqueueAudio(buildRoomAudioPath(filename), true);
}

function playMercyVoice(questId) {
    const filename = MERCY_VOICE_MAP[questId];
    if (!filename) return Promise.resolve();
    return enqueueAudio(buildRoomAudioPath(filename), true);
}

function playDoorVoice(lineText) {
    const isLocked = LOCKED_LINES.includes(lineText);
    const pool = isLocked ? LOCKED_LINES : UNLOCKED_LINES;
    const idx = pool.indexOf(lineText) + 1;
    if (idx < 1) return Promise.resolve();
    const audioPath = `assets/audio/doors/door_${isLocked ? 'locked' : 'unlocked'}_${String(idx).padStart(2,'0')}.mp3`;
    // Doors should not freeze the player (the door will open after speech via await)
    return enqueueAudio(audioPath, false);
}

/* ------------------------------------------------------------------ */
/*  UI FUNCTIONS                                                       */
/* ------------------------------------------------------------------ */
const pickupPrompt = document.getElementById('pickup-prompt');
const pickupMsg = document.getElementById('pickup-msg');
const talkPrompt = document.getElementById('talk-prompt');

function showPickupPrompt(visible, itemName) {
    if (visible && itemName) pickupPrompt.textContent = `[E] Pick up ${itemName}`;
    pickupPrompt.classList.toggle('show', visible);
}

function showTalkPrompt(visible, npcName) {
    if (visible && npcName) talkPrompt.textContent = `[E] Talk to ${npcName}`;
    talkPrompt.classList.toggle('show', visible);
}

function showPickupMsg(text) {
    pickupMsg.textContent = text;
    pickupMsg.classList.remove('show');
    void pickupMsg.offsetWidth;
    pickupMsg.classList.add('show');
    setTimeout(() => pickupMsg.classList.remove('show'), 2500);

    // Voice the line if mapped (don't freeze)
    const filename = NARRATOR_VOICE_MAP[text];
    if (filename) {
        enqueueAudio(buildRoomAudioPath(filename), false);
    }
}

function showMessage(text) {
    const el = document.getElementById('message');
    el.textContent = text;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 3500);

    const filename = NARRATOR_VOICE_MAP[text];
    if (filename) {
        enqueueAudio(buildRoomAudioPath(filename), true);
    }
}

function showDoorMsg(text) {
    const el = document.getElementById('door-msg');
    el.textContent = text;
    el.classList.remove('show');
    void el.offsetWidth;
    el.classList.add('show');
    doorMsgActive = true;
    setTimeout(() => { el.classList.remove('show'); doorMsgActive = false; }, 3500);
}

function updateHUD() {
    const key = getCurrentRoom();
    const room = ROOMS[key];
    if (!room) return;
    document.getElementById('room-name').textContent = room.name;
    document.getElementById('room-coord').textContent = `Zone [${key}]`;
    document.getElementById('room-desc').textContent = room.desc;
    document.getElementById('stat-will').textContent = stats.willpower;
    document.getElementById('stat-curi').textContent = stats.curiosity;
    document.getElementById('stat-charm').textContent = stats.charm;
    document.getElementById('stat-spite').textContent = spiteModifier;
    const invEl = document.getElementById('inv-list');
    invEl.innerHTML = inventory.length === 0 ? 'Empty' : inventory.map(id => {
        const it = ITEMS[id];
        return it ? it.name : id;
    }).join('<br>');
}

function updateMinimap() {
    const w = 200, h = 200, rows = 5, cols = 5, rw = w / cols, rh = h / rows;
    minimapCtx.clearRect(0, 0, w, h);
    const currentKey = getCurrentRoom();
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const key = `${r + 1},${c + 1}`, x = c * rw, y = r * rh;
        let fill = '#0a0a1a';
        if (visitedRooms.has(key)) fill = '#192a3a';
        if (key === currentKey) fill = '#2a4a6a';
        minimapCtx.fillStyle = fill;
        minimapCtx.fillRect(x, y, rw, rh);
        minimapCtx.strokeStyle = '#455';
        minimapCtx.strokeRect(x, y, rw, rh);
    }
    if (currentKey) {
        const cr = parseInt(currentKey.split(',')[0]) - 1, cc = parseInt(currentKey.split(',')[1]) - 1;
        const cx = cc * rw + rw / 2, cy = cr * rh + rh / 2;
        minimapCtx.strokeStyle = '#ffd700';
        minimapCtx.lineWidth = 3;
        minimapCtx.beginPath();
        minimapCtx.moveTo(cx - 8, cy); minimapCtx.lineTo(cx + 8, cy);
        minimapCtx.moveTo(cx, cy - 8); minimapCtx.lineTo(cx, cy + 8);
        minimapCtx.stroke();
    }
}

/* ------------------------------------------------------------------ */
/*  NARRATION (room ambient)                                           */
/* ------------------------------------------------------------------ */
function startNarration(roomKeyHyphen) {
    if (narrationActive || flags.narratedRooms.has(roomKeyHyphen)) return;
    const text = ROOM_NARRATION_TEXT[roomKeyHyphen];
    if (!text) return;
    const audioPath = `assets/audio/${roomKeyHyphen}.mp3`;
    flags.narratedRooms.add(roomKeyHyphen);
    narrationActive = true;
    playerFrozen = true;
    document.getElementById('narration-text').textContent = text;
    document.getElementById('narration-popup').style.display = 'block';
    document.getElementById('narrator-hud-btn').style.display = 'block';
    narrationAudio = new Audio(audioPath);
    narrationAudio.onended = () => stopNarration();
    narrationAudio.play();
}

function stopNarration() {
    if (narrationAudio) { narrationAudio.pause(); narrationAudio = null; }
    narrationActive = false;
    playerFrozen = false;
    document.getElementById('narration-popup').style.display = 'none';
    document.getElementById('narrator-hud-btn').style.display = 'none';
}

/* ------------------------------------------------------------------ */
/*  DIALOGUE SYSTEM                                                    */
/* ------------------------------------------------------------------ */
let dialogueNpcId = null;
let dialogueNodeKey = null;

function openDialogue(npcId) {
    const npcData = NPCS[npcId];
    if (!npcData) return;
    const npcMesh = npcMeshes.get(npcData);
    if (npcMesh && npcData.glb) {
        const angle = Math.atan2(camera.position.x - npcMesh.position.x, camera.position.z - npcMesh.position.z);
        npcMesh.rotation.y = angle;
    }
    dialogueNpcId = npcId;
    for (let w of wanderAnimations) if (npcMeshes.get(w.mesh) === npcId) { w.active = false; }
    const startNode = npcData.getStartNode();
    if (!npcData.dialogue[startNode]) return;
    if (npcData.onFirstMeet && !flags['met' + npcId]) npcData.onFirstMeet();
    showDialogueNode(npcId, startNode);
    document.getElementById('dialogue-box').classList.add('active');
}

function showDialogueNode(npcId, nodeKey) {
    if (!nodeKey) { closeDialogue(); return; }
    const npc = NPCS[npcId];
    const node = npc.dialogue[nodeKey];
    if (!node) { closeDialogue(); return; }
    dialogueNodeKey = nodeKey;
    document.getElementById('dialogue-speaker').textContent = npc.name;
    document.getElementById('dialogue-text').textContent = node.text;
    const choicesEl = document.getElementById('dialogue-choices');
    choicesEl.innerHTML = '';
    let choices = node.choices;
    if (typeof choices === 'function') choices = choices();
    if (choices && choices.length > 0) {
        choices.forEach((choice, i) => {
            const btn = document.createElement('button');
            btn.innerHTML = `<span class="choice-key">${i + 1}</span>${choice.label}`;
            btn.onclick = () => {
                if (typeof choice.next === 'function') choice.next();
                else showDialogueNode(npcId, choice.next);
            };
            choicesEl.appendChild(btn);
        });
        document.getElementById('dialogue-close').style.display = 'none';
    } else {
        document.getElementById('dialogue-close').style.display = 'block';
    }
    if (node.onShow) node.onShow();
    playDialogueVoice(npcId, nodeKey);
}

function closeDialogue() {
    document.getElementById('dialogue-box').classList.remove('active');
    dialogueNpcId = null;
    dialogueNodeKey = null;
    // No need to manually stop audio; queue continues naturally.
    // But we must unfreeze if dialogue was freezing (though the queue will do it when it ends)
    for (let w of wanderAnimations) {
        const npcId = npcMeshes.get(w.mesh);
        if (npcId && NPCS[npcId].wander) w.active = true;
    }
}

/* ------------------------------------------------------------------ */
/*  INTERACTION                                                        */
/* ------------------------------------------------------------------ */
let focusedItem = null;
let focusedNpc = null;

function findNpcFromHit(hitObject) {
    let obj = hitObject;
    while (obj) {
        if (npcMeshes.has(obj)) return npcMeshes.get(obj);
        obj = obj.parent;
    }
    return null;
}

function updateInteractionRay() {
    if (!gameRunning || document.getElementById('dialogue-box').classList.contains('active') || narrationActive) return;
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    const raycaster = new THREE.Raycaster(camera.position, dir, 0, 6);
    const npcObjects = Array.from(npcMeshes.keys());
    const npcHits = raycaster.intersectObjects(npcObjects, true);
    if (npcHits.length > 0) {
        const id = findNpcFromHit(npcHits[0].object);
        if (id) {
            focusedNpc = npcHits[0].object;
            focusedItem = null;
            showTalkPrompt(true, NPCS[id]?.name || '');
            showPickupPrompt(false);
            return;
        }
    }
    const itemHits = raycaster.intersectObjects(Array.from(itemSprites.keys()));
    if (itemHits.length > 0) {
        const id = itemSprites.get(itemHits[0].object);
        if (id && !inventory.includes(id)) {
            focusedItem = itemHits[0].object;
            focusedNpc = null;
            showPickupPrompt(true, ITEMS[id]?.name || '');
            showTalkPrompt(false);
            return;
        }
    }
    focusedItem = null;
    focusedNpc = null;
    showPickupPrompt(false);
    showTalkPrompt(false);
}

function interact() {
    if (document.getElementById('dialogue-box').classList.contains('active') || narrationActive) return;
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    const raycaster = new THREE.Raycaster(camera.position, dir, 0, 6);

    const npcHits = raycaster.intersectObjects(Array.from(npcMeshes.keys()), true);
    if (npcHits.length > 0) {
        const id = findNpcFromHit(npcHits[0].object);
        if (id) { openDialogue(id); return; }
    }

    const itemHits = raycaster.intersectObjects(Array.from(itemSprites.keys()));
    if (itemHits.length > 0) {
        const hitMesh = itemHits[0].object, id = itemSprites.get(hitMesh);
        if (id && !inventory.includes(id)) {
            inventory.push(id);
            scene.remove(hitMesh);
            itemSprites.delete(hitMesh);
            const idx = worldObjects.indexOf(hitMesh);
            if (idx !== -1) worldObjects.splice(idx, 1);
            const animIdx = itemAnimations.findIndex(a => a.mesh === hitMesh);
            if (animIdx !== -1) itemAnimations.splice(animIdx, 1);
            showPickupMsg(ITEMS[id]?.pickupText || 'You picked it up.');
            showPickupPrompt(false);
            updateHUD();
            return;
        }
    }

    const doorHits = raycaster.intersectObjects(doorMeshes);
    if (doorHits.length > 0) {
        for (let d of doorList) if (d.mesh === doorHits[0].object) { d.interact(); return; }
    }
}

// Waltz helper
function attemptWaltzWithMercy(useVial) {
    const bonus = useVial && inventory.includes('vial_of_resolve') ? 2 : 0;
    if (bonus) { inventory = inventory.filter(id => id !== 'vial_of_resolve'); updateHUD(); }
    const rollPromise = performResonanceRoll('willpower', 8, bonus);
    mercyRoll('waltz', rollPromise,
        '"Enough! You are so determined I cannot refuse. Take the loafers, you scraped them fair."',
        async () => { spawnTemporaryItem('helium_loafers', { x: 0, y: 1.5, z: 0 }); flags.waltzComplete = true; updateHUD(); }
    ).then(res => {
        if (res.success) {
            if (!res.mercy) { showMessage('You waltz flawlessly. The Baron presents you with Helium Loafers.'); spawnTemporaryItem('helium_loafers', { x: 0, y: 1.5, z: 0 }); flags.waltzComplete = true; updateHUD(); }
            closeDialogue();
        } else {
            showMessage('You stumble onto a floating table. Perhaps another attempt?');
            closeDialogue();
        }
    });
}

// Patch mercyRoll to play mercy voice BEFORE the reward action
const originalMercyRoll = mercyRoll;
window.mercyRoll = async function(questId, rollPromise, pityMessage, pityAction) {
    const res = await originalMercyRoll(questId, rollPromise, pityMessage, pityAction);
    if (res.mercy) {
        // Play mercy voice, then do the pity action (which may trigger showMessage)
        await playMercyVoice(questId);
        await pityAction();
        return { success: true, mercy: true };
    }
    return res;
};