import { mats, gameObjects, scene, removeObj, flashHit } from '../scene.js';

function createNameLabel(text, color) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff';
    ctx.font = '28px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = color || '#ffffff';
    ctx.lineWidth = 4;
    ctx.strokeText(text, canvas.width / 2, canvas.height / 2);
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false });
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(2, 0.5), material);
    plane.position.set(0, -0.8, 0);
    return plane;
}

export class FlappyFlockGame {
    constructor() {
        this.allowClampAfterMovement = false;
        this.pipeTimer = 0;
        this.lastActions = [];
        this.gapSize = 3.2;
        this.gravity = -10;
        this.flapStrength = 7;
        this.scrollSpeed = 6;
    }

    get meta() {
        return {
            title: 'Flappy Flock',
            description: 'Tap to flap your bird and weave through palm pipes. Last flyer standing wins.',
            penalty: '2 Sips',
            environment: 'FLAPPY'
        };
    }

    decorateBird(mesh, name) {
        if (mesh.flappyParts?.length) {
            mesh.flappyParts.forEach(p => mesh.remove(p));
        }
        const group = new THREE.Group();
        const color = mesh.body?.material?.color?.getHex() || mats.p1.color.getHex();
        const body = new THREE.Mesh(new THREE.SphereGeometry(0.6, 18, 18), new THREE.MeshStandardMaterial({ color }));
        body.castShadow = true;
        group.add(body);

        const beak = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.35, 10), mats.gold);
        beak.rotation.z = Math.PI / 2;
        beak.position.set(0.65, 0, 0);
        body.add(beak);

        const wingMat = new THREE.MeshStandardMaterial({ color, opacity: 0.85, transparent: true });
        const wing = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.25, 0.05), wingMat);
        wing.position.set(-0.05, 0, 0.35);
        body.add(wing);

        const label = createNameLabel(name, `#${color.toString(16).padStart(6, '0')}`);
        group.add(label);

        mesh.add(group);
        mesh.flappyParts = [group];
        if (mesh.body) mesh.body.visible = false;
    }

    spawnPipe() {
        const x = 14;
        const gapY = 3 + Math.random() * 5;
        const width = 1.6;
        const heightTop = 12 - gapY - this.gapSize / 2;
        const heightBottom = gapY - this.gapSize / 2;

        const top = new THREE.Mesh(new THREE.BoxGeometry(width, heightTop, 1), mats.wood);
        top.position.set(x, gapY + this.gapSize / 2 + heightTop / 2, -8);
        top.castShadow = true;

        const bottom = new THREE.Mesh(new THREE.BoxGeometry(width, heightBottom, 1), mats.wood);
        bottom.position.set(x, heightBottom / 2, -8);
        bottom.castShadow = true;

        const group = new THREE.Group();
        group.add(top);
        group.add(bottom);
        scene.add(group);
        gameObjects.push({ type: 'flappy_pipe', mesh: group, parts: [top, bottom], gapY, width, scored: {} });
    }

    start(players, manager) {
        this.pipeTimer = 1.2;
        this.lastActions = [];
        manager.setBoundaryLimit(null);
        players.forEach((mesh, idx) => {
            const laneOffset = (idx - (players.length - 1) / 2) * 2;
            mesh.position.set(-6, 5, laneOffset - 8);
            mesh.rotation.set(0, Math.PI / 2, 0);
            mesh.velY = 0;
            mesh.visible = true;
            mesh.stunned = 0;
            mesh.hp = 1;
            this.lastActions[idx] = false;
            this.decorateBird(mesh, manager.getPlayerName?.(mesh.playerIndex) || `Player ${mesh.playerIndex + 1}`);
            manager.scores[mesh.playerIndex] = 0;
        });
        manager.updateHud();
    }

    handleCrash(mesh, manager) {
        mesh.hp = 0;
        flashHit(mesh);
        manager.eliminatePlayer(mesh.playerIndex);
    }

    handleMovement(dt, inputs, players, manager) {
        players.forEach((mesh, idx) => {
            if (!mesh.visible) return;
            const input = inputs[idx] || {};
            const justPressed = input.action && !this.lastActions[idx];
            if (justPressed) {
                mesh.velY = this.flapStrength;
            }
            this.lastActions[idx] = !!input.action;

            mesh.velY += this.gravity * dt;
            mesh.position.y += mesh.velY * dt;
            if (mesh.position.y <= 0.5) {
                // Hug the ground instead of dying; stick to floor and clear downward momentum
                mesh.position.y = 0.5;
                mesh.velY = 0;
            } else if (mesh.position.y > 12) {
                this.handleCrash(mesh, manager);
            }
        });
    }

    updatePipes(dt, players, manager) {
        for (let i = gameObjects.length - 1; i >= 0; i--) {
            const obj = gameObjects[i];
            if (obj.type !== 'flappy_pipe') continue;
            obj.mesh.position.x -= this.scrollSpeed * dt;

            if (obj.mesh.position.x < -16) {
                removeObj(i);
                continue;
            }

            players.forEach(mesh => {
                if (!mesh.visible) return;
                const dx = Math.abs(mesh.position.x - obj.mesh.position.x);
                const withinPipe = dx < obj.width;
                const gapTop = obj.gapY + this.gapSize / 2;
                const gapBottom = obj.gapY - this.gapSize / 2;
                if (withinPipe && (mesh.position.y > gapTop || mesh.position.y < gapBottom)) {
                    this.handleCrash(mesh, manager);
                }

                if (!obj.scored[mesh.playerIndex] && obj.mesh.position.x < mesh.position.x) {
                    obj.scored[mesh.playerIndex] = true;
                    manager.scores[mesh.playerIndex] = (manager.scores[mesh.playerIndex] || 0) + 1;
                    manager.updateHud();
                }
            });
        }
    }

    update(dt, inputs, players, _timer, manager) {
        this.pipeTimer -= dt;
        if (this.pipeTimer <= 0) {
            this.spawnPipe();
            this.pipeTimer = Math.max(0.8, 1.5 - (manager.timer || 0) * 0.02);
        }

        this.handleMovement(dt, inputs, players, manager);
        this.updatePipes(dt, players, manager);

        if (manager.state !== 'PLAYING') return;

        if (manager.aliveSlots.length === 1) {
            manager.endGame(manager.aliveSlots[0]);
        } else if (manager.aliveSlots.length === 0) {
            manager.endGame(null);
        }
    }
}
