import { spawnFallingCoconut } from '../scene.js';

export class SurvivalGame {
    constructor() {
        this.spawnTimer = 0.5;
    }

    get meta() {
        return {
            title: 'Coconut Chaos',
            description: 'Dodge dropping coconuts that get faster every second!',
            penalty: '2 Sips',
            environment: 'ISLAND',
            duration: 60
        };
    }

    start(players) {
        this.spawnTimer = 0.4;
        players.forEach(p => p.hp = 1);
    }

    update(dt, _input, _players, _timerMeshes, gameTimer) {
        this.spawnTimer -= dt;
        if(this.spawnTimer <= 0) {
            spawnFallingCoconut();
            this.spawnTimer = Math.max(0.1, 0.65 - (gameTimer * 0.02));
        }
    }
}
