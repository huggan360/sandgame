import { gameObjects, mats, scene, removeObj, flashHit } from '../scene.js';

function createBuilding(x, z, size, color = mats.obsidian) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(size.x, size.y, size.z), color);
    mesh.position.set(x, size.y / 2, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    gameObjects.push({ type: 'tank_building', mesh });
    return mesh;
}

function createRamp(x, z, length, width, height, rotation = 0) {
    const geo = new THREE.BoxGeometry(width, height, length);
    const mesh = new THREE.Mesh(geo, mats.gold);
    mesh.position.set(x, height / 2, z);
    mesh.rotation.x = -Math.atan(height / length);
    mesh.rotation.y = rotation;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    gameObjects.push({ type: 'tank_ramp', mesh, ramp: { length, width, height, rotation } });
    return mesh;
}

function createCover(x, z, radius) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 1.5, 10), mats.crate);
    mesh.position.set(x, 0.75, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    gameObjects.push({ type: 'tank_cover', mesh, radius });
    return mesh;
}

export class TankBattleGame {
    constructor() {
        this.cooldowns = [];
        this.structures = [];
        this.shellSpeed = 15;
        this.reloadTime = 2;
        this.spawnPositions = [
            new THREE.Vector3(-12, 0, 12),
            new THREE.Vector3(12, 0, -12),
            new THREE.Vector3(-12, 0, -12),
            new THREE.Vector3(12, 0, 12)
        ];
    }

    get meta() {
        return {
            title: 'Tank Takedown',
            description: 'Roll across a multi-level outpost. Use ramps and buildings for cover while blasting enemy tanks.',
            penalty: '3 Sips',
            environment: 'TANK'
        };
    }

    start(players, manager) {
        this.cooldowns = players.map(() => 0);
        this.structures = [];
        manager.boundaryLimit = 18;
        players.forEach((p, idx) => {
            p.hp = 3;
            const spawn = this.spawnPositions[idx] || new THREE.Vector3(0, 0, 0);
            p.position.copy(spawn);
            p.rotation.set(0, Math.atan2(-spawn.x, -spawn.z), 0);
        });
        this.buildArena();
    }

    buildArena() {
        // Base floor
        const floor = new THREE.Mesh(new THREE.BoxGeometry(42, 0.6, 42), mats.obsidian);
        floor.position.y = -0.3;
        floor.receiveShadow = true;
        scene.add(floor);
        gameObjects.push({ type: 'tank_floor', mesh: floor });

        // Raised pads and towers
        const pads = [
            { pos: new THREE.Vector3(0, 1, 0), size: new THREE.Vector3(8, 2, 8) },
            { pos: new THREE.Vector3(-14, 0.8, -6), size: new THREE.Vector3(6, 1.6, 6) },
            { pos: new THREE.Vector3(14, 0.8, 6), size: new THREE.Vector3(6, 1.6, 6) }
        ];
        pads.forEach(data => {
            const mesh = new THREE.Mesh(new THREE.BoxGeometry(data.size.x, data.size.y, data.size.z), mats.orange);
            mesh.position.copy(data.pos);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            scene.add(mesh);
            gameObjects.push({ type: 'tank_pad', mesh });
            this.structures.push({ type: 'pad', mesh, size: data.size });
        });

        // Buildings for cover
        const buildings = [
            { pos: [-8, -10], size: { x: 5, y: 5, z: 4 } },
            { pos: [10, -4], size: { x: 4, y: 4, z: 8 } },
            { pos: [-2, 10], size: { x: 6, y: 3, z: 5 } }
        ];
        buildings.forEach(b => {
            const mesh = createBuilding(b.pos[0], b.pos[1], new THREE.Vector3(b.size.x, b.size.y, b.size.z));
            this.structures.push({ type: 'building', mesh, half: new THREE.Vector3(b.size.x / 2, b.size.y / 2, b.size.z / 2) });
        });

        // Ramps that climb onto pads
        createRamp(-8, -6, 8, 3, 2, Math.PI / 2);
        createRamp(8, 6, 8, 3, 2, -Math.PI / 2);
        createRamp(0, -10, 10, 3, 2.4, 0);

        // Scattered low cover
        const covers = [
            [-12, 4, 1.2], [12, -2, 1.2], [0, 12, 1.6], [6, 0, 1.1], [-6, 0, 1.1]
        ];
        covers.forEach(c => {
            const mesh = createCover(c[0], c[1], c[2]);
            this.structures.push({ type: 'cover', mesh, radius: c[2] + 0.7 });
        });
    }

    collidesWithBuilding(pos) {
        for (const s of this.structures) {
            if (s.type === 'building') {
                const dx = Math.abs(pos.x - s.mesh.position.x);
                const dz = Math.abs(pos.z - s.mesh.position.z);
                if (dx < s.half.x + 0.7 && dz < s.half.z + 0.7) return true;
            }
            if (s.type === 'cover') {
                const dist = Math.hypot(pos.x - s.mesh.position.x, pos.z - s.mesh.position.z);
                if (dist < s.radius) return true;
            }
        }
        return false;
    }

    handleMovement(dt, inputs, players, manager) {
        const speed = 7 * dt;
        players.forEach((mesh, idx) => {
            const input = inputs[idx];
            if (!input) return;
            const oldPos = mesh.position.clone();
            if (mesh.stunned && mesh.stunned > 0) {
                mesh.stunned -= dt;
                return;
            }
            if (input.x !== 0 || input.z !== 0) {
                mesh.position.x += input.x * speed;
                mesh.position.z += input.z * speed;
                mesh.lookAt(mesh.position.x + input.x, mesh.position.y, mesh.position.z + input.z);
            }
            if (this.collidesWithBuilding(mesh.position)) {
                mesh.position.copy(oldPos);
            }
            this.cooldowns[idx] = Math.max(0, (this.cooldowns[idx] || 0) - dt);
            if (input.action && this.cooldowns[idx] <= 0) {
                this.fireShell(mesh, mesh.playerIndex);
                this.cooldowns[idx] = this.reloadTime;
            }
        });
    }

    fireShell(player, ownerId) {
        const barrelDir = player.aimDir ? player.aimDir.clone() : new THREE.Vector3(Math.sin(player.rotation.y), 0, Math.cos(player.rotation.y));
        const shell = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.8, 8), mats.teal);
        shell.position.copy(player.position).add(new THREE.Vector3(0, 0.4, 0));
        shell.rotation.z = Math.PI / 2;
        shell.castShadow = true;
        scene.add(shell);
        gameObjects.push({ type: 'tank_shell', mesh: shell, vel: barrelDir.normalize().multiplyScalar(this.shellSpeed), owner: ownerId });
    }

    updateShells(dt, players, manager) {
        for (let i = gameObjects.length - 1; i >= 0; i--) {
            const obj = gameObjects[i];
            if (obj.type !== 'tank_shell') continue;
            obj.mesh.position.add(obj.vel.clone().multiplyScalar(dt));
            const pos = obj.mesh.position;
            if (Math.abs(pos.x) > manager.boundaryLimit + 4 || Math.abs(pos.z) > manager.boundaryLimit + 4) {
                removeObj(i);
                continue;
            }
            let destroyed = false;
            for (const s of this.structures) {
                if (s.type === 'building') {
                    const dx = Math.abs(pos.x - s.mesh.position.x);
                    const dz = Math.abs(pos.z - s.mesh.position.z);
                    if (dx < s.half.x + 0.6 && dz < s.half.z + 0.6) { destroyed = true; break; }
                }
                if (s.type === 'cover') {
                    if (Math.hypot(pos.x - s.mesh.position.x, pos.z - s.mesh.position.z) < s.radius) { destroyed = true; break; }
                }
            }
            if (destroyed) { removeObj(i); continue; }
            let hitPlayer = null;
            players.forEach(mesh => {
                if (!hitPlayer && mesh.visible && obj.owner !== mesh.playerIndex && obj.mesh.position.distanceTo(mesh.position) < 1) {
                    hitPlayer = mesh;
                }
            });
            if (hitPlayer) {
                hitPlayer.hp -= 1;
                flashHit(hitPlayer);
                hitPlayer.stunned = 0.35;
                manager.updateHud();
                removeObj(i);
                if (hitPlayer.hp <= 0) manager.eliminatePlayer(hitPlayer.playerIndex);
            }
        }
    }

    update(dt, inputs, players, _timer, manager) {
        this.handleMovement(dt, inputs, players, manager);
        this.updateShells(dt, players, manager);
    }
}
