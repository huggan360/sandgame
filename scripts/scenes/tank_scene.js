import { createArenaFloor } from './arena_scene.js';

export function createTankScene({ scene, mats, basePlayRadius, sharedFloor }) {
    const floor = sharedFloor || createArenaFloor(scene, mats, basePlayRadius);
    return {
        id: 'TANK',
        enable({ ambientLight, dirLight }) {
            floor.visible = false;
            floor.position.y = 100;
            scene.background = new THREE.Color(0x0f182b);
            scene.fog.color.setHex(0x14233d);
            ambientLight.intensity = 0.75;
            ambientLight.color.setHex(0xffffff);
            dirLight.color.setHex(0xcde3ff);
        },
        disable() {
            floor.visible = false;
            floor.position.y = 100;
        },
        resize(scale) {
            floor.scale.setScalar(scale);
        }
    };
}
