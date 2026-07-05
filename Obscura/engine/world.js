// =============================================================
// THE PAVILION OF FALSE HORIZONS – WORLD BUILDER
// =============================================================

// Self‑contained helper – does not depend on controls.js
function getRoomCoordsLocal(roomKey) {
    const p = roomKey.split(',');
    return { rx: parseInt(p[0]) - 1, rz: parseInt(p[1]) - 1 };
}

async function loadAllTextures() {
    const floorTex = textureCache['assets/floor.png'] || await loadTexture('assets/floor.png');
    const ceilingTex = textureCache['assets/ceiling.png'] || await loadTexture('assets/ceiling.png');
    const walls = {};
    for (let i=1; i<=25; i++) {
        const key = `assets/wall_${i}.png`;
        walls[i] = textureCache[key] || await loadTexture(key);
    }
    return { floor: floorTex, ceiling: ceilingTex, walls };
}

async function buildWorld(){
    const worldTextures = await loadAllTextures();

    worldObjects.forEach(o=>scene.remove(o));
    colliders=[];worldObjects=[];itemSprites.clear();npcMeshes.clear();doorList=[];doorMeshes=[];
    floatAnimations=[]; wanderAnimations=[]; billboards=[]; itemAnimations=[];
    hummingbirds=[]; easelModels = [null,null]; easelColliders = [null,null];
    roomFloorMeshes = {};
    window.hedgeBlocks = [];
    window.robin = null;
    window.snowParticles = [];
    pendulumObjects.length = 0;
    cuckoos.length = 0;
    window.stars = [];          // floating stars in observatory
    window.spotlight = null;    // moving spotlight in theater
    window.theaterCX = 0;       // used by spotlight animation
    window.theaterCZ = 0;

    greenDoorTex = textureCache['assets/green_door.png'] || await loadTexture('assets/green_door.png');
    blackDoorTex = textureCache['assets/black_door.png'] || await loadTexture('assets/black_door.png');

    // 1. ROOMS (walls + floors)
    for(let rx=0;rx<GRID_SIZE;rx++) for(let rz=0;rz<GRID_SIZE;rz++){
        const roomKey=`${rx+1},${rz+1}`,room=ROOMS[roomKey];if(!room)continue;
        const cx=rx*ROOM_SIZE+ROOM_SIZE/2,cz=rz*ROOM_SIZE+ROOM_SIZE/2;
        const wt=worldTextures.walls[room.wallIndex]||worldTextures.walls[1];

        const floorTexKey = room.floorTex || 'assets/floor.png';
        const floorTex = textureCache[floorTexKey] || await loadTexture(floorTexKey);
        const floor=new THREE.Mesh(new THREE.PlaneGeometry(ROOM_SIZE,ROOM_SIZE),new THREE.MeshLambertMaterial({map:floorTex,color:0xffffff}));
        floor.rotation.x=-Math.PI/2;floor.position.set(cx,0,cz);scene.add(floor);worldObjects.push(floor);
        roomFloorMeshes[roomKey] = floor;

        [[0,0,-ROOM_SIZE/2+0.03,0,0,0],[0,0,ROOM_SIZE/2-0.03,0,Math.PI,0],
         [-ROOM_SIZE/2+0.03,0,0,0,-Math.PI/2,0],[ROOM_SIZE/2-0.03,0,0,0,Math.PI/2,0]
        ].forEach(([x,y,z,rx_,ry,rz_])=>{
            const w=createWallWithHole(wt,ROOM_SIZE,WALL_HEIGHT,DOOR_W,DOOR_H,DOOR_Y_OFFSET);
            w.position.set(cx+x,WALL_HEIGHT/2,cz+z);w.rotation.set(rx_,ry,rz_);
            scene.add(w);worldObjects.push(w);
        });

        const nz=cz-ROOM_SIZE/2,sz=cz+ROOM_SIZE/2,wx=cx-ROOM_SIZE/2,ex=cx+ROOM_SIZE/2;
        const lw=(ROOM_SIZE-DOOR_W)/2,th=WALL_HEIGHT-(DOOR_Y_OFFSET+DOOR_H),ty=(DOOR_Y_OFFSET+DOOR_H)+th/2;
        [[cx-lw/2-DOOR_W/2,WALL_HEIGHT/2,nz,lw,WALL_HEIGHT,0.3],[cx+lw/2+DOOR_W/2,WALL_HEIGHT/2,nz,lw,WALL_HEIGHT,0.3],[cx,ty,nz,DOOR_W,th,0.3],
         [cx-lw/2-DOOR_W/2,WALL_HEIGHT/2,sz,lw,WALL_HEIGHT,0.3],[cx+lw/2+DOOR_W/2,WALL_HEIGHT/2,sz,lw,WALL_HEIGHT,0.3],[cx,ty,sz,DOOR_W,th,0.3],
         [wx,WALL_HEIGHT/2,cz-lw/2-DOOR_W/2,0.3,WALL_HEIGHT,lw],[wx,WALL_HEIGHT/2,cz+lw/2+DOOR_W/2,0.3,WALL_HEIGHT,lw],[wx,ty,cz,0.3,th,DOOR_W],
         [ex,WALL_HEIGHT/2,cz-lw/2-DOOR_W/2,0.3,WALL_HEIGHT,lw],[ex,WALL_HEIGHT/2,cz+lw/2+DOOR_W/2,0.3,WALL_HEIGHT,lw],[ex,ty,cz,0.3,th,DOOR_W]
        ].forEach(p=>addCollider(p[0],p[1],p[2],p[3],p[4],p[5]));
    }

    // 2. STATIC PROPS (unchanged sections omitted for brevity – included in full file)
    // (The study, ballroom, gallery, nursery, court, aviary, hedge maze, graveyard, wardrobe,
    //  cuckoo birds, doll trashpile billboard, stone tablet, hungry plants, and doors remain
    //  exactly as they were in the last known good world.js. I'll re‑insert them completely.)

    // Study (3,3)
    const studyCX = 2*ROOM_SIZE+ROOM_SIZE/2, studyCZ = 2*ROOM_SIZE+ROOM_SIZE/2;
    const libDesk = await loadModelOrFallback('assets/library_desk.glb', async () => {
        return await createStaticPlane('assets/library_desk.png', 4, 3, { x: studyCX+5, y: 0, z: studyCZ+ROOM_SIZE/2-4 }, Math.PI);
    });
    libDesk.position.set(studyCX+5, 0, studyCZ+ROOM_SIZE/2-2);
    libDesk.rotation.y = Math.PI;
    scene.add(libDesk); worldObjects.push(libDesk);
    addCollider(studyCX+5, 1.0, studyCZ+ROOM_SIZE/2-2, 4, 3, 0.5);

    const fire = await loadModelOrFallback('assets/blue_fireplace.glb', async () => {
        const tex = await loadTexture('assets/blue_fireplace.png');
        const plane = new THREE.Mesh(new THREE.PlaneGeometry(4,4), new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide }));
        plane.position.set(studyCX - ROOM_SIZE/2 + 4, 0, studyCZ - ROOM_SIZE/2 + 2);
        plane.rotation.y = Math.PI/4;
        return plane;
    });
    fire.position.set(studyCX - ROOM_SIZE/2 + 4, 0, studyCZ - ROOM_SIZE/2 + 4);
    fire.rotation.y = Math.PI/4;
    fire.scale.multiplyScalar(1.5);
    scene.add(fire); worldObjects.push(fire);
    addCylinderCollider(studyCX - ROOM_SIZE/2 + 4, 1.5, studyCZ - ROOM_SIZE/2 + 4, 1.5, 3);

    // Ballroom (2,3) – floating props, no collision
    const ballCX = 1*ROOM_SIZE+ROOM_SIZE/2, ballCZ = 2*ROOM_SIZE+ROOM_SIZE/2;
    for (let i=0;i<2;i++) {
        const chanTex = await loadSpriteTexture('assets/chandelier.png','Chandelier','#ffd700');
        const chanMesh = new THREE.Mesh(new THREE.PlaneGeometry(3,3), new THREE.MeshBasicMaterial({ map:chanTex, transparent:true, side:THREE.DoubleSide, depthWrite:false }));
        const baseY = 5.8 + i*0.4; chanMesh.position.set(ballCX + (i===0?-4:4), baseY, ballCZ + (i===0?-4:4));
        scene.add(chanMesh); worldObjects.push(chanMesh); billboards.push(chanMesh);
        floatAnimations.push({ mesh:chanMesh, baseY, amplitude:0.3, speed:1.5, offset:i*Math.PI });
    }
    const chairPositions = [ { x:ballCX-4,y:1.8,z:ballCZ+3}, {x:ballCX+5,y:2.5,z:ballCZ-2} ];
    for (let i=0;i<2;i++) {
        const chairTex = await loadSpriteTexture('assets/floating_chair.png','Chair','#ffd700');
        const chairMesh = new THREE.Mesh(new THREE.PlaneGeometry(2.5,2.5), new THREE.MeshBasicMaterial({ map:chairTex, transparent:true, side:THREE.DoubleSide, depthWrite:false }));
        const pos = chairPositions[i]; chairMesh.position.set(pos.x,pos.y,pos.z);
        scene.add(chairMesh); worldObjects.push(chairMesh); billboards.push(chairMesh);
        floatAnimations.push({ mesh:chairMesh, baseY:pos.y, amplitude:0.25, speed:1.8+i*0.2, offset:i*0.7 });
    }

    // Gallery (1,3)
    const galCX = 0*ROOM_SIZE+ROOM_SIZE/2, galCZ = 2*ROOM_SIZE+ROOM_SIZE/2;
    for (let i=0;i<2;i++) {
        const x = galCX + (i===0 ? -4 : 4);
        const z = galCZ + 4;
        const easel = await loadModelOrFallback('assets/easel.glb', async () => {
            return await createStaticPlane('assets/easel.png', 2.5, 3.5, { x, y:0, z: z+0.3 }, Math.PI);
        });
        easel.position.set(x, 0, z+0.3);
        easel.rotation.y = Math.PI;
        scene.add(easel); worldObjects.push(easel);
        const colMesh = new THREE.Mesh(new THREE.BoxGeometry(2.5, 3.5, 0.3), new THREE.MeshBasicMaterial({visible:false}));
        colMesh.position.copy(easel.position); colMesh.rotation.copy(easel.rotation);
        scene.add(colMesh); worldObjects.push(colMesh);
        colliders.push({ pos: colMesh.position.clone(), size: new THREE.Vector3(2.5/2, 3.5/2, 0.3/2), mesh: colMesh, type:'box' });
        easelModels[i] = easel; easelColliders[i] = colMesh;
    }

    // Nursery (2,4)
    const nurseryCX = 1*ROOM_SIZE+ROOM_SIZE/2, nurseryCZ = 3*ROOM_SIZE+ROOM_SIZE/2;
    const desk = await loadModelOrFallback('assets/Gesso_desk.glb', async () => {
        return await createStaticPlane('assets/Gesso_desk.png', 6, 3.75, { x:nurseryCX+ROOM_SIZE/2-4, y:0, z:nurseryCZ+ROOM_SIZE/2-4 }, -Math.PI/4);
    });
    desk.position.set(nurseryCX+ROOM_SIZE/2-4, 0, nurseryCZ+ROOM_SIZE/2-4);
    desk.rotation.y = -Math.PI/4;
    scene.add(desk); worldObjects.push(desk);
    addCollider(desk.position.x, 1.5, desk.position.z, 6, 3.75, 6);

    const cradleTex = await loadTexture('assets/fenced_cradles.png');
    const cradlePositions = [
        { pos: [nurseryCX+5, 0, nurseryCZ-ROOM_SIZE/2+5], rot: 0 },
        { pos: [nurseryCX-ROOM_SIZE/2+5, 0, nurseryCZ-3], rot: -Math.PI/2 },
        { pos: [nurseryCX+ROOM_SIZE/2-5, 0, nurseryCZ+3], rot: Math.PI/2 }
    ];
    for (const {pos, rot} of cradlePositions) {
        const cradle = await loadModelOrFallback('assets/fenced_cradles.glb', async () => {
            const plane = new THREE.Mesh(new THREE.PlaneGeometry(3,2), new THREE.MeshBasicMaterial({ map: cradleTex, transparent:true, side:THREE.DoubleSide }));
            plane.position.set(...pos); plane.rotation.y = rot; return plane;
        });
        cradle.position.set(pos[0], pos[1], pos[2]+0.3); cradle.rotation.y = rot;
        scene.add(cradle); worldObjects.push(cradle);
        addCollider(pos[0], 1.0, pos[2]+0.3, 3, 2, 0.3);
    }

    // Doll trashpile as billboard sprite
    const trashTex = await loadSpriteTexture('assets/doll_trashpile.png', 'Trashpile', '#ffd700');
    const trashSprite = new THREE.Mesh(new THREE.PlaneGeometry(3, 3), new THREE.MeshBasicMaterial({ map: trashTex, transparent: true, side: THREE.DoubleSide, depthWrite: false }));
    trashSprite.position.set(nurseryCX-7, 1.5, nurseryCZ-7);
    trashSprite.rotation.y = 0;
    scene.add(trashSprite); worldObjects.push(trashSprite);
    billboards.push(trashSprite);

    // Court (4,3) – Queen’s bench
    const courtCX = 3*ROOM_SIZE+ROOM_SIZE/2, courtCZ = 2*ROOM_SIZE+ROOM_SIZE/2;
    const bench = await loadModelOrFallback('assets/marble_bench.glb', async () => {
        return await createStaticPlane('assets/marble_bench.png', 3, 2, { x: courtCX, y: 0, z: courtCZ + 2 }, 0);
    });
    bench.position.set(courtCX, 0, courtCZ -1);
    bench.scale.set(3, 3, 3);
    scene.add(bench); worldObjects.push(bench);
    addCylinderCollider(courtCX, 1.0, courtCZ -1, 2.0, 2.0);

    // Aviary (3,4)
    const aviaryCX = 2*ROOM_SIZE+ROOM_SIZE/2, aviaryCZ = 3*ROOM_SIZE+ROOM_SIZE/2;
    const roomMinX = aviaryCX - ROOM_SIZE/2 + 1, roomMaxX = aviaryCX + ROOM_SIZE/2 - 1;
    const roomMinZ = aviaryCZ - ROOM_SIZE/2 + 1, roomMaxZ = aviaryCZ + ROOM_SIZE/2 - 1;
    const hbirdTextures = ['glass_Hbird.png', 'glass_Hbird2.png', 'glass_Hbird3.png'];
    for (let i=0; i<6; i++) {
        const texName = hbirdTextures[i % 3];
        const tex = await loadSpriteTexture(`assets/${texName}`, 'Hummingbird', '#ffd700');
        const birdMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.5), new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide, depthWrite: false }));
        const angle = (i / 6) * Math.PI * 2;
        const radius = 5 + Math.random() * 3;
        let baseX = aviaryCX + Math.cos(angle) * radius;
        let baseZ = aviaryCZ + Math.sin(angle) * radius;
        baseX = Math.max(roomMinX, Math.min(roomMaxX, baseX));
        baseZ = Math.max(roomMinZ, Math.min(roomMaxZ, baseZ));
        const baseY = 4.5 + Math.random() * 2;
        birdMesh.position.set(baseX, baseY, baseZ);
        scene.add(birdMesh); worldObjects.push(birdMesh);
        billboards.push(birdMesh);
        hummingbirds.push({
            mesh: birdMesh, baseX, baseZ, baseY,
            radius, angle, speed: 0.5 + Math.random() * 0.5,
            amplitude: 0.3, ySpeed: 1 + Math.random()
        });
    }

    // Hedge Maze (4,4)
    const hedgeCX = 3*ROOM_SIZE+ROOM_SIZE/2, hedgeCZ = 3*ROOM_SIZE+ROOM_SIZE/2;
    const hedgePositions = [
        { x: hedgeCX-5, z: hedgeCZ-5, angle: 0 },
        { x: hedgeCX+5, z: hedgeCZ-5, angle: Math.PI/2 },
        { x: hedgeCX+5, z: hedgeCZ+5, angle: Math.PI },
        { x: hedgeCX-5, z: hedgeCZ+5, angle: -Math.PI/2 }
    ];
    for (let i=0; i<4; i++) {
        const hb = await loadModelOrFallback('assets/hedgeblock.glb', async () => {
            return await createStaticPlane('assets/hedgeblock.png', 5, 2, { x: hedgePositions[i].x, y: 0, z: hedgePositions[i].z }, hedgePositions[i].angle);
        });
        hb.position.set(hedgePositions[i].x, 0, hedgePositions[i].z);
        hb.rotation.y = hedgePositions[i].angle;
        hb.scale.set(1.5, 1.5, 3.0);
        scene.add(hb); worldObjects.push(hb);
        const colMesh = new THREE.Mesh(new THREE.BoxGeometry(5, 1, 6), new THREE.MeshBasicMaterial({visible:false}));
        colMesh.position.copy(hb.position);
        colMesh.rotation.y = hb.rotation.y;
        scene.add(colMesh); worldObjects.push(colMesh);
        colliders.push({ pos: colMesh.position.clone(), size: new THREE.Vector3(2.5, 0.5, 3), mesh: colMesh, type:'box' });
        window.hedgeBlocks.push({
            mesh: hb,
            colliderMesh: colMesh,
            baseX: hedgePositions[i].x,
            baseZ: hedgePositions[i].z,
            phase: i * Math.PI/2,
            speed: 0.3,
            amplitude: 2.0
        });
    }

    // Graveyard (5,3)
    const graveCX = 4*ROOM_SIZE+ROOM_SIZE/2, graveCZ = 2*ROOM_SIZE+ROOM_SIZE/2;
    const keyPlantTexs = ['key_plant.png', 'key_plant2.png', 'key_plant3.png'];
    for (let i=0; i<25; i++) {
        const texName = keyPlantTexs[Math.floor(Math.random() * keyPlantTexs.length)];
        const tex = await loadSpriteTexture(`assets/${texName}`, 'Key Plant', '#ffd700');
        const plantMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.6), new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide, depthWrite: false }));
        const px = graveCX - ROOM_SIZE/2 + 2 + Math.random() * (ROOM_SIZE-4);
        const pz = graveCZ - ROOM_SIZE/2 + 2 + Math.random() * (ROOM_SIZE-4);
        plantMesh.position.set(px, 0.2, pz);
        plantMesh.scale.set(1.33, 1.33, 1.33);
        scene.add(plantMesh); worldObjects.push(plantMesh);
        billboards.push(plantMesh);
    }

    const robinTex = await loadSpriteTexture('assets/robin.png', 'Robin', '#ff8c00');
    const robinMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.8), new THREE.MeshBasicMaterial({ map: robinTex, transparent: true, side: THREE.DoubleSide, depthWrite: false }));
    robinMesh.position.set(graveCX - 2, 0.4, graveCZ + 2);
    scene.add(robinMesh); worldObjects.push(robinMesh);
    billboards.push(robinMesh);
    window.robin = {
        mesh: robinMesh,
        baseX: graveCX - 2, baseZ: graveCZ + 2,
        hopTimer: 0, hopInterval: 2.5,
        targetX: graveCX - 2, targetZ: graveCZ + 2,
        speed: 1.8,
        hopHeight: 0.6
    };

    // Wardrobe (4,2)
    const wardrobeCX = 3*ROOM_SIZE+ROOM_SIZE/2, wardrobeCZ = 1*ROOM_SIZE+ROOM_SIZE/2;
    const backWallTex = await loadTexture('assets/4-2_back_wall.png');
    const backWall = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_SIZE, WALL_HEIGHT), new THREE.MeshLambertMaterial({ map: backWallTex, color: 0xffffff, side: THREE.DoubleSide }));
    backWall.position.set(wardrobeCX, WALL_HEIGHT/2, wardrobeCZ - ROOM_SIZE/2 + 0.1);
    backWall.rotation.set(0, 0, 0);
    scene.add(backWall); worldObjects.push(backWall);

    const bigSnowTex = await loadTexture('assets/big_snowpile.png');
    const bigSnow = new THREE.Mesh(new THREE.PlaneGeometry(8, 4), new THREE.MeshBasicMaterial({ map: bigSnowTex, transparent: true, side: THREE.DoubleSide }));
    bigSnow.position.set(wardrobeCX, 1.5, wardrobeCZ - ROOM_SIZE/2 + 5);
    bigSnow.rotation.y = 0;
    scene.add(bigSnow); worldObjects.push(bigSnow);
    addCollider(wardrobeCX, 1.5, wardrobeCZ - ROOM_SIZE/2 + 5, 8, 3, 0.5);

    for (let i=0; i<2; i++) {
        const sp = await loadModelOrFallback('assets/snowpile.glb', async () => {
            const tex = await loadTexture('assets/snowpile.png');
            const plane = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide }));
            plane.position.set(wardrobeCX + (i===0?-4:4), 0.3, wardrobeCZ - 2);
            return plane;
        });
        sp.position.set(wardrobeCX + (i===0?-4:4), 0.3, wardrobeCZ - 2);
        scene.add(sp); worldObjects.push(sp);
        addCollider(sp.position.x, 0.5, sp.position.z, 2, 1, 2);
    }

    for (let i=0; i<3; i++) {
        const spTex = await loadSpriteTexture('assets/snowpile.png', 'Snowpile', '#ffffff');
        const spSprite = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.5), new THREE.MeshBasicMaterial({ map: spTex, transparent: true, side: THREE.DoubleSide, depthWrite: false }));
        spSprite.position.set(wardrobeCX + (i-1)*3, 0.2, wardrobeCZ + 3);
        scene.add(spSprite); worldObjects.push(spSprite);
        billboards.push(spSprite);
    }

    const cloudTex = await loadSpriteTexture('assets/sad_cloud.png', 'Sad Cloud', '#aaccff');
    const cloudMesh = new THREE.Mesh(new THREE.PlaneGeometry(3, 2), new THREE.MeshBasicMaterial({ map: cloudTex, transparent: true, side: THREE.DoubleSide, depthWrite: false }));
    cloudMesh.position.set(wardrobeCX, 5.5, wardrobeCZ);
    scene.add(cloudMesh); worldObjects.push(cloudMesh);
    billboards.push(cloudMesh);
    floatAnimations.push({ mesh: cloudMesh, baseY: 5.5, amplitude: 0.5, speed: 0.8, offset: 0 });

    // Cuckoo birds (2,5)
    const clockCX = 1*ROOM_SIZE+ROOM_SIZE/2, clockCZ = 4*ROOM_SIZE+ROOM_SIZE/2;
    const cuckooTexKeys = ['green_cuckoo.png', 'orange_cuckoo.png', 'pride_cuckoo.png'];
    const cuckooPositions = [
        { x: clockCX-4, z: clockCZ+3 },
        { x: clockCX+4, z: clockCZ-2 },
        { x: clockCX+5, z: clockCZ+4 }
    ];
    for (let i=0; i<3; i++) {
        const tex = await loadSpriteTexture(`assets/${cuckooTexKeys[i]}`, 'Cuckoo', '#ffd700');
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide, depthWrite: false }));
        const pos = cuckooPositions[i];
        mesh.position.set(pos.x, 1.5, pos.z);
        mesh.scale.set(0.666, 0.666, 0.666);
        scene.add(mesh); worldObjects.push(mesh);
        billboards.push(mesh);
        cuckoos.push({
            mesh,
            baseX: pos.x,
            baseZ: pos.z,
            baseY: 1.5,
            phase: i * 2.0,
            speed: 0.8,
            amplitude: 0.4,
            bobAmp: 0.0
        });
    }

    // 3. NPCS (using local getRoomCoords)
    const npcEntries = Object.values(NPCS);
    for (let i = 0; i < npcEntries.length; i++) {
        const npcData = npcEntries[i];
        if (!npcData || !npcData.roomKey) {
            console.warn('Skipping NPC (missing data or roomKey):', npcData ? npcData.id : '(undefined)');
            continue;
        }

        const rc = getRoomCoordsLocal(npcData.roomKey);
        if (!rc) {
            console.warn('Invalid roomKey for NPC:', npcData.id, npcData.roomKey);
            continue;
        }
        const baseX = rc.rx * ROOM_SIZE + ROOM_SIZE / 2 + (npcData.position.x || 0);
        const baseZ = rc.rz * ROOM_SIZE + ROOM_SIZE / 2 + (npcData.position.z || 0);
        const scale = npcData.scale || 2.5;

        const npc = await loadModelOrFallback(npcData.glb, async () => {
            const tex = await loadSpriteTexture(npcData.texture, npcData.name, '#334466');
            const geo = new THREE.PlaneGeometry(scale, scale);
            const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide, depthWrite: false });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.set(baseX, npcData.position.y || 1.8, baseZ);
            billboards.push(mesh);
            return mesh;
        }, npcData.materialConfig || {});

        if (npcData.glbScale) { const s = npcData.glbScale; npc.scale.set(s, s, s); }
        if (npcData.glbRotation) { npc.rotation.y = npcData.glbRotation; }
        npc.position.set(baseX, npcData.position.y || 1.8, baseZ);

        if (npcData.id === 'Grand_Pendulum') {
            npc.position.y += 1.0;
            pendulumObjects.push({ mesh: npc, phase: Math.random() * Math.PI * 2 });
        }

        scene.add(npc); worldObjects.push(npc); npcMeshes.set(npc, npcData.id);

        const radius = npcData.colliderRadius || (scale * 0.5);
        const height = scale * 0.9;
        addCylinderCollider(baseX, npcData.position.y, baseZ, radius, height);
        const cylinder = colliders[colliders.length - 1];

        if (npcData.floatBounce) {
            floatAnimations.push({ mesh: npc, baseY: npcData.position.y, amplitude: npcData.floatBounce.amplitude, speed: npcData.floatBounce.speed, offset: Math.random() * Math.PI * 2 });
        }
        if (npcData.wander) {
            wanderAnimations.push({
                mesh: npc,
                collider: cylinder,
                roomKey: npcData.roomKey,
                basePos: new THREE.Vector3(baseX, npcData.position.y, baseZ),
                speed: npcData.wander.speed,
                radius: npcData.wander.radius,
                timer: 0,
                targetPos: new THREE.Vector3(baseX, npcData.position.y, baseZ),
                active: true,
                heading: 0,
                vertical: npcData.verticalWander || false,
                verticalBase: npcData.verticalWander ? 2.5 : npcData.position.y
            });
        }
    }

    // Stone Tablet (1,5)
    const tabletCX = 0 * ROOM_SIZE + ROOM_SIZE / 2;
    const tabletCZ = 4 * ROOM_SIZE + ROOM_SIZE / 2;
    const tabletModel = await loadModelOrFallback('assets/stonetablet.glb', async () => {
        return await createStaticPlane('assets/stonetablet.png', 3, 4, { x: tabletCX+1.5, y: 0, z: tabletCZ+1.5 }, 0);
    });
    tabletModel.position.set(tabletCX+1.5, 0, tabletCZ+1.5);
    tabletModel.rotation.y = Math.PI;
    tabletModel.scale.set(2.5, 2.5, 2.5);
    scene.add(tabletModel); worldObjects.push(tabletModel);
    addCollider(tabletCX+1.5, 1.5, tabletCZ+1.5, 3, 4, 1);

    // Hungry plants (1,4)
    const conservCX = 0*ROOM_SIZE+ROOM_SIZE/2;
    const conservCZ = 3*ROOM_SIZE+ROOM_SIZE/2;
    const plantTexKeys = ['hungry_tree.png', 'hungry_lilly.png', 'hungry_rose.png', 'hungry_sunflower.png'];
    const corners = [
        { x: conservCX - ROOM_SIZE/2 + 3, z: conservCZ - ROOM_SIZE/2 + 3 },
        { x: conservCX + ROOM_SIZE/2 - 3, z: conservCZ - ROOM_SIZE/2 + 3 },
        { x: conservCX - ROOM_SIZE/2 + 3, z: conservCZ + ROOM_SIZE/2 - 3 },
        { x: conservCX + ROOM_SIZE/2 - 3, z: conservCZ + ROOM_SIZE/2 - 3 }
    ];
    for (let i=0; i<4; i++) {
        const tex = await loadSpriteTexture(`assets/${plantTexKeys[i]}`, 'Plant', '#ffd700');
        const plantMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide, depthWrite: false }));
        plantMesh.position.set(corners[i].x, 4.0, corners[i].z);
        plantMesh.scale.set(3, 3, 3);
        scene.add(plantMesh); worldObjects.push(plantMesh);
        billboards.push(plantMesh);
    }

    // ---------- ATTIC (4,5) – raised props, double lantern ----------
    const atticCX = 3*ROOM_SIZE+ROOM_SIZE/2, atticCZ = 4*ROOM_SIZE+ROOM_SIZE/2;
    const trunkTex = await loadSpriteTexture('assets/trunk.png', 'Trunk', '#ffd700');
    const trunk = new THREE.Mesh(new THREE.PlaneGeometry(3, 3), new THREE.MeshBasicMaterial({ map: trunkTex, transparent: true, side: THREE.DoubleSide, depthWrite: false }));
    trunk.position.set(atticCX-4, 1.5, atticCZ+3);   // raised
    scene.add(trunk); worldObjects.push(trunk);
    billboards.push(trunk);
    addCollider(atticCX-4, 0.5, atticCZ+3, 2, 1, 0.5);

    const bookPileTex = await loadSpriteTexture('assets/book_pile.png', 'Book Pile', '#ffd700');
    const bookPile = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 2.0), new THREE.MeshBasicMaterial({ map: bookPileTex, transparent: true, side: THREE.DoubleSide, depthWrite: false }));
    bookPile.position.set(atticCX+5, 1.0, atticCZ-2);   // raised
    scene.add(bookPile); worldObjects.push(bookPile);
    billboards.push(bookPile);

    const lanternTex = await loadSpriteTexture('assets/lantern.png', 'Lantern', '#ffd700');
    const lantern = new THREE.Mesh(new THREE.PlaneGeometry(3, 3), new THREE.MeshBasicMaterial({ map: lanternTex, transparent: true, side: THREE.DoubleSide, depthWrite: false }));  // doubled size
    lantern.position.set(atticCX+1, 5.0, atticCZ+4);
    scene.add(lantern); worldObjects.push(lantern);
    billboards.push(lantern);

    // ---------- OBSERVATORY (3,5) – star chart on wall + floating stars ----------
    const obsCX = 2*ROOM_SIZE+ROOM_SIZE/2, obsCZ = 4*ROOM_SIZE+ROOM_SIZE/2;
    const telescopeTex = await loadSpriteTexture('assets/telescope.png', 'Telescope', '#ffd700');
    const telescope = new THREE.Mesh(new THREE.PlaneGeometry(3, 3), new THREE.MeshBasicMaterial({ map: telescopeTex, transparent: true, side: THREE.DoubleSide, depthWrite: false }));
    telescope.position.set(obsCX-4, 1.5, obsCZ+4);
    scene.add(telescope); worldObjects.push(telescope);
    billboards.push(telescope);

    // Star chart on north wall (static, not billboarded)
    const starChartTex = await loadTexture('assets/star_chart.png');
	const starChart = new THREE.Mesh(new THREE.PlaneGeometry(4, 3), new THREE.MeshBasicMaterial({ map: starChartTex, transparent: true, side: THREE.DoubleSide }));
    starChart.position.set(obsCX + 5, 3.0, obsCZ - ROOM_SIZE/2 + 0.1);
    starChart.rotation.set(0, 0, 0);
    scene.add(starChart); worldObjects.push(starChart);
    // Not billboarded

    // Floating paper stars (3 each of white, yellow, pride)
    const starTexKeys = ['white_star.png', 'yellow_star.png', 'pride_star.png'];
    for (let i = 0; i < 25; i++) {
        const tex = await loadSpriteTexture(`assets/${starTexKeys[i % 3]}`, 'Star', '#ffd700');
        const starMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.2), new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide, depthWrite: false }));
        const x = obsCX + (Math.random() - 0.5) * ROOM_SIZE/1.5;
        const y = 5.0 + Math.random() * 2.5;   // high up
        const z = obsCZ + (Math.random() - 0.5) * ROOM_SIZE/1.5;
        starMesh.position.set(x, y, z);
        scene.add(starMesh); worldObjects.push(starMesh);
        billboards.push(starMesh);
        window.stars.push({ mesh: starMesh, baseY: y, phase: Math.random() * Math.PI * 2 });
    }

    // ---------- THEATER (5,4) – static curtain, moving spotlight, second wraith ----------
    const theaterCX = 4*ROOM_SIZE+ROOM_SIZE/2, theaterCZ = 3*ROOM_SIZE+ROOM_SIZE/2;
    window.theaterCX = theaterCX;
    window.theaterCZ = theaterCZ;

    // Curtain static, no billboard, flush with ground
    const curtainTex = await loadTexture('assets/curtain.png');
    const curtain = new THREE.Mesh(new THREE.PlaneGeometry(8, 6), new THREE.MeshBasicMaterial({ map: curtainTex, transparent: true, side: THREE.DoubleSide }));
    curtain.position.set(theaterCX, 3.0, theaterCZ - 4);
    curtain.rotation.set(0, 0, 0);    // face south
    scene.add(curtain); worldObjects.push(curtain);
    // No billboard, no collider

    // Spotlight bigger, on ground, moves around
    //const spotlightTex = await loadSpriteTexture('assets/spotlight.png', 'Spotlight', '#ffd700');
    //const spotlight = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), new THREE.MeshBasicMaterial({ map: spotlightTex, transparent: true, side: THREE.DoubleSide, depthWrite: false }));
    //spotlight.position.set(theaterCX, 2.5, theaterCZ);
    //spotlight.rotation.x = -Math.PI/2;   // flat on floor
    //scene.add(spotlight); worldObjects.push(spotlight);
    //billboards.push(spotlight);
    //window.spotlight = { mesh: spotlight, angle: 0, radius: 5, speed: 0.3 };

    // Second wraith is already handled by NPC loop (Stage_Wraith2)

    // Doors
    const doorGeo = new THREE.PlaneGeometry(DOOR_W, DOOR_H);
    for(let rx=0;rx<GRID_SIZE;rx++) for(let rz=0;rz<GRID_SIZE;rz++){
        const cx=rx*ROOM_SIZE+ROOM_SIZE/2,cz=rz*ROOM_SIZE+ROOM_SIZE/2;
        const adjRxN=(rx-1+GRID_SIZE)%GRID_SIZE,adjRzW=(rz-1+GRID_SIZE)%GRID_SIZE;
        const makeDoor = (pos,rot,roomA,roomB,doorId) => {
            const startUnlocked = true;
            const mat = new THREE.MeshBasicMaterial({ map: blackDoorTex, transparent: true, side: THREE.DoubleSide });
            const mesh = new THREE.Mesh(doorGeo, mat);
            mesh.position.copy(pos); mesh.rotation.set(rot.x, rot.y, rot.z);
            scene.add(mesh); worldObjects.push(mesh); doorMeshes.push(mesh);
            const blocker = new THREE.Mesh(new THREE.BoxGeometry(DOOR_W*0.9, DOOR_H*0.9, 0.2), new THREE.MeshBasicMaterial({visible:false}));
            blocker.position.copy(pos); blocker.rotation.set(rot.x, rot.y, rot.z);
            scene.add(blocker); worldObjects.push(blocker);
            const d = new Door(mesh, blocker, roomA, roomB, doorId, true);
            doorList.push(d);
        };
        makeDoor(new THREE.Vector3(cx,DOOR_Y_OFFSET+DOOR_H/2,cz-ROOM_SIZE/2),new THREE.Euler(0,0,0),{rx,rz},{rx:adjRxN,rz},`${rx},${rz},N`);
        makeDoor(new THREE.Vector3(cx-ROOM_SIZE/2,DOOR_Y_OFFSET+DOOR_H/2,cz),new THREE.Euler(0,-Math.PI/2,0),{rx,rz},{rx,rz:adjRzW},`${rx},${rz},W`);
    }
}