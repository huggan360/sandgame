export class SkySlamGame {
    constructor() {
        this.radius = 7.2;
        this.p1Cooldown = 0;
        this.p2Cooldown = 0;
    }

    get meta() {
        return {
            title: 'Sky Rink Showdown',
            description: 'On a floating sheet of ice, slide and shoulder check! Knock your foe into the clouds.',
            penalty: 'Shot or 4 Sips',
            environment: 'SKY'
        };
    }

    start(p1Mesh, p2Mesh, manager) {
        this.p1Cooldown = 0;
        this.p2Cooldown = 0;
        manager.boundaryLimit = null; // custom edge handling
        p1Mesh.slideVel = new THREE.Vector3();
        p2Mesh.slideVel = new THREE.Vector3();
        p1Mesh.falling = false;
        p2Mesh.falling = false;
        p1Mesh.position.set(-3, 0.1, 0);
        p2Mesh.position.set(3, 0.1, 0);
    }

    handleMovement(dt, input, p1Mesh, p2Mesh) {
        const accel = 18;
        const friction = Math.pow(0.985, dt * 60);
        const applyInput = (mesh, controls) => {
            if (mesh.stunned && mesh.stunned > 0) mesh.stunned = Math.max(0, mesh.stunned - dt);
            const dir = new THREE.Vector3(controls.x, 0, controls.z);
            if ((!mesh.stunned || mesh.stunned <= 0) && dir.lengthSq() > 0) {
                dir.normalize();
                mesh.slideVel.add(dir.multiplyScalar(accel * dt));
            }
            mesh.slideVel.multiplyScalar(friction);
            mesh.position.add(mesh.slideVel.clone().multiplyScalar(dt));
            mesh.position.y = Math.max(mesh.position.y, mesh.falling ? -100 : 0.08);
        };

        applyInput(p1Mesh, input.p1);
        applyInput(p2Mesh, input.p2);
    }

    push(attacker, defender, cooldownSetter) {
        const dir = attacker.aimDir ? attacker.aimDir.clone().setY(0) : new THREE.Vector3(1, 0, 0);
        if (dir.lengthSq() === 0) return;
        dir.normalize();
        defender.slideVel.add(dir.clone().multiplyScalar(12));
        attacker.slideVel.add(dir.clone().multiplyScalar(-5));
        defender.stunned = 0.25;
        cooldownSetter();
    }

    update(dt, input, p1Mesh, p2Mesh, _timer, manager) {
        this.p1Cooldown = Math.max(0, this.p1Cooldown - dt);
        this.p2Cooldown = Math.max(0, this.p2Cooldown - dt);

        if (input.p1.action && this.p1Cooldown <= 0) this.push(p1Mesh, p2Mesh, () => this.p1Cooldown = 1.1);
        if (input.p2.action && this.p2Cooldown <= 0) this.push(p2Mesh, p1Mesh, () => this.p2Cooldown = 1.1);

        const checkFall = (mesh, playerId) => {
            if (mesh.falling) {
                mesh.slideVel.multiplyScalar(0.99);
                mesh.position.y -= dt * 6;
                if (mesh.position.y < -5) manager.endGame(playerId === 1 ? 2 : 1);
                return;
            }

            const dist = Math.hypot(mesh.position.x, mesh.position.z);
            if (dist > this.radius) {
                mesh.falling = true;
                mesh.slideVel.set(mesh.position.x, 0, mesh.position.z).normalize().multiplyScalar(5);
            }
        };

        checkFall(p1Mesh, 1);
        checkFall(p2Mesh, 2);
    }
}
