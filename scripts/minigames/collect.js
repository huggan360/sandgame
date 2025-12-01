import { gameObjects, spawnPineapple } from '../scene.js';

export class CollectGame {
    constructor() {
        this.spawnTimer = 1;
    }

    get meta() {
        return {
            title: 'Pineapple Rush',
            description: 'Race to 5 points! Golden Pineapples are worth triple.',
            penalty: 'Score Diff'
        };
    }

    start() {
        this.spawnTimer = 0.5;
    }

    update(dt) {
        this.spawnTimer -= dt;
        const currentPineapples = gameObjects.filter(g => g.type === 'pineapple').length;
        if(this.spawnTimer <= 0 && currentPineapples < 5) {
            spawnPineapple();
            this.spawnTimer = 1.6;
        }
    }
}
