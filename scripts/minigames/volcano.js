import { spawnVolcanoRock, gameObjects } from '../scene.js';

export class VolcanoGame {
    constructor() {
        this.spawnTimer = 0;
        this.difficultyTimer = 0;
    }

    get meta() {
        return {
            title: 'Magma Madness',
            description: 'Dodge the Magma Rocks! Getting hit STUNS you for 1.5s.',
            penalty: '3 Sips'
        };
    }

    start(players, manager) {
        this.spawnTimer = 1.0;
        this.difficultyTimer = 0;
        // Give players more HP for this one because it's chaotic
        players.forEach(p => { p.hp = 5; p.stunned = 0; p.visible = true; });
        manager.boundaryLimit = 8;
    }

    update(dt, _input, players, gameTimer) {
        // Handle Stun Timers
        players.forEach(p => {
            if(p.stunned > 0) p.stunned -= dt;
            p.visible = (p.stunned > 0) ? Math.random() > 0.5 : true;
        });

        // Spawn Rocks
        this.spawnTimer -= dt;
        this.difficultyTimer += dt;
        
        if(this.spawnTimer <= 0) {
            spawnVolcanoRock();
            // Spawns get faster as game progresses
            this.spawnTimer = Math.max(0.2, 0.8 - (this.difficultyTimer * 0.03));
        }
    }
}