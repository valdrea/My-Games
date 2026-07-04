// =============================================================
// CORE – main loop, initialization, game start
// =============================================================

const minimapCanvas = document.getElementById('minimap');
const minimapCtx = minimapCanvas.getContext('2d');

let fpsFrames = 0, fpsTime = 0;
function updateFPS(delta) {
    fpsFrames++;
    fpsTime += delta;
    if (fpsTime >= 0.5) {
        document.getElementById('fps-value').textContent = Math.round(fpsFrames / fpsTime);
        fpsFrames = 0;
        fpsTime = 0;
    }
}

function updateSkySphere() {
    if (window.skySphere) window.skySphere.position.copy(camera.position);
}

const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    const delta = Math.min(clock.getDelta(), 0.05);
    if (gameRunning) {
        updateSkySphere();
        yaw += (targetYaw - yaw) * 0.15;
        pitch += (targetPitch - pitch) * 0.15;
        camera.rotation.set(pitch, yaw, 0);

        const forward = new THREE.Vector3();
        camera.getWorldDirection(forward);
        forward.y = 0;
        forward.normalize();
        const right = new THREE.Vector3().crossVectors(forward, camera.up).normalize();
        const move = new THREE.Vector3();

        if (!narrationActive && !playerFrozen) {
            if (keys['w']) move.add(forward);
            if (keys['s']) move.sub(forward);
            if (keys['d']) move.add(right);
            if (keys['a']) move.sub(right);
            if (move.length() > 0) {
                move.normalize();
                const newPos = camera.position.clone().addScaledVector(move, MOVE_SPEED * delta);
                if (!checkCollision(newPos)) camera.position.copy(newPos);
            }
        }

        pushPlayerOutOfNPCs();
        doorList.forEach(d => d.update(delta));
        updateAnimations(delta);
        checkDoorCrossing();
        if (!narrationActive && !playerFrozen) updateInteractionRay();
        updateFPS(delta);
    }
    renderer.render(scene, camera);
}

async function startGame() {
    document.getElementById('start-screen').style.display = 'none';
    inventory = [];
    flags = {};
    stats = { willpower: 4, curiosity: 4, charm: 4, tempSpeedPenalty: 0 };
    spiteModifier = 0;
    previousRoomKey = null;
    visitedRooms.clear();
    doorList = [];
    doorMeshes = [];
    flags.narratedRooms = new Set();
    stopNarration();

    camera.position.set(2 * ROOM_SIZE + ROOM_SIZE / 2, 1.7, 2 * ROOM_SIZE + ROOM_SIZE / 2);
    targetYaw = 0; targetPitch = 0; yaw = 0; pitch = 0;

    await buildWorld();

    const skyTex = textureCache['assets/skybox.png'] || await loadTexture('assets/skybox.png');
    skyTex.wrapS = skyTex.wrapT = THREE.ClampToEdgeWrapping;
    skyTex.magFilter = THREE.LinearFilter;
    skyTex.minFilter = THREE.LinearMipmapLinearFilter;
    const skyGeo = new THREE.SphereGeometry(400, 64, 32);
    const skyMat = new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide });
    const skySphere = new THREE.Mesh(skyGeo, skyMat);
    scene.add(skySphere);
    window.skySphere = skySphere;

    previousRoomKey = getCurrentRoom();
    visitedRooms.add(previousRoomKey);
    gameRunning = true;
    updateHUD();
    updateMinimap();
    startNarration(previousRoomKey.replace(',', '-'));
    setTimeout(() => renderer.domElement.requestPointerLock(), 200);
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

initDieCanvas();
setupControls();
preloadAllAssets().then(() => {
    document.getElementById('loading-screen').style.display = 'none';
    document.getElementById('start-btn').style.display = 'inline-block';
});
animate();
updateMinimap();
window.startGame = startGame;