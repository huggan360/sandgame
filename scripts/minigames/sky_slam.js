// 2D Ice Sumo Knockout adapted for joystick movement
export class SkySlamGame {
    constructor() {
        this.meta = {
            title: 'Ice Sumo',
            description: 'Glide on the shrinking rink and bump rivals off the ice. Joystick to steer!',
            penalty: 'Shot or 4 Sips',
            environment: 'SKY',
            duration: null,
            titleStyle: 'font-size:4rem; margin:0; color:#caf0f8; text-shadow:0 0 20px #00b4d8; font-style:italic; letter-spacing:1px;'
        };
        this.canvas = null;
        this.ctx = null;
        this.container = null;
        this.wrapper = null;
        this.players = [];
        this.radius = 340; // start radius for 800x800
        this.running = false;
        this.manager = null;
    }

    ensureCanvas() {
        if (this.canvas) return;
        this.container = document.createElement('div');
        this.container.id = 'sky-container';
        this.container.style.position = 'fixed';
        this.container.style.inset = '0';
        this.container.style.display = 'flex';
        this.container.style.alignItems = 'center';
        this.container.style.justifyContent = 'center';
        this.container.style.pointerEvents = 'none';
        this.container.style.zIndex = '5';

        this.wrapper = document.createElement('div');
        this.wrapper.style.position = 'absolute';
        this.wrapper.style.top = '50%';
        this.wrapper.style.left = '50%';
        this.wrapper.style.width = '800px';
        this.wrapper.style.height = '800px';
        this.wrapper.style.transformOrigin = 'center center';
        this.wrapper.style.pointerEvents = 'none';

        this.canvas = document.createElement('canvas');
        this.canvas.width = 800;
        this.canvas.height = 800;
        this.canvas.style.borderRadius = '4px';
        this.canvas.style.boxShadow = '0 0 50px rgba(0,150,255,0.2)';
        this.canvas.style.pointerEvents = 'none';
        this.ctx = this.canvas.getContext('2d');

        this.wrapper.appendChild(this.canvas);
        this.container.appendChild(this.wrapper);
        document.body.appendChild(this.container);
        window.addEventListener('resize', () => this.resize());
        this.resize();
    }

    resize() {
        if (!this.canvas) return;
        const scale = Math.min(window.innerWidth / 800, window.innerHeight / 800, 1);
        this.wrapper.style.transform = `translate(-50%, -50%) scale(${scale})`;
    }

    start(players, manager) {
        this.ensureCanvas();
        this.manager = manager;
        this.running = true;
        this.radius = 340;
        this.players = [];
        const colors = ['#ff5252', '#448aff', '#69f0ae', '#ffd740'];
        players.forEach((_, idx) => {
            const angle = (Math.PI * 2 / players.length) * idx;
            const dist = 200;
            const color = colors[idx % colors.length];
            const name = manager.getPlayerName?.(idx) || `Player ${idx + 1}`;
            this.players.push({
                x: 400 + Math.cos(angle) * dist,
                y: 400 + Math.sin(angle) * dist,
                vx: 0,
                vy: 0,
                angle,
                color,
                name,
                alive: true
            });
            manager.scores[idx] = 0;
            manager.setBoundaryLimit(null);
        });
    }

    endRound() {
        if (!this.manager) return;
        const aliveIdx = this.players.findIndex(p => p.alive);
        if (aliveIdx !== -1) this.manager.endGame(aliveIdx);
        else this.manager.endGame(null);
        this.running = false;
        this.teardown();
    }

    teardown() {
        if (this.container) {
            this.container.remove();
            this.container = null;
        }
        this.wrapper = null;
        this.canvas = null;
        this.ctx = null;
        this.players = [];
        this.running = false;
    }

    drawBackground() {
        const ctx = this.ctx;
        ctx.fillStyle = '#0d1b2a';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        const cx = 400, cy = 400;
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, this.radius);
        grad.addColorStop(0, '#e0f7fa');
        grad.addColorStop(0.9, '#b2ebf2');
        grad.addColorStop(1, '#4dd0e1');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 5;
        ctx.stroke();
    }

    drawPlayer(p) {
        if (!p.alive) return;
        const ctx = this.ctx;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(0, 0, 20, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.beginPath();
        ctx.arc(-5, -5, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.moveTo(10, 0);
        ctx.lineTo(-5, 8);
        ctx.lineTo(-5, -8);
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();

        ctx.fillStyle = '#caf0f8';
        ctx.font = '14px "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(p.name || 'Player', p.x, p.y + 30);
    }

    update(dt, inputs, _players, _timer, manager) {
        if (!this.running || !this.ctx) return;
        const ACCEL = 250; // per second^2
        const FRICTION = 0.96;
        const SHRINK = 2 * dt;

        // Apply input
        this.players.forEach((p, idx) => {
            if (!p.alive) return;
            const input = inputs[idx] || {};
            const dir = Math.hypot(input.x || 0, input.z || 0);
            if (dir > 0.05) {
                const nx = (input.x || 0) / dir;
                const nz = (input.z || 0) / dir;
                p.vx += nx * ACCEL * dt;
                p.vy += nz * ACCEL * dt;
                p.angle = Math.atan2(nz, nx);
            } else {
                p.angle += 2 * dt; // idle spin
            }
        });

        // Physics
        this.players.forEach(p => {
            if (!p.alive) return;
            p.vx *= FRICTION;
            p.vy *= FRICTION;
            p.x += p.vx * dt;
            p.y += p.vy * dt;

            const dx = p.x - 400;
            const dy = p.y - 400;
            const dist = Math.hypot(dx, dy);
            if (dist > this.radius - 20) {
                p.alive = false;
                manager.eliminatePlayer(this.players.indexOf(p));
            }
        });

        // Collisions
        for (let i = 0; i < this.players.length; i++) {
            for (let j = i + 1; j < this.players.length; j++) {
                const a = this.players[i], b = this.players[j];
                if (!a.alive || !b.alive) continue;
                const dx = b.x - a.x;
                const dy = b.y - a.y;
                const dist = Math.hypot(dx, dy);
                const minDist = 40;
                if (dist < minDist && dist > 0) {
                    const nx = dx / dist;
                    const ny = dy / dist;
                    const overlap = (minDist - dist) / 2;
                    a.x -= nx * overlap;
                    a.y -= ny * overlap;
                    b.x += nx * overlap;
                    b.y += ny * overlap;
                    const bounce = 1.1;
                    const avx = a.vx, avy = a.vy;
                    a.vx = (avx - nx * (avx * nx + avy * ny)) * -bounce;
                    a.vy = (avy - ny * (avx * nx + avy * ny)) * -bounce;
                    b.vx = (b.vx - nx * (b.vx * nx + b.vy * ny)) * bounce;
                    b.vy = (b.vy - ny * (b.vx * nx + b.vy * ny)) * bounce;
                }
            }
        }

        // Shrink arena
        if (this.radius > 80) this.radius = Math.max(80, this.radius - SHRINK);

        // Draw
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.drawBackground();
        this.players.forEach(p => this.drawPlayer(p));

        const aliveCount = this.players.filter(p => p.alive).length;
        if (aliveCount <= 1) {
            this.endRound();
        }
    }
}
