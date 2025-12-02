export function createRunnerScene({ scene }) {
    const group = new THREE.Group();
    const road = new THREE.Mesh(new THREE.PlaneGeometry(16, 80), new THREE.MeshStandardMaterial({ color: 0x333333 }));
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, -0.01, 0);
    road.receiveShadow = true;
    group.add(road);

    for (let i = -2; i <= 2; i++) {
        const stripe = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 80), new THREE.MeshStandardMaterial({ color: 0xf2f2f2 }));
        stripe.rotation.x = -Math.PI / 2;
        stripe.position.set(i * 2, 0.001, 0);
        group.add(stripe);
    }

    group.visible = false;
    scene.add(group);

    return {
        id: 'RUNNER',
        enable({ ambientLight, dirLight }) {
            group.visible = true;
            scene.background = new THREE.Color(0x14233d);
            scene.fog.color.setHex(0x14233d);
            ambientLight.intensity = 0.8;
            ambientLight.color.setHex(0xffffff);
            dirLight.color.setHex(0xc0d6ff);
        },
        disable() {
            group.visible = false;
        }
    };
}
