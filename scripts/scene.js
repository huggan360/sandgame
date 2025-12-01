// Scene and shared assets
export const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB);
scene.fog = new THREE.Fog(0x87CEEB, 20, 60);

export const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
export const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);
const dirLight = new THREE.DirectionalLight(0xffdfba, 1);
dirLight.position.set(10, 30, 10);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;
dirLight.shadow.camera.left = -20;
dirLight.shadow.camera.right = 20;
dirLight.shadow.camera.top = 20;
dirLight.shadow.camera.bottom = -20;
scene.add(dirLight);

// Materials
export const mats = {
    p1: new THREE.MeshStandardMaterial({ color: 0x00ffaa }),
    p2: new THREE.MeshStandardMaterial({ color: 0xff00ff }),
    sand: new THREE.MeshStandardMaterial({ color: 0xF4A460 }),
    water: new THREE.MeshStandardMaterial({ color: 0x006994, transparent: true, opacity: 0.8 }),
    wood: new THREE.MeshStandardMaterial({ color: 0x8B4513 }),
    leaf: new THREE.MeshStandardMaterial({ color: 0x228B22 }),
    red: new THREE.MeshStandardMaterial({ color: 0xff3333 }),
    gold: new THREE.MeshStandardMaterial({ color: 0xFFD700, metalness: 0.5, roughness: 0.2 }),
    crate: new THREE.MeshStandardMaterial({ color: 0x8B4513 }),
    shadow: new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3 })
};

// Environment
export const islandGroup = new THREE.Group();
scene.add(islandGroup);
const ocean = new THREE.Mesh(new THREE.PlaneGeometry(300, 300), mats.water);
ocean.rotation.x = -Math.PI/2;
ocean.position.y = -0.5;
scene.add(ocean);

const island = new THREE.Mesh(new THREE.CylinderGeometry(14, 14, 1, 32), mats.sand);
island.position.y = -0.5;
island.receiveShadow = true;
islandGroup.add(island);

export const arena = new THREE.Mesh(new THREE.CylinderGeometry(9, 9, 0.5, 32), new THREE.MeshStandardMaterial({color: 0x444444}));
arena.position.y = 100; // Hidden by default
arena.receiveShadow = true;
scene.add(arena);

function createPalm(x, z) {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.2, 3, 6), mats.wood);
    trunk.position.set(x, 1, z);
    trunk.castShadow = true;
    islandGroup.add(trunk);
    const leaves = new THREE.Mesh(new THREE.ConeGeometry(1.5, 1, 5), mats.leaf);
    leaves.position.set(x, 2.5, z);
    islandGroup.add(leaves);
}
for(let i=0; i<8; i++) {
    const a = i/8 * Math.PI*2;
    createPalm(Math.cos(a)*10, Math.sin(a)*10);
}

const totem = new THREE.Group();
const b1 = new THREE.Mesh(new THREE.BoxGeometry(1,1,1), mats.wood); b1.position.y=0.5;
const b2 = new THREE.Mesh(new THREE.BoxGeometry(0.8,0.8,0.8), mats.red); b2.position.y=1.4;
totem.add(b1, b2);
totem.castShadow = true;
islandGroup.add(totem);

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
    return group;
}

export const p1Mesh = createPlayerMesh(mats.p1);
export const p2Mesh = createPlayerMesh(mats.p2);
scene.add(p1Mesh, p2Mesh);

export let gameObjects = [];

export function resetPlayers() {
    p1Mesh.position.set(-3, 0, 0);
    p2Mesh.position.set(3, 0, 0);
    p1Mesh.rotation.set(0, Math.PI/2, 0);
    p2Mesh.rotation.set(0, -Math.PI/2, 0);
    p1Mesh.visible = true;
    p2Mesh.visible = true;
}

export function clearGameObjects() {
    gameObjects.forEach(o => {
        scene.remove(o.mesh);
        if(o.shadow) scene.remove(o.shadow);
    });
    gameObjects = [];
}

export function removeObj(index) {
    const obj = gameObjects[index];
    scene.remove(obj.mesh);
    if(obj.shadow) scene.remove(obj.shadow);
    gameObjects.splice(index, 1);
}

export function spawnObstacles() {
    const pos = [
        {x: -3, z: -3}, {x: 3, z: 3}, {x: -3, z: 3}, {x: 3, z: -3}
    ];
    pos.forEach(p => {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.5, 1.5), mats.crate);
        mesh.position.set(p.x, 0.75, p.z);
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
    const forward = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0,1,0), player.rotation.y);
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

export function flashHit(mesh) {
    mesh.children[0].material.color.setHex(0xffffff);
    setTimeout(() => {
        if(mesh === p1Mesh) mesh.children[0].material.color.setHex(0x00ffaa);
        else mesh.children[0].material.color.setHex(0xff00ff);
    }, 100);
}

export function setArenaVisible(visible) {
    arena.position.set(0, visible ? 0.1 : 100, 0);
    islandGroup.visible = !visible;
    scene.background = new THREE.Color(visible ? 0x203040 : 0x87CEEB);
    ambientLight.intensity = visible ? 0.8 : 0.6;
}

export function updateCamera(state) {
    if (state === 'LOBBY') {
        camera.position.set(0, 15, 20);
        camera.lookAt(0, 0, 0);
    } else {
        camera.position.set(0, 18, 12);
        camera.lookAt(0, 0, 0);
    }
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
