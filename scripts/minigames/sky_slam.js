export class SkySlamGame {
    constructor() {
        this.radius = 7.2;
        this.cooldowns = [];
    }

    get meta() {
        return {
            title: 'Sky Rink Showdown',
            description: 'On a floating sheet of ice, slide and shoulder check! Knock your foe into the clouds.',
            penalty: 'Shot or 4 Sips',
            environment: 'SKY'
        };
    }

    start(players, manager) {
        this.cooldowns = players.map(() => 0);
        manager.boundaryLimit = null; // custom edge handling
        const radius = 3.5;
        players.forEach((mesh, idx) => {
            const angle = (idx / players.length) * Math.PI * 2;
            mesh.slideVel = new THREE.Vector3();
            mesh.falling = false;
            mesh.position.set(Math.cos(angle) * radius, 0.1, Math.sin(angle) * radius);
        });
    }

    handleMovement(dt, input, players) {
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

        players.forEach((mesh, idx) => applyInput(mesh, input[idx] || { x:0, z:0, action:false }));
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

    update(dt, input, players, _timer, manager) {
        this.cooldowns = this.cooldowns.map(cd => Math.max(0, cd - dt));

        players.forEach((mesh, idx) => {
            if (input[idx]?.action && this.cooldowns[idx] <= 0) {
                const target = players
                    .filter(p => p !== mesh && p.visible !== false)
                    .sort((a, b) => mesh.position.distanceTo(a.position) - mesh.position.distanceTo(b.position))[0];
                if (target && mesh.position.distanceTo(target.position) < 2.5) {
                    this.push(mesh, target, () => this.cooldowns[idx] = 1.1);
                }
            }
        });

        const checkFall = (mesh) => {
            if (mesh.falling) {
                mesh.slideVel.multiplyScalar(0.99);
                mesh.position.y -= dt * 6;
                if (mesh.position.y < -5) manager.eliminatePlayer(mesh.playerIndex);
                return;
            }

            const dist = Math.hypot(mesh.position.x, mesh.position.z);
            if (dist > this.radius) {
                mesh.falling = true;
                mesh.slideVel.set(mesh.position.x, 0, mesh.position.z).normalize().multiplyScalar(5);
            }
        };

        players.forEach(checkFall);
    }
}
