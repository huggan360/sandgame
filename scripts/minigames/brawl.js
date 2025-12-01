import { spawnObstacles, spawnProjectile } from '../scene.js';

export class BrawlGame {
    constructor() {
        this.p1ShootCd = 0;
        this.p2ShootCd = 0;
    }

    get meta() {
        return {
            title: 'Tiki Brawl',
            description: 'Shoot! Use Crates for Cover! 3 Hits to Win.',
            penalty: '1 Sip'
        };
    }

    start(p1Mesh, p2Mesh) {
        this.p1ShootCd = 0;
        this.p2ShootCd = 0;
        p1Mesh.hp = 3;
        p2Mesh.hp = 3;
        spawnObstacles();
    }

    update(dt, input, p1Mesh, p2Mesh) {
        if(this.p1ShootCd > 0) this.p1ShootCd -= dt;
        if(input.p1.action && this.p1ShootCd <= 0) {
            spawnProjectile(p1Mesh, 1);
            this.p1ShootCd = 0.45;
        }
        if(this.p2ShootCd > 0) this.p2ShootCd -= dt;
        if(input.p2.action && this.p2ShootCd <= 0) {
            spawnProjectile(p2Mesh, 2);
            this.p2ShootCd = 0.45;
        }
    }
}
