import { createArenaFloor } from './arena_scene.js';

export function createSkyScene({ scene, mats, basePlayRadius, sharedFloor }) {
    const floor = sharedFloor || createArenaFloor(scene, mats, basePlayRadius);
    const skyColor = 0xcce8ff;
    return {
        id: 'SKY',
        enable({ ambientLight, dirLight }) {
            floor.visible = true;
            floor.position.y = 4;
            floor.material = mats.ice;
            floor.scale.set(1, 1, 1);
            scene.background = new THREE.Color(skyColor);
            scene.fog.color.setHex(0xb7d9ff);
            ambientLight.intensity = 0.9;
            ambientLight.color.setHex(0xffffff);
            dirLight.color.setHex(0xffffff);
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
