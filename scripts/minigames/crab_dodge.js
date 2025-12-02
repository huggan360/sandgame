import { spawnCrab } from '../scene.js';

export class CrabDodgeGame {
    constructor() {
        this.spawnTimer = 1.2;
    }

    get meta() {
        return {
            title: 'Crab Dodge',
            description: 'Sidestep the sideways crabs! Take 3 pinches before you’re out.',
            penalty: '1 Sip',
            environment: 'ISLAND',
            duration: 60
        };
    }

    start(players) {
        this.spawnTimer = 0.8;
        players.forEach(p => p.hp = 3);
        spawnCrab();
    }

    update(dt, _input, _players, timer) {
        this.spawnTimer -= dt;
        if (this.spawnTimer <= 0) {
            spawnCrab();
            this.spawnTimer = Math.max(0.4, 1.4 - timer * 0.03);
        }
    }
}
