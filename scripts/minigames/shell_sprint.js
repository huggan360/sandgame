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

    start(players, manager) {
        this.cleanupTarget();
        if (manager) {
            manager.activeSlots.forEach(slot => manager.scores[slot] = 0);
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

    update(dt, _input, players, _timer, manager) {
        if (!this.activeTarget) this.spawnNewTarget();
        if (!this.activeTarget || !manager) return;

        const { mesh, topper, ring } = this.activeTarget;
        mesh.rotation.z += dt * 2;
        if (topper) topper.rotation.y += dt * 4;
        if (ring) {
            ring.rotation.z += dt * 0.5;
            ring.scale.setScalar(1 + Math.sin(performance.now() * 0.005) * 0.05);
        }

        const tryCapture = (playerMesh) => {
            if (mesh.position.distanceTo(playerMesh.position) < 1.2) {
                manager.scores[playerMesh.playerIndex] = (manager.scores[playerMesh.playerIndex] || 0) + 1;
                manager.updateHud();

                if (manager.scores[playerMesh.playerIndex] >= 3) manager.endGame(playerMesh.playerIndex);
                if (manager.state === 'PLAYING') this.spawnNewTarget();
                return true;
            }
            return false;
        };

        for (const mesh of players) {
            if (tryCapture(mesh)) break;
        }
    }
}
