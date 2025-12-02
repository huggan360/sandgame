export function createArenaFloor(scene, mats, basePlayRadius) {
    const arena = new THREE.Mesh(new THREE.CylinderGeometry(basePlayRadius, basePlayRadius, 0.5, 32), new THREE.MeshStandardMaterial({ color: 0x444444 }));
    arena.position.y = 100;
    arena.receiveShadow = true;
    arena.visible = false;
    scene.add(arena);
    return arena;
}

export function createArenaScene({ scene, mats, basePlayRadius, sharedFloor }) {
    const floor = sharedFloor || createArenaFloor(scene, mats, basePlayRadius);
    return {
        id: 'ARENA',
        enable({ ambientLight, dirLight }) {
            floor.visible = true;
            floor.position.y = 0.1;
            floor.material = mats.obsidian;
            floor.scale.set(1, 1, 1);
            scene.background = new THREE.Color(0x203040);
            ambientLight.intensity = 0.8;
            ambientLight.color.setHex(0xffffff);
            dirLight.color.setHex(0xffdfba);
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
