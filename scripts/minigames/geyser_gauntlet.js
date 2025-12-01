import { gameObjects, removeObj, mats, scene, flashHit } from '../scene.js';

function distanceToSegmentXZ(point, a, b) {
    const pa = point.clone().sub(a);
    const ba = b.clone().sub(a);
    const h = THREE.MathUtils.clamp(pa.dot(ba) / ba.lengthSq(), 0, 1);
    return pa.sub(ba.multiplyScalar(h)).length();
}

export class GeyserGauntletGame {
    constructor() {
        this.spawnTimer = 0.6;
        this.warningTime = 1.2;
        this.iframes = { 1: 0, 2: 0 };
        this.armSpeed = 0.9;
    }

    get meta() {
        return {
            title: 'Geyser Gauntlet',
            description: 'Dodge sweeping arms and erupting geysers! Hazards stack up as the timer climbs.',
            penalty: '2 Big Sips',
            environment: 'ARENA'
        };
    }

    start(p1Mesh, p2Mesh, manager) {
        this.spawnTimer = 0.5;
        this.iframes = { 1: 0, 2: 0 };
        this.createSweepArm();
        p1Mesh.hp = 4;
        p2Mesh.hp = 4;
        manager.boundaryLimit = 7.5;
    }

    createSweepArm() {
        const group = new THREE.Group();
        group.rotation.y = Math.random() * Math.PI * 2;
        const bar = new THREE.Mesh(new THREE.BoxGeometry(12, 0.35, 0.7), mats.obsidian);
        bar.position.y = 0.6;
        bar.castShadow = true;
        const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.4, 16), mats.gold);
        hub.position.y = 0.6;
        group.add(bar);
        group.add(hub);
        scene.add(group);

        gameObjects.push({ type: 'sweep_arm', mesh: group, parts: [bar, hub], speed: this.armSpeed });
    }

    spawnWarning() {
        let x = 0, z = 0, tries = 0;
        do {
            x = (Math.random() - 0.5) * 12;
            z = (Math.random() - 0.5) * 12;
            tries++;
        } while (Math.hypot(x, z) > 7 && tries < 8);

        const ring = new THREE.Mesh(new THREE.CircleGeometry(1.3, 24), mats.shadow.clone());
        ring.rotation.x = -Math.PI / 2;
        ring.material.opacity = 0.15;
        ring.position.set(x, 0.01, z);
        scene.add(ring);

        const sparkle = new THREE.Mesh(new THREE.DodecahedronGeometry(0.25), mats.gold);
        sparkle.position.set(x, 0.25, z);
        scene.add(sparkle);

        gameObjects.push({ type: 'geyser_warning', mesh: ring, parts: [sparkle], timer: this.warningTime });
    }

    eruptGeyser(index, p1Mesh, p2Mesh, manager) {
        const warning = gameObjects[index];
        const pos = warning.mesh.position.clone();
        scene.remove(warning.mesh);
        if (warning.parts) warning.parts.forEach(p => scene.remove(p));

        const plume = new THREE.Mesh(new THREE.ConeGeometry(1.2, 2.2, 14), mats.teal);
        plume.position.set(pos.x, 1.1, pos.z);
        plume.castShadow = true;
        scene.add(plume);

        gameObjects[index] = { type: 'geyser_burst', mesh: plume, timer: 0.7 };
        this.blastPlayers(pos, p1Mesh, p2Mesh, manager);
    }

    blastPlayers(origin, p1Mesh, p2Mesh, manager) {
        const apply = (playerMesh, playerId) => {
            const dist = origin.distanceTo(playerMesh.position);
            if (dist < 1.7 && this.iframes[playerId] <= 0) {
                this.iframes[playerId] = 0.5;
                playerMesh.hp -= 1;
                playerMesh.stunned = 0.6;
                const pushDir = new THREE.Vector3().subVectors(playerMesh.position, origin).setY(0).normalize();
                if (pushDir.lengthSq() > 0) playerMesh.position.add(pushDir.multiplyScalar(1.4));
                flashHit(playerMesh);
                manager.updateHud();
                if (playerMesh.hp <= 0) manager.endGame(playerId === 1 ? 2 : 1);
            }
        };

        apply(p1Mesh, 1);
        apply(p2Mesh, 2);
    }

    hitBySweep(playerMesh, dir, playerId, manager) {
        if (this.iframes[playerId] > 0) return;
        this.iframes[playerId] = 0.4;
        playerMesh.hp -= 1;
        playerMesh.stunned = 0.45;
        playerMesh.position.add(dir.clone().setY(0).normalize().multiplyScalar(1.2));
        flashHit(playerMesh);
        manager.updateHud();
        if (playerMesh.hp <= 0) manager.endGame(playerId === 1 ? 2 : 1);
    }

    update(dt, _input, p1Mesh, p2Mesh, timer, manager) {
        this.spawnTimer -= dt;
        this.iframes[1] = Math.max(0, this.iframes[1] - dt);
        this.iframes[2] = Math.max(0, this.iframes[2] - dt);

        if (this.spawnTimer <= 0) {
            this.spawnWarning();
            this.spawnTimer = Math.max(0.5, 1.6 - timer * 0.03);
        }

        for (let i = gameObjects.length - 1; i >= 0; i--) {
            const obj = gameObjects[i];
            if (obj.type === 'geyser_warning') {
                obj.timer -= dt;
                obj.mesh.material.opacity = 0.15 + (1 - obj.timer / this.warningTime) * 0.35;
                if (obj.parts && obj.parts[0]) obj.parts[0].rotation.y += dt * 4;
                if (obj.timer <= 0) this.eruptGeyser(i, p1Mesh, p2Mesh, manager);
            }
            else if (obj.type === 'geyser_burst') {
                obj.timer -= dt;
                obj.mesh.scale.y = 0.9 + Math.sin((0.7 - obj.timer) * 10) * 0.08;
                if (obj.timer <= 0) removeObj(i);
            }
            else if (obj.type === 'sweep_arm') {
                obj.mesh.rotation.y += obj.speed * dt;
                const dir = new THREE.Vector3(Math.sin(obj.mesh.rotation.y), 0, Math.cos(obj.mesh.rotation.y));
                const a = dir.clone().multiplyScalar(-6);
                const b = dir.clone().multiplyScalar(6);
                const p1 = new THREE.Vector3(p1Mesh.position.x, 0, p1Mesh.position.z);
                const p2 = new THREE.Vector3(p2Mesh.position.x, 0, p2Mesh.position.z);
                if (distanceToSegmentXZ(p1, a, b) < 0.75) this.hitBySweep(p1Mesh, dir, 1, manager);
                if (distanceToSegmentXZ(p2, a, b) < 0.75) this.hitBySweep(p2Mesh, dir, 2, manager);
            }
        }
    }
}
