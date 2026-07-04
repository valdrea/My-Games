// =============================================================
// GLOBALS – shared constants, state, and three.js objects
// =============================================================

const ROOM_SIZE     = 20;
const WALL_HEIGHT   = 8;
const MOVE_SPEED    = 6;
const PLAYER_RADIUS = 0.5;
const DOOR_W        = 2.8;
const DOOR_H        = 3.8;
const DOOR_Y_OFFSET = 0.2;

let spiteModifier = 0;
let flickerGrace  = null;

// Dice state
let diceState = 'idle';
let rollResolve = null; let rollStat = null; let rollDC = 0; let rollResult = 0; let rollBonus = 0;
let dieCanvas, dieCtx, dieRotation = 0, dieFace = 0;

const mercyTracker = {};

// Door dialogue lines
const LOCKED_LINES = ["Get lost. No way I'm opening for you. Kick rocks!","Oh, you think you can just walk through me? Adorable.","I have been locked for eleven years and I am FINE with that.","The answer is no. The answer has always been no.","Come back when you've earned it. Or don't. See if I care.","I don't know you. I don't like you. Goodbye.","Bold of you to knock. Pointless, but bold.","Try again never. That works best for me."];
const UNLOCKED_LINES = ["Good luck on your quest. You may indeed pass.","I believe in you. Probably. Go on through.","The way is open. Try not to track mud.","You've earned this. I open gladly.","Ah, a worthy traveler. Please, after you.","Finally, someone I'm allowed to let through. Welcome.","I have been waiting to say this: you may pass.","The path is yours. Do try to come back in one piece."];
function pickLine(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// Game state
let previousRoomKey = null;
let inventory       = [];
let flags           = {};
let stats           = { willpower:4, curiosity:4, charm:4, tempSpeedPenalty:0 };
let visitedRooms    = new Set();

// Three.js scene essentials
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a1a);
const camera = new THREE.PerspectiveCamera(72, window.innerWidth/window.innerHeight, 0.1, 500);
camera.rotation.order = 'YXZ';
const renderer = new THREE.WebGLRenderer({ antialias:true });
renderer.setClearColor(0x0a0a1a, 1);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(1);
document.body.appendChild(renderer.domElement);

scene.add(new THREE.AmbientLight(0xccddff, 0.65));
const keyLight = new THREE.DirectionalLight(0xffeedd, 1.4);
keyLight.position.set(10, 15, 10);
scene.add(keyLight);
const fillLight = new THREE.DirectionalLight(0xbbccff, 0.8);
fillLight.position.set(-8, 5, -8);
scene.add(fillLight);
const crowLight = new THREE.PointLight(0xffdd99, 0.4, 30);
crowLight.position.set(2*ROOM_SIZE+ROOM_SIZE/2 -3, 3.2, 2*ROOM_SIZE+ROOM_SIZE/2 -3);
scene.add(crowLight);

const loader = new THREE.TextureLoader();
const gltfLoader = new THREE.GLTFLoader();
const textureCache = {};

let roomFloorMeshes = {};

// World object lists
let worldObjects = [];
let colliders = [];
let itemSprites = new Map();
let npcMeshes = new Map();
let doorList = [];
let doorMeshes = [];

// Animation lists
let floatAnimations = [];
let wanderAnimations = [];
let billboards = [];
let itemAnimations = [];
let hummingbirds = [];
let pendulumObjects = [];
let cuckoos = [];

let easelModels = [null, null];
let easelColliders = [null, null];
let greenDoorTex = null, blackDoorTex = null;

// Player control
let gameRunning = false;
let isLocked = false;
let playerFrozen = false;
let yaw = 0, pitch = 0, targetYaw = 0, targetPitch = 0;
const keys = {};

// Narration & dialogue (text only – no audio)
let narrationActive = false;
let doorMsgActive = false;
let pendingNarration = null;
let currentOpenDoor = null;

// Snow
let snowParticles = [];
let snowTexture = null;

// Preload lists (unchanged)
const ALL_TEXTURE_PATHS = [
    'assets/floor.png', 'assets/ceiling.png',
    'assets/Folded_Compass.png', 'assets/Lavender_Ink.png', 'assets/resolve.png', 'assets/Helium_Loafers.png',
    'assets/shard_D.png', 'assets/shard_I.png', 'assets/shard_A.png', 'assets/shard_N.png', 'assets/shard_N2.png', 'assets/shard_E.png',
    'assets/glass_feather.png', 'assets/skeleton_key.png',
    'assets/Faceless_Queen.png', 'assets/Chirp.png', 'assets/Keyhole_Specter.png',
    'assets/chandelier.png', 'assets/floating_chair.png',
    'assets/1-3_floor.png', 'assets/2-3_floor.png', 'assets/2-4_floor.png', 'assets/3-3_floor.png',
    'assets/3-2_floor.png', 'assets/3-4_floor.png', 'assets/3-4_floor_Fail.png', 'assets/4-3_floor.png',
    'assets/glass_Hbird.png', 'assets/glass_Hbird2.png', 'assets/glass_Hbird3.png', 'assets/skybox.png',
    'assets/4-4_floor.png', 'assets/4-2_floor.png', 'assets/5-3_floor.png',
    'assets/Spindle.png', 'assets/Lost_Scout.png', 'assets/Keeper_of_the_Rust.png',
    'assets/thistle_key.png', 'assets/dry_match.png',
    'assets/courageous_knot.png', 'assets/magnifying_lens.png', 'assets/gilded_tongue.png', 'assets/lumin_essence.png',
    'assets/hedgeblock.png', 'assets/big_snowpile.png', 'assets/snowpile.png',
    'assets/key_plant.png', 'assets/key_plant2.png', 'assets/key_plant3.png',
    'assets/4-2_back_wall.png', 'assets/sad_cloud.png', 'assets/robin.png',
    'assets/1-4_floor.png', 'assets/1-5_floor.png', 'assets/2-5_floor.png',
    'assets/Barnaby_the_Fern.png', 'assets/Epitaphist.png', 'assets/Grand_Pendulum.png',
    'assets/chisel_of_renown.png',
    'assets/green_cuckoo.png', 'assets/orange_cuckoo.png', 'assets/pride_cuckoo.png',
    'assets/hungry_tree.png', 'assets/hungry_lilly.png', 'assets/hungry_rose.png', 'assets/hungry_sunflower.png',
    'assets/stonetablet.png',
];
for (let i=1; i<=25; i++) ALL_TEXTURE_PATHS.push(`assets/wall_${i}.png`);

const ALL_GLB_PATHS = [
    'assets/blue_fireplace.glb', 'assets/Curator_Vance.glb', 'assets/doll_trashpile.glb',
    'assets/easel.glb', 'assets/fenced_cradles.glb', 'assets/Gesso_desk.glb',
    'assets/library_desk.glb', 'assets/Origami_Crow.glb', 'assets/replacement_portrait.glb',
    'assets/Uncle_Gesso.glb', 'assets/Baron_von_Bounce.glb',
    'assets/Faceless_Queen.glb', 'assets/Chirp.glb', 'assets/Keyhole_Specter.glb',
    'assets/marble_bench.glb', 'assets/Spindle.glb', 'assets/Keeper_of_the_Rust.glb',
    'assets/hedgeblock.glb', 'assets/snowpile.glb', 'assets/Lost_Scout.glb',
    'assets/stonetablet.glb',
];