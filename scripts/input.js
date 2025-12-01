export const Input = {
    keys: {},
    init() {
        window.addEventListener('keydown', e => this.keys[e.code] = true);
        window.addEventListener('keyup', e => this.keys[e.code] = false);
    },
    getP1Axis() {
        let x = 0, z = 0;
        if (this.keys['KeyA']) x -= 1;
        if (this.keys['KeyD']) x += 1;
        if (this.keys['KeyW']) z -= 1;
        if (this.keys['KeyS']) z += 1;
        return { x, z, action: this.keys['Space'] };
    },
    getP2Axis() {
        let x = 0, z = 0;
        if (this.keys['ArrowLeft'] || this.keys['Numpad4']) x -= 1;
        if (this.keys['ArrowRight'] || this.keys['Numpad6']) x += 1;
        if (this.keys['ArrowUp'] || this.keys['Numpad8']) z -= 1;
        if (this.keys['ArrowDown'] || this.keys['Numpad5'] || this.keys['Numpad2']) z += 1;
        return { x, z, action: this.keys['Enter'] || this.keys['Numpad0'] || this.keys['NumpadEnter'] };
    }
};

Input.init();
