export function createVolcanoScene({ scene, mats }) {
    const group = new THREE.Group();
    const platform = new THREE.Mesh(new THREE.CylinderGeometry(8, 6, 2, 8), mats.obsidian);
    platform.position.y = -1;
    platform.castShadow = true;
    platform.receiveShadow = true;
    group.add(platform);

    const lava = new THREE.Mesh(new THREE.PlaneGeometry(300, 300), mats.magma);
    lava.rotation.x = -Math.PI / 2;
    lava.position.y = -2;
    group.add(lava);

    group.visible = false;
    scene.add(group);

    return {
        id: 'VOLCANO',
        enable({ ambientLight, dirLight }) {
            group.visible = true;
            scene.background = new THREE.Color(0x110000);
            scene.fog.color.setHex(0x220000);
            dirLight.color.setHex(0xff4400);
            ambientLight.color.setHex(0x550000);
        },
        disable() {
            group.visible = false;
        },
        resize(scale) {
            group.scale.setScalar(scale);
        }
    };
}
