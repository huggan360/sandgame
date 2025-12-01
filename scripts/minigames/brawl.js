import { spawnObstacles, spawnProjectile } from '../scene.js';

export class BrawlGame {
    constructor() {
        this.cooldowns = [];
    }

    get meta() {
        return {
            title: 'Tiki Brawl',
            description: 'Shoot! Use Crates for Cover! 3 Hits to Win.',
            penalty: '1 Sip'
        };
    }

    start(players) {
        this.cooldowns = players.map(() => 0);
        players.forEach(p => p.hp = 3);
        spawnObstacles();
    }

    update(dt, input, players) {
        this.cooldowns = this.cooldowns || [];
        players.forEach((mesh, idx) => {
            this.cooldowns[idx] = Math.max(0, (this.cooldowns[idx] || 0) - dt);
            if (input[idx]?.action && this.cooldowns[idx] <= 0) {
                spawnProjectile(mesh, mesh.playerIndex);
                this.cooldowns[idx] = 0.45;
            }
        });
    }
}
