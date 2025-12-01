import { mats, gameObjects, scene, removeObj, flashHit } from '../scene.js';

export class RoadRunnerGame {
    constructor() {
        this.spawnTimer = 1.2;
        this.baseSpeed = 10;
    }

    get meta() {
        return {
            title: 'Road Runner',
            description: 'Dodge the incoming obstacles. Last one standing wins.',
            penalty: '2 Sips',
            environment: 'RUNNER'
        };
    }

    start(players, manager) {
        this.spawnTimer = 1.2;
        manager.setBoundaryLimit(null);
        const numPlayers = players.length;
        const spacing = 4;
        const startX = - (numPlayers - 1) * spacing / 2;

        players.forEach((mesh, idx) => {
            mesh.position.set(startX + idx * spacing, 0, -8);
            mesh.rotation.set(0, 0, 0);
            mesh.hp = 3;
            mesh.stunned = 0;
        });
        manager.updateHud();
    }

    handleMovement(dt, inputs, players) {
        const moveSpeed = 12 * dt;
        players.forEach((mesh, idx) => {
            const input = inputs[idx] || {};
            mesh.stunned = Math.max(0, (mesh.stunned || 0) - dt);
            if (mesh.stunned > 0 || mesh.hp <= 0) return;

            mesh.position.x += (input.x || 0) * moveSpeed;
            mesh.position.x = Math.max(-12, Math.min(12, mesh.position.x));
            mesh.lookAt(mesh.position.x, mesh.position.y, mesh.position.z + 12);
        });
    }

    spawnObstacle(timer) {
        const lane = (Math.random() - 0.5) * 24;
        const width = 1 + Math.random() * 1.5;
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, 1.5, 1.5), mats.crate);
        mesh.position.set(lane, 0.75, 26);
        mesh.castShadow = true;
        scene.add(mesh);
        const speed = this.baseSpeed + (timer || 0) * 0.3 + (Math.random() - 0.5) * 4;
        gameObjects.push({ type: 'runner_obstacle', mesh, speed });
    }

    updateObstacles(dt, players, manager) {
        for (let i = gameObjects.length - 1; i >= 0; i--) {
            const obj = gameObjects[i];
            if (obj.type !== 'runner_obstacle') continue;
            obj.mesh.position.z -= obj.speed * dt;
            if (obj.mesh.position.z < -15) {
                removeObj(i);
                continue;
            }

            players.forEach(mesh => {
                if (!mesh.visible || mesh.hp <= 0) return;
                const dx = Math.abs(mesh.position.x - obj.mesh.position.x);
                const dz = Math.abs(mesh.position.z - obj.mesh.position.z);
                if (dx < (1.2 + 0.5) && dz < (1.2 + 0.5)) {
                    mesh.hp = Math.max(0, (mesh.hp || 0) - 1);
                    flashHit(mesh);
                    mesh.stunned = 0.6;
                    manager.updateHud();
                    removeObj(i);
                    if (mesh.hp <= 0) {
                        manager.eliminatePlayer(mesh.playerIndex);
                    }
                }
            });
        }
    }

    update(dt, inputs, players, timer, manager) {
        this.spawnTimer -= dt;
        if (this.spawnTimer <= 0) {
            this.spawnObstacle(timer);
            this.spawnTimer = Math.max(0.4, 1.2 - timer * 0.03);
        }

        this.handleMovement(dt, inputs, players);
        this.updateObstacles(dt, players, manager);

        if (manager.state !== 'PLAYING') return;

        if (manager.aliveSlots.length <= 1 && players.length > 1) {
            manager.endGame(manager.aliveSlots[0] ?? null);
        } else if (manager.aliveSlots.length === 0) {
            manager.endGame(null);
        }
    }
}
