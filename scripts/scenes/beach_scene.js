export function createBeachScene({ scene, mats, basePlayRadius }) {
    const group = new THREE.Group();
    const ocean = new THREE.Mesh(new THREE.PlaneGeometry(300, 300), mats.water);
    ocean.rotation.x = -Math.PI / 2;
    ocean.position.y = -0.5;
    ocean.receiveShadow = true;
    group.add(ocean);

    const island = new THREE.Mesh(new THREE.CylinderGeometry(basePlayRadius, basePlayRadius, 1, 32), mats.sand);
    island.position.y = -0.5;
    island.receiveShadow = true;
    group.add(island);

    function createPalm(x, z) {
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.2, 3, 6), mats.wood);
        trunk.position.set(x, 1, z);
        trunk.castShadow = true;
        trunk.receiveShadow = true;
        group.add(trunk);

        const leaves = new THREE.Mesh(new THREE.ConeGeometry(1.5, 1, 5), mats.leaf);
        leaves.position.set(x, 2.5, z);
        leaves.castShadow = true;
        leaves.receiveShadow = true;
        group.add(leaves);
    }

    for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        createPalm(Math.cos(a) * (basePlayRadius - 1.5), Math.sin(a) * (basePlayRadius - 1.5));
    }

    group.visible = false;
    scene.add(group);

    const skyColor = 0x87CEEB;

    return {
        id: 'ISLAND',
        enable({ ambientLight, dirLight, fogColor = skyColor }) {
            group.visible = true;
            scene.background = new THREE.Color(fogColor);
            scene.fog.color.setHex(fogColor);
            ambientLight.color.setHex(0xffffff);
            ambientLight.intensity = 0.6;
            dirLight.color.setHex(0xffdfba);
        },
        disable() {
            group.visible = false;
        },
        resize(scale) {
            group.scale.setScalar(scale);
        }
    };
}
