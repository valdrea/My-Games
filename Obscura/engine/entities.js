// =============================================================
// ENTITIES – NPC loading, item spawning, colliders, snow,
//            hummingbirds, and all world‑object helpers
// =============================================================

// --- Texture / GLB helpers ---

function createFallbackTexture() {
    const c = document.createElement('canvas');
    c.width = 64; c.height = 64;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#6a5a4a';
    ctx.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
}

function loadTexture(path) {
    return new Promise(resolve => {
        if (textureCache[path]) return resolve(textureCache[path]);
        const t = setTimeout(() => {
            const fallback = createFallbackTexture();
            textureCache[path] = fallback;
            resolve(fallback);
        }, 5000);
        loader.load(path, tex => {
            clearTimeout(t);
            tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
            tex.magFilter = THREE.LinearFilter;
            tex.minFilter = THREE.LinearMipmapLinearFilter;
            textureCache[path] = tex;
            resolve(tex);
        }, undefined, () => {
            clearTimeout(t);
            const fallback = createFallbackTexture();
            textureCache[path] = fallback;
            resolve(fallback);
        });
    });
}

function makeSpriteFallback(name, color = '#ffd700') {
    const c = document.createElement('canvas');
    c.width = 128; c.height = 128;
    const ctx = c.getContext('2d');
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 128, 128);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 6;
    ctx.strokeRect(4, 4, 120, 120);
    ctx.fillStyle = '#000';
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const words = (name || '?').split(' ');
    if (words.length === 1) ctx.fillText(words[0].substring(0, 8), 64, 64);
    else { ctx.fillText(words[0].substring(0, 8), 64, 46); ctx.fillText(words[1].substring(0, 8), 64, 78); }
    return new THREE.CanvasTexture(c);
}

function loadSpriteTexture(path, name, color) {
    return new Promise(resolve => {
        const t = setTimeout(() => resolve(makeSpriteFallback(name, color)), 5000);
        loader.load(path, tex => {
            clearTimeout(t);
            tex.magFilter = THREE.LinearFilter;
            tex.minFilter = THREE.LinearFilter;
            resolve(tex);
        }, undefined, () => {
            clearTimeout(t);
            resolve(makeSpriteFallback(name, color));
        });
    });
}

async function loadGLB(path) {
    return new Promise(resolve => {
        const timeout = setTimeout(() => resolve(null), 8000);
        gltfLoader.load(path, gltf => { clearTimeout(timeout); resolve(gltf.scene); }, undefined, () => { clearTimeout(timeout); resolve(null); });
    });
}

function tuneModelMaterials(model, config = {}) {
    model.traverse(child => {
        if (child.isMesh && child.material) {
            const materials = Array.isArray(child.material) ? child.material : [child.material];
            materials.forEach(mat => {
                if (mat.isMeshStandardMaterial) {
                    mat.roughness = config.roughness != null ? config.roughness : Math.min(mat.roughness, 0.45);
                    mat.metalness = config.metalness != null ? config.metalness : Math.max(mat.metalness, 0.0);
                    if (config.emissiveIntensity != null) {
                        mat.emissive = new THREE.Color(config.emissiveIntensity, config.emissiveIntensity, config.emissiveIntensity);
                    } else {
                        mat.emissive = new THREE.Color(0x222222);
                    }
                }
            });
        }
    });
}

async function loadModelOrFallback(glbPath, fallbackCreator, config = {}) {
    if (!glbPath) return fallbackCreator();
    try {
        const model = await loadGLB(glbPath);
        if (model) {
            model.scale.set(2, 2, 2);
            model.position.y -= 1.0;
            tuneModelMaterials(model, config);
            return model;
        }
    } catch (e) {}
    return fallbackCreator();
}

// --- Collider helpers ---

function addCollider(x, y, z, w, h, d) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ visible: false }));
    mesh.position.set(x, y, z);
    scene.add(mesh);
    worldObjects.push(mesh);
    colliders.push({ pos: mesh.position.clone(), size: new THREE.Vector3(w / 2, h / 2, d / 2), mesh, type: 'box' });
}

function addCylinderCollider(x, y, z, radius, height) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, 8), new THREE.MeshBasicMaterial({ visible: false }));
    mesh.position.set(x, y, z);
    scene.add(mesh);
    worldObjects.push(mesh);
    colliders.push({ pos: mesh.position.clone(), radius, height, mesh, type: 'cylinder' });
}

function createWallWithHole(tex, width, height, doorW, doorH, doorY) {
    const shape = new THREE.Shape();
    const hw = width / 2, hh = height / 2;
    shape.moveTo(-hw, -hh); shape.lineTo(hw, -hh); shape.lineTo(hw, hh); shape.lineTo(-hw, hh); shape.lineTo(-hw, -hh);
    const dhw = doorW / 2, dhh = doorH / 2, cy = -hh + doorY + doorH / 2;
    const hole = new THREE.Path();
    hole.moveTo(-dhw, cy - dhh); hole.lineTo(dhw, cy - dhh); hole.lineTo(dhw, cy + dhh); hole.lineTo(-dhw, cy + dhh); hole.lineTo(-dhw, cy - dhh);
    shape.holes.push(hole);
    const geo = new THREE.ShapeGeometry(shape);
    const pos = geo.attributes.position;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), y = pos.getY(i);
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
    const rX = maxX - minX || 1, rY = maxY - minY || 1;
    const uvs = new Float32Array(pos.count * 2);
    for (let i = 0; i < pos.count; i++) {
        uvs[i * 2] = (pos.getX(i) - minX) / rX;
        uvs[i * 2 + 1] = (pos.getY(i) - minY) / rY;
    }
    geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    return new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ map: tex, color: 0xffffff, side: THREE.DoubleSide }));
}

async function createStaticPlane(texturePath, width, height, position, rotationY, depth = 0.3) {
    const tex = await loadTexture(texturePath);
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide });
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(width, height), mat);
    plane.position.set(position.x, position.y, position.z);
    plane.rotation.y = rotationY || 0;
    scene.add(plane);
    worldObjects.push(plane);
    const colliderMesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), new THREE.MeshBasicMaterial({ visible: false }));
    colliderMesh.position.copy(plane.position);
    colliderMesh.rotation.copy(plane.rotation);
    scene.add(colliderMesh);
    worldObjects.push(colliderMesh);
    colliders.push({ pos: colliderMesh.position.clone(), size: new THREE.Vector3(width / 2, height / 2, depth / 2), mesh: colliderMesh, type: 'box' });
    return plane;
}

// --- Item / NPC helpers ---

async function spawnTemporaryItem(itemId, pos) {
    const itemData = ITEMS[itemId];
    if (!itemData) return;
    const tex = await loadSpriteTexture(itemData.texture, itemData.name, '#ffd700');
    const geo = new THREE.PlaneGeometry(2.5, 2.5);
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide, depthWrite: false });
    const mesh = new THREE.Mesh(geo, mat);
    const rc = getRoomCoords(getCurrentRoom());
    const offsetX = (Math.random() - 0.5) * 6.0;
    const offsetZ = (Math.random() - 0.5) * 6.0;
    mesh.position.set(
        rc.rx * ROOM_SIZE + ROOM_SIZE / 2 + (pos.x || 0) + offsetX,
        pos.y || 1.5,
        rc.rz * ROOM_SIZE + ROOM_SIZE / 2 + (pos.z || 0) + offsetZ
    );
    mesh.userData = { itemId };
    scene.add(mesh);
    worldObjects.push(mesh);
    itemSprites.set(mesh, itemId);
    itemAnimations.push({ mesh, baseY: mesh.position.y, speed: 6, amplitude: 0.12, offset: Math.random() * Math.PI * 2 });
}

async function replaceEaselWithPortrait(index) {
    const oldEasel = easelModels[index];
    if (!oldEasel) return;
    scene.remove(oldEasel);
    const woIdx = worldObjects.indexOf(oldEasel);
    if (woIdx !== -1) worldObjects.splice(woIdx, 1);
    const colMesh = easelColliders[index];
    if (colMesh) {
        scene.remove(colMesh);
        const colIdx = worldObjects.indexOf(colMesh);
        if (colIdx !== -1) worldObjects.splice(colIdx, 1);
        colliders = colliders.filter(c => c.mesh !== colMesh);
        easelColliders[index] = null;
    }

    const newModel = await loadGLB('assets/replacement_portrait.glb');
    if (newModel) {
        newModel.position.copy(oldEasel.position);
        newModel.rotation.copy(oldEasel.rotation);
        newModel.rotation.y += Math.PI;
        newModel.scale.set(2, 2, 2);
        scene.add(newModel);
        worldObjects.push(newModel);
        easelModels[index] = newModel;
        const newCol = new THREE.Mesh(new THREE.BoxGeometry(2.5, 3.5, 0.3), new THREE.MeshBasicMaterial({ visible: false }));
        newCol.position.copy(newModel.position);
        newCol.rotation.copy(newModel.rotation);
        scene.add(newCol);
        worldObjects.push(newCol);
        colliders.push({ pos: newCol.position.clone(), size: new THREE.Vector3(2.5 / 2, 3.5 / 2, 0.3 / 2), mesh: newCol, type: 'box' });
        easelColliders[index] = newCol;
    }
}

async function changeRoomFloor(roomKey, texturePath) {
    const mesh = roomFloorMeshes[roomKey];
    if (!mesh) return;
    const tex = await loadTexture(texturePath);
    mesh.material.map = tex;
    mesh.material.needsUpdate = true;
}

// --- Snow system ---

function initSnowSystem() {
    if (snowTexture) return;
    const canvas = document.createElement('canvas');
    canvas.width = 8; canvas.height = 8;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(4, 4, 3, 0, Math.PI * 2);
    ctx.fill();
    snowTexture = new THREE.CanvasTexture(canvas);
    snowTexture.needsUpdate = true;
}

function spawnSnowForRoom(roomKey) {
    if (roomKey !== '4,2') {
        for (const p of snowParticles) {
            scene.remove(p.mesh);
            const idx = worldObjects.indexOf(p.mesh);
            if (idx !== -1) worldObjects.splice(idx, 1);
        }
        snowParticles = [];
        return;
    }
    if (snowParticles.length > 0) return;
    if (!snowTexture) initSnowSystem();
    const roomCX = 3 * ROOM_SIZE + ROOM_SIZE / 2, roomCZ = 1 * ROOM_SIZE + ROOM_SIZE / 2;
    for (let i = 0; i < 50; i++) {
        const geo = new THREE.PlaneGeometry(0.3, 0.3);
        const mat = new THREE.MeshBasicMaterial({ map: snowTexture, transparent: true, side: THREE.DoubleSide, depthWrite: false });
        const flake = new THREE.Mesh(geo, mat);
        const x = roomCX - ROOM_SIZE / 2 + Math.random() * ROOM_SIZE;
        const y = 0.5 + Math.random() * WALL_HEIGHT;
        const z = roomCZ - ROOM_SIZE / 2 + Math.random() * ROOM_SIZE;
        flake.position.set(x, y, z);
        scene.add(flake);
        worldObjects.push(flake);
        snowParticles.push({ mesh: flake, speed: 0.3 + Math.random() * 0.4, offset: Math.random() * 100 });
    }
}

function removeHummingbirds() {
    for (const h of hummingbirds) {
        scene.remove(h.mesh);
        const idx = worldObjects.indexOf(h.mesh);
        if (idx !== -1) worldObjects.splice(idx, 1);
    }
    hummingbirds = [];
}

// --- Preload ---

async function preloadAllAssets() {
    await Promise.all(ALL_TEXTURE_PATHS.map(p => loadTexture(p)));
    await Promise.all(ALL_GLB_PATHS.map(p => loadGLB(p).catch(() => null)));
}