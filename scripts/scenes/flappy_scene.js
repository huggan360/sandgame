export function createFlappyScene({ scene, mats }) {
    const group = new THREE.Group();
    const backdrop = new THREE.Mesh(new THREE.PlaneGeometry(40, 20), new THREE.MeshStandardMaterial({ color: 0x9ad6ff }));
    backdrop.position.set(0, 6, 0);
    group.add(backdrop);

    const floor = new THREE.Mesh(new THREE.BoxGeometry(40, 1, 1), new THREE.MeshStandardMaterial({ color: 0x7cc576 }));
    floor.position.set(0, 0, 0);
    group.add(floor);

    group.visible = false;
    scene.add(group);

    const skyColor = 0xa3d8ff;

    return {
        id: 'FLAPPY',
        enable({ ambientLight, dirLight }) {
            group.visible = true;
            scene.background = new THREE.Color(skyColor);
            scene.fog.color.setHex(skyColor);
            ambientLight.intensity = 0.9;
            ambientLight.color.setHex(0xffffff);
            dirLight.color.setHex(0xffffff);
        },
        disable() {
            group.visible = false;
        }
    };
}
