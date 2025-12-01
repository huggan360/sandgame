import { spawnShellTarget, removeObj, gameObjects } from '../scene.js';

export class ShellSprintGame {
    constructor() {
        this.activeTarget = null;
    }

    get meta() {
        return {
            title: 'Shell Sprint',
            description: 'Dash to the glowing shells before your rival. First to 3 captures wins!',
            penalty: '2 Sips'
        };
    }

    start(_p1Mesh, _p2Mesh, manager) {
        this.cleanupTarget();
        if (manager) {
            manager.p1Score = 0;
            manager.p2Score = 0;
            manager.updateHud();
        }
        this.spawnNewTarget();
    }

    spawnNewTarget() {
        this.cleanupTarget();
        this.activeTarget = spawnShellTarget();
    }

    cleanupTarget() {
        if (this.activeTarget) {
            const idx = gameObjects.indexOf(this.activeTarget);
            if (idx >= 0) {
                removeObj(idx);
            }
            this.activeTarget = null;
        }
    }

    update(dt, _input, p1Mesh, p2Mesh, _timer, manager) {
        if (!this.activeTarget) this.spawnNewTarget();
        if (!this.activeTarget || !manager) return;

        const { mesh, topper, ring } = this.activeTarget;
        mesh.rotation.z += dt * 2;
        if (topper) topper.rotation.y += dt * 4;
        if (ring) {
            ring.rotation.z += dt * 0.5;
            ring.scale.setScalar(1 + Math.sin(performance.now() * 0.005) * 0.05);
        }

        const tryCapture = (playerId, playerMesh) => {
            if (mesh.position.distanceTo(playerMesh.position) < 1.2) {
                if (playerId === 1) manager.p1Score++;
                else manager.p2Score++;
                manager.updateHud();

                if (manager.p1Score >= 3) manager.endGame(1);
                else if (manager.p2Score >= 3) manager.endGame(2);
                if (manager.state === 'PLAYING') this.spawnNewTarget();
                return true;
            }
            return false;
        };

        if (tryCapture(1, p1Mesh)) return;
        tryCapture(2, p2Mesh);
    }
}
