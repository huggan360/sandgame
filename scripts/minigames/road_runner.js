// 2D Desert Dash adapted for controller inputs
export class RoadRunnerGame {
    constructor() {
        this.meta = {
            title: 'Desert Dash',
            description: 'Tap to jump and dodge cacti, rocks, and TNT. Last runner standing wins.',
            penalty: '2 Sips',
            environment: 'ISLAND',
            duration: null,
            titleStyle: 'font-size:3.5rem; color:#ff6d00; text-shadow:4px 4px 0 #bf360c; font-family:\"Arial Black\", sans-serif; font-style:italic; letter-spacing:-2px; text-transform:uppercase;'
        };
        this.canvas = null;
        this.ctx = null;
        this.container = null;
        this.wrapper = null;
        this.scoreDisplay = null;
        this.runners = [];
        this.obstacles = [];
        this.mesas = [];
        this.frames = 0;
        this.score = 0;
        this.speed = 6;
        this.running = false;
        this.manager = null;
        this.GROUND_Y = 390; // relative to 450 height
    }

    ensureCanvas() {
        if (this.canvas) return;
        this.container = document.createElement('div');
        this.container.id = 'runner-container';
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
        this.wrapper.style.height = '450px';
        this.wrapper.style.transformOrigin = 'center center';
        this.wrapper.style.pointerEvents = 'none';

        this.canvas = document.createElement('canvas');
        this.canvas.width = 800;
        this.canvas.height = 450;
        this.canvas.style.background = '#87CEEB';
        this.canvas.style.border = '8px solid #333';
        this.canvas.style.borderRadius = '8px';
        this.canvas.style.boxShadow = '0 10px 30px rgba(0,0,0,0.5)';
        this.canvas.style.pointerEvents = 'none';
        this.ctx = this.canvas.getContext('2d');

        this.scoreDisplay = document.createElement('div');
        this.scoreDisplay.style.position = 'absolute';
        this.scoreDisplay.style.top = '20px';
        this.scoreDisplay.style.right = '30px';
        this.scoreDisplay.style.fontSize = '3rem';
        this.scoreDisplay.style.fontWeight = '900';
        this.scoreDisplay.style.color = '#fff';
        this.scoreDisplay.style.textShadow = '2px 2px 0 #000';
        this.scoreDisplay.style.fontFamily = 'monospace';
        this.scoreDisplay.style.pointerEvents = 'none';
        this.scoreDisplay.innerText = '00000';

        this.wrapper.appendChild(this.canvas);
        this.wrapper.appendChild(this.scoreDisplay);
        this.container.appendChild(this.wrapper);
        document.body.appendChild(this.container);
        window.addEventListener('resize', () => this.resize());
        this.resize();
    }

    resize() {
        if (!this.canvas) return;
        const scale = Math.min(window.innerWidth / 800, window.innerHeight / 450, 1);
        this.wrapper.style.transform = `translate(-50%, -50%) scale(${scale})`;
        this.wrapper.style.margin = '0';
    }

    start(players, manager) {
        this.ensureCanvas();
        this.manager = manager;
        this.running = true;
        this.frames = 0;
        this.score = 0;
        this.speed = 6;
        this.runners = [];
        this.obstacles = [];
        this.mesas = [];
        const colors = ['#ff5252', '#448aff', '#69f0ae', '#ffd740'];

        players.forEach((_, idx) => {
            const color = colors[idx % colors.length];
            const name = manager.getPlayerName?.(idx) || `Player ${idx + 1}`;
            this.runners.push({
                x: 50 + idx * 60,
                y: this.GROUND_Y,
                w: 30,
                h: 40,
                dy: 0,
                color,
                name,
                alive: true,
                grounded: true,
                legFrame: 0
            });
            manager.scores[idx] = 0;
            manager.setBoundaryLimit(null);
        });

        for (let i = 0; i < 5; i++) {
            this.mesas.push({
                x: Math.random() * this.canvas.width,
                w: 100 + Math.random() * 200,
                h: 100 + Math.random() * 150,
                color: i % 2 === 0 ? '#d84315' : '#e64a19'
            });
        }
        if (this.scoreDisplay) this.scoreDisplay.innerText = '00000';
    }

    endRound() {
        if (!this.manager) return;
        let lastAlive = this.runners.findIndex(r => r.alive);
        if (lastAlive !== -1) {
            this.manager.endGame(lastAlive);
        } else {
            // fallback by score
            let bestSlot = null;
            let bestScore = -Infinity;
            let tie = false;
            this.runners.forEach((r, idx) => {
                const s = this.manager.scores[idx] || 0;
                if (s > bestScore) { bestScore = s; bestSlot = idx; tie = false; }
                else if (s === bestScore) tie = true;
            });
            if (tie) this.manager.endGame(null);
            else this.manager.endGame(bestSlot);
        }
        this.running = false;
        this.teardown();
    }

    jump(idx) {
        const r = this.runners[idx];
        if (r && r.grounded && r.alive) {
            r.dy = -12;
            r.grounded = false;
        }
    }

    spawnObstacle() {
        const typeRoll = Math.random();
        let type = 'cactus';
        if (typeRoll > 0.6 && typeRoll < 0.9) type = 'rock';
        else if (typeRoll >= 0.9) type = 'tnt';
        let w = 20, h = 50 + Math.random() * 30, color = '#2e7d32';
        if (type === 'rock') { w = 50; h = 30; color = '#795548'; }
        if (type === 'tnt') { w = 40; h = 40; color = '#d32f2f'; }
        this.obstacles.push({ x: this.canvas.width, y: this.GROUND_Y, w, h, color, type, passed: false });
    }

    drawBackground() {
        const ctx = this.ctx;
        ctx.fillStyle = '#87CEEB';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        ctx.fillStyle = '#fff176';
        ctx.beginPath();
        ctx.arc(this.canvas.width - 50, 50, 40, 0, Math.PI * 2);
        ctx.fill();
        this.mesas.forEach(mesa => {
            ctx.fillStyle = mesa.color;
            ctx.fillRect(mesa.x, this.GROUND_Y - mesa.h, mesa.w, mesa.h);
            mesa.x -= this.speed * 0.1;
            if (mesa.x + mesa.w < 0) {
                mesa.x = this.canvas.width + Math.random() * 200;
                mesa.h = 100 + Math.random() * 150;
            }
        });
        ctx.fillStyle = '#ffcc80';
        ctx.fillRect(0, this.GROUND_Y, this.canvas.width, this.canvas.height - this.GROUND_Y);
        ctx.fillStyle = '#5d4037';
        ctx.fillRect(0, this.GROUND_Y - 10, this.canvas.width, 50);
        ctx.fillStyle = '#fff';
        const lineOffset = (this.frames * this.speed) % 100;
        for (let i = -1; i < this.canvas.width / 100 + 1; i++) {
            ctx.fillRect((i * 100) - lineOffset, this.GROUND_Y + 12, 60, 6);
        }
    }

    drawRunner(r) {
        const ctx = this.ctx;
        if (!r.alive) return;
        ctx.save();
        ctx.translate(r.x, r.y);
        // shadow
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        const jumpHeight = this.GROUND_Y - r.y;
        const shadowScale = Math.max(0.5, 1 - (jumpHeight / 150));
        ctx.beginPath();
        ctx.ellipse(r.w / 2, 0, 15 * shadowScale, 6 * shadowScale, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        ctx.save();
        ctx.translate(r.x, r.y);
        ctx.fillStyle = r.color;
        ctx.beginPath();
        ctx.ellipse(r.w / 2, -r.h / 2, 20, 15, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(r.w - 5, -r.h / 2 - 5);
        ctx.lineTo(r.w + 10, -r.h - 5);
        ctx.lineTo(r.w + 25, -r.h - 5);
        ctx.lineTo(r.w + 10, -r.h + 5);
        ctx.lineTo(r.w + 5, -r.h / 2 + 5);
        ctx.fill();
        ctx.fillStyle = '#303f9f';
        ctx.beginPath();
        ctx.moveTo(r.w + 8, -r.h - 5);
        ctx.lineTo(r.w + 2, -r.h - 20);
        ctx.lineTo(r.w + 15, -r.h - 5);
        ctx.fill();
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(r.w + 12, -r.h - 2, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.arc(r.w + 14, -r.h - 2, 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = r.color;
        ctx.beginPath();
        ctx.moveTo(0, -r.h / 2);
        ctx.lineTo(-15, -r.h / 2 - 10);
        ctx.lineTo(-10, -r.h / 2 + 5);
        ctx.fill();
        ctx.strokeStyle = '#ff9800';
        ctx.lineWidth = 3;
        if (r.grounded) {
            r.legFrame += 0.5;
            ctx.beginPath();
            ctx.arc(r.w / 2, 0, 10, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 152, 0, 0.3)';
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(r.w / 2, -5);
            ctx.lineTo(r.w / 2 + Math.sin(r.legFrame) * 10, 10);
            ctx.moveTo(r.w / 2, -5);
            ctx.lineTo(r.w / 2 - Math.sin(r.legFrame) * 10, 10);
            ctx.stroke();
        } else {
            ctx.beginPath();
            ctx.moveTo(r.w / 2, -5);
            ctx.lineTo(r.w / 2 + 10, 5);
            ctx.moveTo(r.w / 2, -5);
            ctx.lineTo(r.w / 2 - 5, 8);
            ctx.stroke();
        }
        ctx.restore();

        // Nameplate
        ctx.fillStyle = '#fff';
        ctx.font = '14px "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(r.name || 'Runner', r.x + r.w / 2, r.y + r.h + 18);
    }

    drawObstacle(ob) {
        const ctx = this.ctx;
        ctx.save();
        ctx.translate(ob.x, ob.y);
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.beginPath();
        ctx.ellipse(ob.w / 2, 0, ob.w / 2 + 5, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        if (ob.type === 'cactus') {
            ctx.fillStyle = ob.color;
            ctx.fillRect(0, -ob.h, ob.w, ob.h);
            ctx.fillRect(-10, -ob.h + 20, 10, 10);
            ctx.fillRect(-10, -ob.h + 10, 10, 20);
            ctx.fillStyle = '#fff';
            ctx.fillRect(2, -ob.h + 5, 2, 2);
            ctx.fillRect(15, -ob.h + 25, 2, 2);
        } else if (ob.type === 'rock') {
            ctx.fillStyle = ob.color;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(10, -ob.h);
            ctx.lineTo(ob.w - 10, -ob.h + 5);
            ctx.lineTo(ob.w, 0);
            ctx.fill();
            ctx.fillStyle = 'rgba(0,0,0,0.2)';
            ctx.beginPath();
            ctx.moveTo(5, 0);
            ctx.lineTo(10, -ob.h);
            ctx.lineTo(15, 0);
            ctx.fill();
        } else {
            ctx.fillStyle = ob.color;
            ctx.fillRect(0, -ob.h, ob.w, ob.h);
            ctx.fillStyle = '#fff';
            ctx.fillRect(5, -ob.h + 5, ob.w - 10, 5);
            ctx.fillRect(5, -ob.h + 20, ob.w - 10, 5);
            ctx.fillStyle = 'yellow';
            ctx.font = '10px sans-serif';
            ctx.fillText('TNT', 10, -15);
            ctx.strokeStyle = '#fff';
            ctx.beginPath();
            ctx.moveTo(ob.w / 2, -ob.h);
            ctx.quadraticCurveTo(ob.w / 2 + 5, -ob.h - 10, ob.w / 2 + 10, -ob.h - 5);
            ctx.stroke();
        }
        ctx.restore();
    }

    update(dt, inputs, _players, _timer, manager) {
        if (!this.running || !this.ctx) return;
        this.frames++;

        // Speed ramp
        if (this.frames % 600 === 0 && this.speed < 15) {
            this.speed += 0.5;
        }

        // Inputs (jump on action)
        this.runners.forEach((_, idx) => {
            const input = inputs[idx] || {};
            if (input.action) {
                this.jump(idx);
            }
        });

        // Spawn obstacles
        if (this.frames % 100 === 0 || (this.frames > 100 && Math.random() < 0.02 && this.obstacles.length && this.canvas.width - this.obstacles[this.obstacles.length - 1].x > 250)) {
            if (this.obstacles.length === 0 || this.canvas.width - this.obstacles[this.obstacles.length - 1].x > 250) {
                this.spawnObstacle();
            }
        }

        // Update obstacles
        for (let i = 0; i < this.obstacles.length; i++) {
            const ob = this.obstacles[i];
            ob.x -= this.speed;
            if (ob.x + ob.w < 0) {
                this.obstacles.splice(i, 1);
                i--;
                continue;
            }
        }

        // Update runners and collisions
        this.runners.forEach((r, idx) => {
            if (!r.alive) return;
            r.dy += 0.6;
            r.y += r.dy;
            if (r.y >= this.GROUND_Y) {
                r.y = this.GROUND_Y;
                r.dy = 0;
                r.grounded = true;
            } else {
                r.grounded = false;
            }

            for (const ob of this.obstacles) {
                if (ob.x < r.x + r.w - 10 && ob.x + ob.w > r.x + 10) {
                    if (r.y + r.h - 10 > ob.y - ob.h) {
                        r.alive = false;
                        manager.eliminatePlayer(idx);
                    }
                }
            }
        });

        // Score by distance/time for alive runners
        this.score += Math.floor(this.speed / 2);
        this.runners.forEach((r, idx) => {
            if (r.alive) {
                manager.scores[idx] = this.score;
            }
        });
        if (this.scoreDisplay) this.scoreDisplay.innerText = String(this.score).padStart(5, '0');
        manager.updateHud();

        // Draw scene
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.drawBackground();
        this.obstacles.forEach(ob => this.drawObstacle(ob));
        this.runners.forEach(r => this.drawRunner(r));

        // End condition
        const aliveCount = this.runners.filter(r => r.alive).length;
        if (aliveCount === 0) {
            this.endRound();
        }
    }

    teardown() {
        if (this.container) {
            this.container.remove();
            this.container = null;
        }
        this.canvas = null;
        this.wrapper = null;
        this.ctx = null;
        this.scoreDisplay = null;
        this.runners = [];
        this.obstacles = [];
        this.mesas = [];
        this.running = false;
    }
}
