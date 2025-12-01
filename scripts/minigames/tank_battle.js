import { gameObjects, mats, scene, removeObj, flashHit, spawnObstacles, useTankModels } from '../scene.js';

function createDriftwood(x, z, length = 2.8, yaw = 0) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, length, 10), mats.wood);
    mesh.position.set(x, 0.35, z);
    mesh.rotation.z = Math.PI / 2;
    mesh.rotation.y = yaw;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    gameObjects.push({ type: 'obstacle', mesh });
}

export class TankBattleGame {
    constructor() {
        this.cooldowns = [];
        this.shellSpeed = 15;
        this.reloadTime = 1.5;
        this.spawnPositions = [
            new THREE.Vector3(-8, 0, 8),
            new THREE.Vector3(8, 0, -8),
            new THREE.Vector3(-8, 0, -8),
            new THREE.Vector3(8, 0, 8)
        ];
    }

    get meta() {
        return {
            title: 'Tank Takedown',
            description: 'Tropical tank skirmish. Use crates and driftwood for cover while blasting rivals.',
            penalty: '3 Sips',
            environment: 'ISLAND'
        };
    }

    start(players, manager) {
        this.cooldowns = players.map(() => 0);
        manager.setBoundaryLimit(9);
        useTankModels();
        players.forEach((p, idx) => {
            p.hp = 3;
            const spawn = this.spawnPositions[idx] || new THREE.Vector3(0, 0, 0);
            p.position.copy(spawn);
            p.rotation.set(0, Math.atan2(-spawn.x, -spawn.z), 0);
        });
        this.buildArena();
    }

    buildArena() {
        spawnObstacles();
        createDriftwood(-5, 0, 3.2, Math.PI / 6);
        createDriftwood(5, -1, 2.4, -Math.PI / 4);
        createDriftwood(0, 5, 2.8, Math.PI / 3);
    }

    handleMovement(dt, inputs, players, manager) {
        const speed = 6 * dt;
        players.forEach((mesh, idx) => {
            const input = inputs[idx];
            if (!input) return;
            if (mesh.stunned && mesh.stunned > 0) {
                mesh.stunned -= dt;
                return;
            }
            if (input.x !== 0 || input.z !== 0) {
                mesh.position.x += input.x * speed;
                mesh.position.z += input.z * speed;
                mesh.lookAt(mesh.position.x + input.x, mesh.position.y, mesh.position.z + input.z);
            }
            mesh.position.clamp(
                new THREE.Vector3(-manager.boundaryLimit, 0, -manager.boundaryLimit),
                new THREE.Vector3(manager.boundaryLimit, 1, manager.boundaryLimit)
            );
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
            for (const piece of gameObjects) {
                if (piece.type === 'obstacle' && piece.mesh.position.distanceTo(pos) < 1.2) {
                    destroyed = true;
                    break;
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
