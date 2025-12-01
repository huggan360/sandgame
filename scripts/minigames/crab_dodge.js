import { spawnCrab } from '../scene.js';

export class CrabDodgeGame {
    constructor() {
        this.spawnTimer = 1.2;
    }

    get meta() {
        return {
            title: 'Crab Dodge',
            description: 'Sidestep the sideways crabs! Getting pinched knocks you out.',
            penalty: '1 Sip'
        };
    }

    start(p1Mesh, p2Mesh) {
        this.spawnTimer = 0.8;
        p1Mesh.hp = 1;
        p2Mesh.hp = 1;
        spawnCrab();
    }

    update(dt, _input, _p1Mesh, _p2Mesh, timer) {
        this.spawnTimer -= dt;
        if (this.spawnTimer <= 0) {
            spawnCrab();
            this.spawnTimer = Math.max(0.4, 1.4 - timer * 0.03);
        }
    }
}
