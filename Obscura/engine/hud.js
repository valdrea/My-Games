// =============================================================
// HUD – UI updates, narration, dialogue, voice lines
// =============================================================

// ----- UI -----
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

    // Dispatch pickup voice event (won't freeze player)
    document.dispatchEvent(new CustomEvent('voice:play', { detail: { type: 'pickup', text } }));
}

function showMessage(text) {
    const el = document.getElementById('message');
    el.textContent = text;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 3500);

    // Dispatch narrator message voice event (will freeze player)
    document.dispatchEvent(new CustomEvent('voice:play', { detail: { type: 'message', text } }));
}

function showDoorMsg(text) {
    const el = document.getElementById('door-msg');
    el.textContent = text;
    el.classList.remove('show');
    void el.offsetWidth;
    el.classList.add('show');
    doorMsgActive = true;
    setTimeout(() => { el.classList.remove('show'); doorMsgActive = false; }, 3500);
    // Voice dispatch is now handled by Door.interact() itself
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

// --- Narration (text only, voice dispatched from here) ---
function startNarration(roomKeyHyphen) {
    if (narrationActive || flags.narratedRooms.has(roomKeyHyphen)) return;
    const text = ROOM_NARRATION_TEXT[roomKeyHyphen];
    if (!text) return;
    flags.narratedRooms.add(roomKeyHyphen);
    narrationActive = true;
    playerFrozen = true;
    document.getElementById('narration-text').textContent = text;
    document.getElementById('narration-popup').style.display = 'block';
    document.getElementById('narrator-hud-btn').style.display = 'block';

    // Dispatch narration voice event – when it ends, stop narration
    document.dispatchEvent(new CustomEvent('voice:play', {
        detail: {
            type: 'narration',
            roomKey: roomKeyHyphen,
            callback: () => {
                narrationActive = false;
                playerFrozen = false;
                document.getElementById('narration-popup').style.display = 'none';
                document.getElementById('narrator-hud-btn').style.display = 'none';
            }
        }
    }));
}

function stopNarration() {
    // Stop the voice if it's currently playing
    document.dispatchEvent(new CustomEvent('voice:stop'));
    narrationActive = false;
    playerFrozen = false;
    document.getElementById('narration-popup').style.display = 'none';
    document.getElementById('narrator-hud-btn').style.display = 'none';
}

// --- Dialogue (no voice) ---
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

    // Dispatch dialogue voice event
    if (dialogueNpcId) {
        document.dispatchEvent(new CustomEvent('voice:play', {
            detail: { type: 'dialogue', npcId: dialogueNpcId, nodeKey: dialogueNodeKey }
        }));
    }
}

function closeDialogue() {
    document.getElementById('dialogue-box').classList.remove('active');
    dialogueNpcId = null;
    dialogueNodeKey = null;
    for (let w of wanderAnimations) {
        const npcId = npcMeshes.get(w.mesh);
        if (npcId && NPCS[npcId].wander) w.active = true;
    }
}

// --- Interaction ---
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

// --- Waltz helper ---
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

// MercyRoll (mercy voice event dispatched via voice module)
window.mercyRoll = async function(questId, rollPromise, pityMessage, pityAction) {
    const res = await rollPromise;
    if (!res.success) {
        mercyTracker[questId] = (mercyTracker[questId] || 0) + 1;
        if (mercyTracker[questId] >= 2) {
            mercyTracker[questId] = 0;
            // Play mercy voice first
            document.dispatchEvent(new CustomEvent('voice:play', {
                detail: {
                    type: 'mercy',
                    questId,
                    callback: () => {
                        // After mercy voice, show narrator message (which plays its own voice)
                        showMessage(pityMessage);
                        pityAction();
                    }
                }
            }));
            return { success: true, mercy: true };
        }
    } else {
        mercyTracker[questId] = 0;
    }
    return res;
};