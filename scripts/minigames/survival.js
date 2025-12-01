import { spawnFallingCoconut } from '../scene.js';

export class SurvivalGame {
    constructor() {
        this.spawnTimer = 0.5;
    }

    get meta() {
        return {
            title: 'Coconut Chaos',
            description: 'Dodge dropping coconuts that get faster every second!',
            penalty: '2 Sips'
        };
    }

    start(p1Mesh, p2Mesh) {
        this.spawnTimer = 0.4;
        p1Mesh.hp = 1;
        p2Mesh.hp = 1;
    }

    update(dt, _input, _p1Mesh, _p2Mesh, gameTimer) {
        this.spawnTimer -= dt;
        if(this.spawnTimer <= 0) {
            spawnFallingCoconut();
            this.spawnTimer = Math.max(0.1, 0.65 - (gameTimer * 0.02));
        }
    }
}
