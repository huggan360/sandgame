import { mats, gameObjects, scene, removeObj, flashHit } from '../scene.js';

export class RoadRunnerGame {
    constructor() {
        this.allowClampAfterMovement = false;
        this.spawnTimer = 1.2;
        this.baseSpeed = 9;
    }

    get meta() {
        return {
            title: 'Boardwalk Dash',
            description: 'Slide side to side to dodge oncoming crates. Last survivor wins.',
            penalty: '2 Sips',
            environment: 'RUNNER'
        };
    }

    start(players, manager) {
        this.spawnTimer = 1.2;
        manager.setBoundaryLimit(null);
        players.forEach((mesh, idx) => {
            mesh.position.set(0, 0, -8 + idx * 0.01);
            mesh.rotation.set(0, 0, 0);
            mesh.lookAt(mesh.position.x, mesh.position.y, mesh.position.z + 10);
            mesh.hp = 3;
            mesh.stunned = 0;
            mesh.slideVel = new THREE.Vector3();
        });
        manager.updateHud();
    }

    handleMovement(dt, inputs, players) {
        const moveSpeed = 10 * dt;
        players.forEach((mesh, idx) => {
            const input = inputs[idx] || {};
            mesh.stunned = Math.max(0, (mesh.stunned || 0) - dt);
            if (mesh.stunned > 0) return;
            mesh.position.x += (input.x || 0) * moveSpeed * 3;
            mesh.position.x = Math.max(-6, Math.min(6, mesh.position.x));
            mesh.position.z = -8 + idx * 0.01;
            mesh.lookAt(mesh.position.x, mesh.position.y, mesh.position.z + 12);
        });
    }

    spawnObstacle(timer) {
        const lane = (Math.floor(Math.random() * 5) - 2) * 2;
        const size = 1 + Math.random() * 0.5;
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(size, size, size), mats.crate);
        mesh.position.set(lane, size / 2, 26);
        mesh.castShadow = true;
        scene.add(mesh);
        const speed = this.baseSpeed + (timer || 0) * 0.3;
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
                if (dx < 1.2 && dz < 1.2) {
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
            this.spawnTimer = Math.max(0.5, 1.3 - timer * 0.02);
        }

        this.handleMovement(dt, inputs, players);
        this.updateObstacles(dt, players, manager);

        if (manager.state !== 'PLAYING') return;

        if (manager.aliveSlots.length === 1) {
            manager.endGame(manager.aliveSlots[0]);
        } else if (manager.aliveSlots.length === 0) {
            manager.endGame(null);
        }
    }
}
