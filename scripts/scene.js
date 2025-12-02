import { createArenaScene, createArenaFloor } from './scenes/arena_scene.js';
import { createBeachScene } from './scenes/beach_scene.js';
import { createFlappyScene } from './scenes/flappy_scene.js';
import { createRunnerScene } from './scenes/runner_scene.js';
import { createSkyScene } from './scenes/sky_scene.js';
import { createTankScene } from './scenes/tank_scene.js';
import { createVolcanoScene } from './scenes/volcano_scene.js';

// Scene and shared assets
export const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB);
scene.fog = new THREE.Fog(0x87CEEB, 20, 60);

export const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
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
const baseFogColor = 0x87CEEB;

// Scene registry keeps each environment in its own module
const sharedFloor = createArenaFloor(scene, mats, basePlayRadius);
const sceneContext = { scene, mats, baseBoundaryLimit, basePlayRadius, sharedFloor };
const sceneDefinitions = [
    createBeachScene(sceneContext),
    createVolcanoScene(sceneContext),
    createFlappyScene(sceneContext),
    createRunnerScene(sceneContext),
    createArenaScene(sceneContext),
    createSkyScene(sceneContext),
    createTankScene(sceneContext)
];
const sceneRegistry = sceneDefinitions.reduce((acc, def) => {
    acc[def.id] = def;
    return acc;
}, {});

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
function hideAllScenes() {
    sceneDefinitions.forEach(def => def.disable());
}

function resetLighting() {
    ambientLight.color.setHex(0xffffff);
    ambientLight.intensity = 0.6;
    scene.fog.color.setHex(baseFogColor);
    scene.background = new THREE.Color(baseFogColor);
    dirLight.color.setHex(0xffdfba);
}

export function setEnvironment(type) {
    hideAllScenes();
    resetLighting();
    const target = sceneRegistry[type] || sceneRegistry.ARENA;
    target.enable({ ambientLight, dirLight, scene });
}

export function setPlayAreaSize(limit) {
    const effectiveLimit = limit ?? baseBoundaryLimit;
    const scale = effectiveLimit / baseBoundaryLimit;
    sceneDefinitions.forEach(def => {
        if (typeof def.resize === 'function') def.resize(scale);
    });

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
        camera.lookAt(0, 6, 0);
        camera.rotation.z = 0;
    } else if (currentGame === 'RUNNER') {
        // Trail behind the runners, looking down the boardwalk
        camera.position.set(0, 12, 20);
        camera.lookAt(0, 4, 0);
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
setEnvironment('ISLAND');
