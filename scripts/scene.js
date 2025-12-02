// Scene and shared assets
export const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB);
scene.fog = new THREE.Fog(0x87CEEB, 20, 60);

const aspect = window.innerWidth / window.innerHeight;
const camWidth = 20;
const camHeight = camWidth / aspect;

export const camera = new THREE.OrthographicCamera(camWidth / -2, camWidth / 2, camHeight / 2, camHeight / -2, 0.1, 1000);
export const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);
const dirLight = new THREE.DirectionalLight(0xffdfba, 1);
dirLight.position.set(10, 30, 10);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;
dirLight.shadow.bias = -0.0008;
scene.add(dirLight);

// Materials
export const mats = {
    p1: new THREE.MeshStandardMaterial({ color: 0x00ffaa }),
    p2: new THREE.MeshStandardMaterial({ color: 0xff00ff }),
    p3: new THREE.MeshStandardMaterial({ color: 0xffd166 }),
    p4: new THREE.MeshStandardMaterial({ color: 0x60a5fa }),
    sand: new THREE.MeshStandardMaterial({ color: 0xF4A460 }),
    water: new THREE.MeshStandardMaterial({ color: 0x006994, transparent: true, opacity: 0.8 }),
    wood: new THREE.MeshStandardMaterial({ color: 0x8B4513 }),
    leaf: new THREE.MeshStandardMaterial({ color: 0x228B22 }),
    red: new THREE.MeshStandardMaterial({ color: 0xff3333 }),
    gold: new THREE.MeshStandardMaterial({ color: 0xFFD700, metalness: 0.5, roughness: 0.2 }),
    crate: new THREE.MeshStandardMaterial({ color: 0x8B4513 }),
    magma: new THREE.MeshStandardMaterial({ color: 0xff4500, emissive: 0xaa0000, roughness: 1 }),
    obsidian: new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.8 }),
    shadow: new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3 }),
    teal: new THREE.MeshStandardMaterial({ color: 0x00bcd4, metalness: 0.1, roughness: 0.4 }),
    orange: new THREE.MeshStandardMaterial({ color: 0xffa040, metalness: 0.1, roughness: 0.4 }),
    ice: new THREE.MeshStandardMaterial({ color: 0xa9e6ff, metalness: 0.6, roughness: 0.05, transparent: true, opacity: 0.85 })
};

const defaultColors = ['#00ffaa', '#ff00ff', '#ffd166', '#60a5fa'];
let playerColors = [...defaultColors];
const baseBoundaryLimit = 8;
const basePlayRadius = baseBoundaryLimit + 0.5;

// --- ENVIRONMENTS --- //

// 1. Beach Environment
export const islandGroup = new THREE.Group();
scene.add(islandGroup);
const ocean = new THREE.Mesh(new THREE.PlaneGeometry(300, 300), mats.water);
ocean.rotation.x = -Math.PI/2;
ocean.position.y = -0.5;
ocean.receiveShadow = true;
scene.add(ocean); // Keep ocean always, change color later
const island = new THREE.Mesh(new THREE.CylinderGeometry(basePlayRadius, basePlayRadius, 1, 32), mats.sand);
island.position.y = -0.5;
island.receiveShadow = true;
islandGroup.add(island);

function createPalm(x, z) {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.2, 3, 6), mats.wood);
    trunk.position.set(x, 1, z);
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    islandGroup.add(trunk);
    const leaves = new THREE.Mesh(new THREE.ConeGeometry(1.5, 1, 5), mats.leaf);
    leaves.position.set(x, 2.5, z);
    leaves.castShadow = true;
    leaves.receiveShadow = true;
    islandGroup.add(leaves);
}
for(let i=0; i<8; i++) {
    const a = i/8 * Math.PI*2;
    createPalm(Math.cos(a)*(baseBoundaryLimit - 1), Math.sin(a)*(baseBoundaryLimit - 1));
}

// 2. Arena Floor (Standard Minigames)
export const arena = new THREE.Mesh(new THREE.CylinderGeometry(basePlayRadius, basePlayRadius, 0.5, 32), new THREE.MeshStandardMaterial({color: 0x444444}));
arena.position.y = 100; // Hidden by default
arena.receiveShadow = true;
scene.add(arena);

// 3. Volcano Environment (New Scene)
export const volcanoGroup = new THREE.Group();
volcanoGroup.visible = false;
scene.add(volcanoGroup);

const volcanoPlatform = new THREE.Mesh(new THREE.CylinderGeometry(8, 6, 2, 8), mats.obsidian);
volcanoPlatform.position.y = -1;
volcanoPlatform.castShadow = true;
volcanoPlatform.receiveShadow = true;
volcanoGroup.add(volcanoPlatform);
const lava = new THREE.Mesh(new THREE.PlaneGeometry(300, 300), mats.magma);
lava.rotation.x = -Math.PI/2;
lava.position.y = -2;
volcanoGroup.add(lava);

// 4. Flappy Backdrop (2D lane)
export const flappyGroup = new THREE.Group();
flappyGroup.visible = false;
scene.add(flappyGroup);
const flappyBackdrop = new THREE.Mesh(new THREE.PlaneGeometry(40, 20), new THREE.MeshStandardMaterial({ color: 0x9ad6ff }));
flappyBackdrop.position.set(0, 6, -8);
flappyGroup.add(flappyBackdrop);
const flappyFloor = new THREE.Mesh(new THREE.BoxGeometry(40, 1, 1), new THREE.MeshStandardMaterial({ color: 0x7cc576 }));
flappyFloor.position.set(0, 0, -8);
flappyGroup.add(flappyFloor);

// 5. Runner Road
export const runnerGroup = new THREE.Group();
runnerGroup.visible = false;
scene.add(runnerGroup);
const road = new THREE.Mesh(new THREE.PlaneGeometry(16, 80), new THREE.MeshStandardMaterial({ color: 0x333333 }));
road.rotation.x = -Math.PI / 2;
road.position.set(0, -0.01, 18);
road.receiveShadow = true;
runnerGroup.add(road);
for (let i = -2; i <= 2; i++) {
    const stripe = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 80), new THREE.MeshStandardMaterial({ color: 0xf2f2f2 }));
    stripe.rotation.x = -Math.PI / 2;
    stripe.position.set(i * 2, 0.001, 18);
    runnerGroup.add(stripe);
}

// Players
function createPlayerMesh(mat) {
    const group = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 1.6, 12), mat);
    body.position.y = 0.8;
    body.castShadow = true;
    const eyeGeo = new THREE.BoxGeometry(0.1, 0.1, 0.1);
    const eyeMat = new THREE.MeshBasicMaterial({color:0x000000});
    const e1 = new THREE.Mesh(eyeGeo, eyeMat);
    e1.position.set(0.15, 0.5, 0.35);
    const e2 = new THREE.Mesh(eyeGeo, eyeMat);
    e2.position.set(-0.15, 0.5, 0.35);
    body.add(e1);
    body.add(e2);
    group.add(body);
    group.body = body;
    return group;
}

export const p1Mesh = createPlayerMesh(mats.p1);
export const p2Mesh = createPlayerMesh(mats.p2);
export const p3Mesh = createPlayerMesh(mats.p3);
export const p4Mesh = createPlayerMesh(mats.p4);
export const playerMeshes = [p1Mesh, p2Mesh, p3Mesh, p4Mesh];
scene.add(p1Mesh, p2Mesh, p3Mesh, p4Mesh);

export function useDefaultModels() {
    playerMeshes.forEach(mesh => {
        if (mesh.body) mesh.body.visible = true;
        if (mesh.tankParts) {
            mesh.tankParts.forEach(p => mesh.remove(p));
            mesh.tankParts = [];
        }
        if (mesh.flappyParts) {
            mesh.flappyParts.forEach(p => mesh.remove(p));
            mesh.flappyParts = [];
        }
    });
}

export function useTankModels() {
    useDefaultModels();
    playerMeshes.forEach((mesh, idx) => {
        const color = playerColors[idx] || defaultColors[idx];
        const base = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.4, 1.6), new THREE.MeshStandardMaterial({ color }));
        base.position.y = 0.4;
        const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.25, 12), new THREE.MeshStandardMaterial({ color }));
        cap.position.y = 0.35;
        const turret = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.9, 10), new THREE.MeshStandardMaterial({ color: 0x333333 }));
        turret.rotation.z = Math.PI / 2;
        turret.position.set(0, 0.3, 0.55);
        base.add(cap);
        base.add(turret);
        mesh.add(base);
        mesh.tankParts = [base];
        if (mesh.body) mesh.body.visible = false;
    });
}

export function setPlayerColors(colors = []) {
    playerColors = defaultColors.map((c, idx) => colors[idx] || c);
    playerMeshes.forEach((mesh, idx) => {
        const body = mesh.body || mesh.children[0];
        if (body?.material?.color) body.material.color.set(playerColors[idx] || defaultColors[idx]);
    });
}

export let gameObjects = [];

export function resetPlayers(count = 2) {
    const radius = 5;
    playerMeshes.forEach((mesh, idx) => {
        const angle = (idx / count) * Math.PI * 2;
        mesh.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
        mesh.rotation.set(0, angle + Math.PI, 0);
        mesh.aimDir = new THREE.Vector3(Math.cos(angle + Math.PI), 0, Math.sin(angle + Math.PI));
        mesh.visible = idx < count;
        mesh.stunned = 0;
        mesh.slideVel = new THREE.Vector3();
        mesh.falling = false;
        mesh.playerIndex = idx;
        mesh.hp = 1;
    });
}

export function clearGameObjects() {
    gameObjects.forEach(o => {
        scene.remove(o.mesh);
        if(o.topper) scene.remove(o.topper);
        if(o.ring) scene.remove(o.ring);
        if(o.shadow) scene.remove(o.shadow);
        if(o.parts) o.parts.forEach(p => scene.remove(p));
    });
    gameObjects = [];
}

export function removeObj(index) {
    const obj = gameObjects[index];
    scene.remove(obj.mesh);
    if(obj.topper) scene.remove(obj.topper);
    if(obj.ring) scene.remove(obj.ring);
    if(obj.shadow) scene.remove(obj.shadow);
    if(obj.parts) obj.parts.forEach(p => scene.remove(p));
    gameObjects.splice(index, 1);
}

export function spawnObstacles() {
    const pos = [{x: -3, z: -3}, {x: 3, z: 3}, {x: -3, z: 3}, {x: 3, z: -3}];
    pos.forEach(p => {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.5, 1.5), mats.crate);
        mesh.position.set(p.x, 0.75, p.z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        scene.add(mesh);
        gameObjects.push({ type: 'obstacle', mesh: mesh });
    });
}

export function spawnProjectile(player, ownerId) {
    const geom = new THREE.SphereGeometry(0.3);
    const mat = new THREE.MeshBasicMaterial({color: 0xffff00});
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.copy(player.position);
    mesh.position.y = 0.8;
    const forward = player.aimDir ? player.aimDir.clone() : new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0,1,0), player.rotation.y);
    scene.add(mesh);
    gameObjects.push({ type: 'projectile', mesh: mesh, vel: forward.multiplyScalar(20), owner: ownerId });
}

export function spawnFallingCoconut(timer) {
    const x = (Math.random() - 0.5) * 14;
    const z = (Math.random() - 0.5) * 14;
    const geom = new THREE.SphereGeometry(0.5);
    const mat = new THREE.MeshStandardMaterial({color: 0x5c4033});
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.set(x, 10, z);
    scene.add(mesh);
    const sGeo = new THREE.CircleGeometry(0.5, 16);
    const shadow = new THREE.Mesh(sGeo, mats.red);
    shadow.rotation.x = -Math.PI/2;
    shadow.position.set(x, 0.2, z);
    scene.add(shadow);
    gameObjects.push({ type: 'coconut', mesh: mesh, shadow: shadow, dropTimer: timer || 0 });
}

export function spawnPineapple() {
    const isGolden = Math.random() > 0.8;
    const x = (Math.random() - 0.5) * 14;
    const z = (Math.random() - 0.5) * 14;
    const color = isGolden ? 0xFFD700 : 0xFFFF00;
    const scale = isGolden ? 0.8 : 0.6;
    const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(scale), new THREE.MeshStandardMaterial({color: color, metalness: isGolden?0.8:0.2, roughness: 0.2}));
    mesh.position.set(x, 0.5, z);
    scene.add(mesh);
    gameObjects.push({ type: 'pineapple', mesh: mesh, value: isGolden ? 3 : 1 });
}

export function spawnShellTarget() {
    const x = (Math.random() - 0.5) * 14;
    const z = (Math.random() - 0.5) * 14;
    const mesh = new THREE.Mesh(new THREE.TorusGeometry(1, 0.15, 8, 24), mats.teal);
    mesh.position.set(x, 0.5, z);
    mesh.rotation.x = Math.PI / 2;
    scene.add(mesh);

    const topper = new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.8, 12), mats.gold);
    topper.position.set(x, 0.9, z);
    scene.add(topper);

    const ring = new THREE.Mesh(new THREE.CircleGeometry(1.3, 24), mats.shadow.clone());
    ring.material.opacity = 0.2;
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(x, 0.01, z);
    scene.add(ring);

    const target = { type: 'shell_target', mesh: mesh, topper: topper, ring: ring };
    gameObjects.push(target);
    return target;
}

export function spawnCrab() {
    const dir = Math.random() > 0.5 ? 1 : -1;
    const speed = 6 + Math.random() * 4;
    const z = (Math.random() - 0.5) * 12;
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.6, 12, 12), mats.orange);
    mesh.position.set(dir > 0 ? -12 : 12, 0.6, z);
    mesh.castShadow = true;
    scene.add(mesh);

    const eyes = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.4, 6), mats.gold);
    eyes.position.set(0, 0.6, 0.4);
    mesh.add(eyes);

    const crab = {
        type: 'crab',
        mesh: mesh,
        vel: new THREE.Vector3(speed * dir, 0, 0),
        t: 0,
        swayAmp: 2.5 + Math.random() * 2,
        swaySpeed: 4.5 + Math.random() * 1.5
    };
    gameObjects.push(crab);
    return crab;
}

export function spawnVolcanoRock() {
    const x = (Math.random() - 0.5) * 12;
    const z = (Math.random() - 0.5) * 12;
    // Jagged Rock
    const geom = new THREE.DodecahedronGeometry(0.8, 0); 
    const mesh = new THREE.Mesh(geom, mats.obsidian);
    mesh.position.set(x, 15, z); // High up
    scene.add(mesh);

    const sGeo = new THREE.CircleGeometry(0.8, 16);
    const shadow = new THREE.Mesh(sGeo, new THREE.MeshBasicMaterial({color: 0xff0000, transparent: true, opacity: 0.5}));
    shadow.rotation.x = -Math.PI/2;
    shadow.position.set(x, 0.1, z);
    scene.add(shadow);
    
    gameObjects.push({ type: 'magma_rock', mesh: mesh, shadow: shadow });
}

export function flashHit(mesh) {
    const parts = mesh.tankParts && mesh.tankParts.length ? mesh.tankParts : [mesh.body || mesh.children[0]].filter(Boolean);
    const originalColor = playerColors[mesh.playerIndex] || defaultColors[mesh.playerIndex];
    const originalPalette = parts.map(p => p?.material?.color?.getHex());

    parts.forEach(p => p?.material?.color?.setHex(0xffffff));
    setTimeout(() => {
        parts.forEach((p, idx) => {
            if (!p?.material?.color) return;
            const fallback = originalColor ?? originalPalette[idx] ?? 0x00ffaa;
            const target = originalPalette[idx] ?? fallback;
            p.material.color.set(target ?? 0x00ffaa);
        });
    }, 100);
}

// Controls Environment Switching
export function setEnvironment(type) {
    // Reset positions
    arena.position.y = 100;
    islandGroup.visible = false;
    volcanoGroup.visible = false;
    flappyGroup.visible = false;
    runnerGroup.visible = false;
    ocean.visible = type === 'ISLAND';

    // Reset Light & Fog
    ambientLight.color.setHex(0xffffff);
    ambientLight.intensity = 0.6;
    scene.fog.color.setHex(0x87CEEB);
    scene.background = new THREE.Color(0x87CEEB);
    dirLight.color.setHex(0xffdfba);

    if (type === 'ISLAND') {
        islandGroup.visible = true;
    } 
    else if (type === 'VOLCANO') {
        volcanoGroup.visible = true;
        // Dark Red Atmosphere
        scene.background = new THREE.Color(0x110000);
        scene.fog.color.setHex(0x220000);
        dirLight.color.setHex(0xff4400);
        ambientLight.color.setHex(0x550000);
    }
    else if (type === 'SKY') {
        arena.position.y = 4;
        arena.material = mats.ice;
        arena.scale.set(1, 1, 1);
        scene.background = new THREE.Color(0xcce8ff);
        scene.fog.color.setHex(0xb7d9ff);
        ambientLight.intensity = 0.9;
        dirLight.color.setHex(0xffffff);
    }
    else if (type === 'TANK') {
        arena.position.y = 100; // Hide the circular arena
        scene.background = new THREE.Color(0x0f182b);
        scene.fog.color.setHex(0x14233d);
        ambientLight.intensity = 0.75;
        dirLight.color.setHex(0xcde3ff);
        ocean.visible = false;
    }
    else if (type === 'FLAPPY') {
        flappyGroup.visible = true;
        arena.position.y = 100;
        islandGroup.visible = false;
        volcanoGroup.visible = false;
        ocean.visible = false;
        scene.background = new THREE.Color(0xa3d8ff);
        scene.fog.color.setHex(0xa3d8ff);
        ambientLight.intensity = 0.9;
        dirLight.color.setHex(0xffffff);
    }
    else if (type === 'RUNNER') {
        runnerGroup.visible = true;
        arena.position.y = 100;
        islandGroup.visible = false;
        volcanoGroup.visible = false;
        ocean.visible = false;
        scene.background = new THREE.Color(0x14233d);
        scene.fog.color.setHex(0x14233d);
        ambientLight.intensity = 0.8;
        dirLight.color.setHex(0xc0d6ff);
    }
    else { // Standard Arena
        arena.position.y = 0.1;
        arena.material = mats.obsidian;
        islandGroup.visible = false; // Keep surrounding ocean? Or hide?
        // Dark blue space for Arena
        scene.background = new THREE.Color(0x203040);
        ambientLight.intensity = 0.8;
    }
}

export function setPlayAreaSize(limit) {
    const effectiveLimit = limit ?? baseBoundaryLimit;
    const scale = effectiveLimit / baseBoundaryLimit;
    islandGroup.scale.setScalar(scale);
    arena.scale.setScalar(scale);
    volcanoGroup.scale.setScalar(scale);

    const shadowExtent = Math.max(14, effectiveLimit + 6);
    const cam = dirLight.shadow.camera;
    cam.left = -shadowExtent;
    cam.right = shadowExtent;
    cam.top = shadowExtent;
    cam.bottom = -shadowExtent;
    cam.near = 2;
    cam.far = 80;
    cam.updateProjectionMatrix();
}

export function updateCamera(state) {
    if (state === 'LOBBY') {
        camera.position.set(0, 15, 20);
        camera.lookAt(0, 0, 0);
        return;
    }

    const currentGame = window.GameManager?.currentGame;
    if (currentGame === 'FLAPPY') {
        camera.position.set(0, 10, 20);
        camera.lookAt(0, 6, -8);
        camera.rotation.z = 0;
    } else if (currentGame === 'RUNNER') {
        camera.position.set(0, 10, -15);
        camera.lookAt(0, 4, 12);
        camera.rotation.z = 0;
    } else if (currentGame === 'TANK') {
        camera.position.set(0, 34, 0.001);
        camera.lookAt(0, 0, 0);
        camera.rotation.z = 0;
    } else {
        camera.position.set(0, 20, 10);
        camera.lookAt(0, 0, 0);
    }
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

setPlayAreaSize(baseBoundaryLimit);