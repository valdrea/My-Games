// =============================================================
// ANIMATIONS – per‑frame update for all moving world objects
// =============================================================

function updateSnow(delta) {
    if (getCurrentRoom() !== '4,2') {
        if (snowParticles.length > 0) spawnSnowForRoom('');
        return;
    }
    if (snowParticles.length === 0) spawnSnowForRoom('4,2');
    const roomCZ = 1 * ROOM_SIZE + ROOM_SIZE / 2;
    for (const p of snowParticles) {
        p.mesh.position.y -= p.speed * delta;
        if (p.mesh.position.y < 0) {
            p.mesh.position.y = WALL_HEIGHT;
            p.mesh.position.x = 3 * ROOM_SIZE + ROOM_SIZE / 2 - ROOM_SIZE / 2 + Math.random() * ROOM_SIZE;
            p.mesh.position.z = roomCZ - ROOM_SIZE / 2 + Math.random() * ROOM_SIZE;
        }
        p.mesh.position.x += Math.sin(performance.now() * 0.001 + p.offset) * 0.05 * delta;
    }
}

function updateAnimations(delta) {
    // Float bounces
    for (let f of floatAnimations) {
        const time = performance.now() * 0.001;
        f.mesh.position.y = f.baseY + Math.sin(time * f.speed + f.offset) * f.amplitude;
    }

    // Wander
    for (let w of wanderAnimations) {
        if (!w.active) continue;
        w.timer -= delta;
        if (w.timer <= 0) {
            const rc = getRoomCoords(w.roomKey);
            const cx = rc.rx * ROOM_SIZE + ROOM_SIZE / 2;
            const cz = rc.rz * ROOM_SIZE + ROOM_SIZE / 2;
            const angle = Math.random() * Math.PI * 2;
            const dist = w.radius * (0.5 + Math.random() * 0.5);
            w.targetPos.set(cx + Math.cos(angle) * dist, w.basePos.y, cz + Math.sin(angle) * dist);
            w.timer = 2 + Math.random() * 2;
        }
        const dir = new THREE.Vector3().subVectors(w.targetPos, w.mesh.position);
        if (dir.length() > 0.1) {
            const targetHeading = Math.atan2(dir.x, dir.z);
            let diff = targetHeading - w.heading;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            w.heading += diff * Math.min(delta * 3, 1);
            w.mesh.rotation.y = w.heading;
            dir.normalize().multiplyScalar(w.speed * delta);
            w.mesh.position.add(dir);
            if (w.vertical) {
                const time = performance.now() * 0.001;
                w.mesh.position.y = w.verticalBase + Math.sin(time * 0.6) * 1.0;
            }
            if (w.collider) {
                w.collider.pos.set(w.mesh.position.x, w.mesh.position.y, w.mesh.position.z);
                w.collider.mesh.position.copy(w.mesh.position);
            }
        }
    }

    // Hedge block animation
    if (window.hedgeBlocks && window.hedgeBlocks.length > 0) {
        const cycleTime = 12.0;
        const t = (performance.now() * 0.001) % cycleTime;
        let moveOffset = 0;
        let rotationOffset = 0;
        if (t < 3) {
            moveOffset = (t / 3) * 2.0;
        } else if (t < 4) {
            moveOffset = 2.0;
        } else if (t < 7) {
            moveOffset = 2.0;
            const rotT = (t - 4) / 3;
            rotationOffset = rotT * Math.PI / 2;
        } else if (t < 8) {
            moveOffset = 2.0;
            rotationOffset = Math.PI / 2;
        } else if (t < 11) {
            const slideT = (t - 8) / 3;
            moveOffset = 2.0 * (1 - slideT);
            rotationOffset = Math.PI / 2;
        } else {
            const rotT = (t - 11) / 1;
            moveOffset = 0;
            rotationOffset = Math.PI / 2 * (1 - rotT);
        }
        for (const hb of window.hedgeBlocks) {
            const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(hb.mesh.quaternion);
            hb.mesh.position.x = hb.baseX + forward.x * moveOffset;
            hb.mesh.position.z = hb.baseZ + forward.z * moveOffset;
            const mirror = (hb.phase === 0 || hb.phase === Math.PI) ? 1 : -1;
            hb.mesh.rotation.y = hb.phase + rotationOffset * mirror;
        }
    }

    // Robin hopping
    if (window.robin) {
        const robin = window.robin;
        robin.hopTimer -= delta;
        if (robin.hopTimer <= 0) {
            robin.hopTimer = 5.0;
            const angle = Math.random() * Math.PI * 2;
            const dist = 1.5 + Math.random() * 2;
            robin.targetX = robin.baseX + Math.cos(angle) * dist;
            robin.targetZ = robin.baseZ + Math.sin(angle) * dist;
        }
        const dx = robin.targetX - robin.mesh.position.x;
        const dz = robin.targetZ - robin.mesh.position.z;
        const d = Math.sqrt(dx * dx + dz * dz);
        if (d > 0.1) {
            robin.mesh.position.x += (dx / d) * 0.3 * delta;
            robin.mesh.position.z += (dz / d) * 0.3 * delta;
        }
        robin.mesh.position.y = 0.4 + Math.abs(Math.sin(performance.now() * 0.002)) * 0.2;
    }

    // Pendulum swing (faster, deeper)
    for (const p of pendulumObjects) {
        const t = performance.now() * 0.001;
        p.mesh.rotation.z = Math.sin(t * 1.2 + p.phase) * 0.3;
    }

    // Cuckoo waddle (robotic, side‑to‑side, no bounce)
    for (const c of cuckoos) {
        const t = performance.now() * 0.001;
        const wobble = Math.sin(t * 1.5 + c.phase) * 0.2;    // smaller sway
        c.mesh.rotation.z = wobble * 0.3;                   // tilting
        c.mesh.rotation.y = wobble * 0.15;                  // slight body turn
        // keep position fixed, no bounce
    }

    // Snow
    updateSnow(delta);

    // Billboards always face camera
    for (const mesh of billboards) {
        mesh.lookAt(camera.position);
    }

    // Hummingbirds
    const time = performance.now() * 0.001;
    for (const h of hummingbirds) {
        h.angle += h.speed * delta;
        let newX = h.baseX + Math.cos(h.angle) * h.radius;
        let newZ = h.baseZ + Math.sin(h.angle) * h.radius;
        const roomMinX = 2 * ROOM_SIZE + 1, roomMaxX = 3 * ROOM_SIZE - 1;
        const roomMinZ = 3 * ROOM_SIZE + 1, roomMaxZ = 4 * ROOM_SIZE - 1;
        newX = Math.max(roomMinX, Math.min(roomMaxX, newX));
        newZ = Math.max(roomMinZ, Math.min(roomMaxZ, newZ));
        h.mesh.position.x = newX;
        h.mesh.position.z = newZ;
        h.mesh.position.y = h.baseY + Math.sin(time * h.ySpeed) * h.amplitude;
        h.mesh.lookAt(camera.position);
    }

    // Item sprites
    for (const it of itemAnimations) {
        it.mesh.position.y = it.baseY + Math.sin(time * it.speed + it.offset) * it.amplitude;
        it.mesh.lookAt(camera.position);
    }

    // Narration pending
    if (pendingNarration && !doorMsgActive && !narrationActive) {
        startNarration(pendingNarration);
        pendingNarration = null;
    }
}