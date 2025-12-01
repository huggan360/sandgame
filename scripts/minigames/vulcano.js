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

    start(p1Mesh, p2Mesh) {
        this.spawnTimer = 1.0;
        this.difficultyTimer = 0;
        // Give players more HP for this one because it's chaotic
        p1Mesh.hp = 5;
        p2Mesh.hp = 5;
        p1Mesh.stunned = 0;
        p2Mesh.stunned = 0;
    }

    update(dt, _input, p1Mesh, p2Mesh, gameTimer) {
        // Handle Stun Timers
        if(p1Mesh.stunned > 0) p1Mesh.stunned -= dt;
        if(p2Mesh.stunned > 0) p2Mesh.stunned -= dt;

        // Visual cue for stunned players (shake or opacity)
        p1Mesh.visible = (p1Mesh.stunned > 0) ? Math.random() > 0.5 : true;
        p2Mesh.visible = (p2Mesh.stunned > 0) ? Math.random() > 0.5 : true;

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