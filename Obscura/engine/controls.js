// =============================================================
// CONTROLS – input, pointer lock, movement, interaction
// =============================================================

function setupControls() {
    document.addEventListener('keydown', e => {
        if (document.getElementById('dice-overlay').classList.contains('active')) {
            if (diceState === 'idle' && (e.key === ' ' || e.key === 'r' || e.key === 'R')) { e.preventDefault(); rollDiceNow(); return; }
            if (diceState === 'result' && (e.key === ' ' || e.key === 'r' || e.key === 'R' || e.key === 'Escape')) { e.preventDefault(); closeDiceOverlay(); return; }
            e.preventDefault(); return;
        }

        if (e.key === ' ' || e.key === 'Spacebar') {
            if (narrationActive) {
                e.preventDefault();
                stopNarration();
                return;
            }
            // Skip current voice if playing (but not narration, handled above)
            document.dispatchEvent(new CustomEvent('voice:stop'));
            const closeBtn = document.getElementById('dialogue-close');
            if (closeBtn && closeBtn.style.display !== 'none' && document.getElementById('dialogue-box').classList.contains('active')) {
                e.preventDefault();
                closeDialogue();
                return;
            }
        }

        if (narrationActive && (e.key === 'n' || e.key === 'N')) { e.preventDefault(); stopNarration(); return; }

        keys[e.key.toLowerCase()] = true;

        if (document.getElementById('dialogue-box').classList.contains('active')) {
            const num = parseInt(e.key);
            if (!isNaN(num) && num >= 1) {
                const btns = document.querySelectorAll('#dialogue-choices button');
                const idx = num - 1;
                if (btns[idx]) btns[idx].click();
                return;
            }
            if (e.key === 'e' || e.key === 'E' || e.key === ' ') {
                const closeBtn = document.getElementById('dialogue-close');
                if (closeBtn && closeBtn.style.display !== 'none') { closeBtn.click(); return; }
            }
            if (e.key === 'Escape') { closeDialogue(); return; }
            return;
        }

        if (e.key === 'e' || e.key === 'E') interact();
        if (e.key === 'Escape') closeDialogue();
    });

    document.addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });

    document.addEventListener('mousemove', e => {
        if (!isLocked || !gameRunning || narrationActive || playerFrozen) return;
        const dx = Math.max(-30, Math.min(30, e.movementX || 0));
        const dy = Math.max(-30, Math.min(30, e.movementY || 0));
        targetYaw -= dx * 0.0015;
        targetPitch -= dy * 0.0009;
        targetPitch = Math.max(-Math.PI / 2.1, Math.min(Math.PI / 2.1, targetPitch));
    });

    renderer.domElement.addEventListener('click', () => {
        if (!isLocked) renderer.domElement.requestPointerLock();
    });

    document.addEventListener('pointerlockchange', () => {
        isLocked = document.pointerLockElement === renderer.domElement;
    });
}

function pushPlayerOutOfNPCs() {
    const playerPos = camera.position.clone();
    for (let w of wanderAnimations) {
        const npcPos = w.mesh.position;
        const dx = playerPos.x - npcPos.x;
        const dz = playerPos.z - npcPos.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        const minDist = w.collider.radius + PLAYER_RADIUS;
        if (dist < minDist && Math.abs(playerPos.y - npcPos.y) < w.collider.height / 2 + 0.5) {
            const angle = Math.atan2(dz, dx);
            const pushX = Math.cos(angle) * (minDist - dist + 0.1);
            const pushZ = Math.sin(angle) * (minDist - dist + 0.1);
            camera.position.x += pushX;
            camera.position.z += pushZ;
        }
    }
}

function checkCollision(pos) {
    const playerBottom = 0;
    const playerTop = 1.7;
    for (let c of colliders) {
        if (c.type === 'cylinder') {
            const dx = pos.x - c.pos.x;
            const dz = pos.z - c.pos.z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            const colBottom = c.pos.y - c.height / 2;
            const colTop = c.pos.y + c.height / 2;
            if (dist < c.radius + PLAYER_RADIUS && playerTop > colBottom && playerBottom < colTop) {
                return true;
            }
        } else {
            const dx = Math.abs(pos.x - c.pos.x), dz = Math.abs(pos.z - c.pos.z), dy = Math.abs(pos.y - c.pos.y);
            if (dx < c.size.x + PLAYER_RADIUS && dz < c.size.z + PLAYER_RADIUS && dy < c.size.y + 0.5) {
                return true;
            }
        }
    }
    return false;
}

function getCurrentRoom() {
    const rx = Math.floor(camera.position.x / ROOM_SIZE), rz = Math.floor(camera.position.z / ROOM_SIZE);
    const wx = ((rx % GRID_SIZE) + GRID_SIZE) % GRID_SIZE, wz = ((rz % GRID_SIZE) + GRID_SIZE) % GRID_SIZE;
    return `${wx + 1},${wz + 1}`;
}

function getRoomCoords(roomKey) {
    const p = roomKey.split(',');
    return { rx: parseInt(p[0]) - 1, rz: parseInt(p[1]) - 1 };
}

function checkDoorCrossing() {
    const currentKey = getCurrentRoom();
    if (previousRoomKey && previousRoomKey !== currentKey) {
        if (currentOpenDoor) {
            currentOpenDoor.close();
            currentOpenDoor = null;
        }
        const prev = getRoomCoords(previousRoomKey), curr = getRoomCoords(currentKey);
        const dx = Math.abs(prev.rx - curr.rx), dz = Math.abs(prev.rz - curr.rz);
        if (dx > 1 || dz > 1) {
            let cx = curr.rx * ROOM_SIZE + ROOM_SIZE / 2, cz = curr.rz * ROOM_SIZE + ROOM_SIZE / 2;
            if (dx > 1) cx += (prev.rx > curr.rx) ? -ROOM_SIZE / 2 + 3 : ROOM_SIZE / 2 - 3;
            if (dz > 1) cz += (prev.rz > curr.rz) ? -ROOM_SIZE / 2 + 3 : ROOM_SIZE / 2 - 3;
            camera.position.set(cx, 1.7, cz);
        }
        visitedRooms.add(currentKey);
        previousRoomKey = currentKey;
        const narrationKey = currentKey.replace(',', '-');
        if (!flags.narratedRooms.has(narrationKey)) {
            if (doorMsgActive) { pendingNarration = narrationKey; }
            else { startNarration(narrationKey); }
        }
    } else if (!previousRoomKey) {
        visitedRooms.add(currentKey);
        previousRoomKey = currentKey;
        startNarration(currentKey.replace(',', '-'));
    }
    if (flags.tempStatLoss) {
        for (const [stat, data] of Object.entries(flags.tempStatLoss)) {
            if (data.room !== currentKey) {
                stats[stat] = Math.min(stats[stat] + data.amount, 10);
            }
        }
        flags.tempStatLoss = {};
    }
    spawnSnowForRoom(currentKey);
    updateHUD();
    updateMinimap();
}