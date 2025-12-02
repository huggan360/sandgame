// 2D Caribbean Flap adapted for controller inputs
export class FlappyFlockGame {
    constructor() {
        this.meta = {
            title: 'Caribbean Flap',
            description: 'Tap to flap your tropical bird through bamboo pipes. Highest score or last flyer wins.',
            penalty: '2 Sips',
            environment: 'ISLAND',
            duration: null,
            titleStyle: 'font-size:3.5rem; margin-bottom:0.5rem; color:#ffca28; text-shadow:3px 3px 0 #d84315; font-family:\"Comic Sans MS\",\"Chalkboard SE\",sans-serif; letter-spacing:2px;'
        };
        this.canvas = null;
        this.ctx = null;
        this.scoreDisplay = null;
        this.container = null;
        this.wrapper = null;
        this.birds = [];
        this.pipes = [];
        this.clouds = [];
        this.frames = 0;
        this.running = false;
        this.pipeTimer = 0;
        this.manager = null;
    }

    ensureCanvas() {
        if (this.canvas) return;
        this.container = document.createElement('div');
        this.container.id = 'flappy-container';
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
        this.wrapper.style.height = '600px';
        this.wrapper.style.transformOrigin = 'center center';
        this.wrapper.style.pointerEvents = 'none';

        this.canvas = document.createElement('canvas');
        this.canvas.width = 800;
        this.canvas.height = 600;
        this.canvas.style.background = 'linear-gradient(135deg, #f6d365 0%, #fda085 100%)';
        this.canvas.style.border = '8px solid #fff';
        this.canvas.style.borderRadius = '8px';
        this.canvas.style.boxShadow = '0 10px 30px rgba(0,0,0,0.3)';
        this.canvas.style.pointerEvents = 'none';
        this.ctx = this.canvas.getContext('2d');

        this.scoreDisplay = document.createElement('div');
        this.scoreDisplay.style.position = 'absolute';
        this.scoreDisplay.style.top = '20px';
        this.scoreDisplay.style.left = '50%';
        this.scoreDisplay.style.transform = 'translateX(-50%)';
        this.scoreDisplay.style.fontSize = '4rem';
        this.scoreDisplay.style.fontWeight = '900';
        this.scoreDisplay.style.color = '#fff';
        this.scoreDisplay.style.textShadow = '3px 3px 0px rgba(0,0,0,0.3)';
        this.scoreDisplay.style.fontFamily = "'Comic Sans MS', 'Segoe UI', sans-serif";
        this.scoreDisplay.style.pointerEvents = 'none';
        this.scoreDisplay.innerText = '0';

        this.wrapper.appendChild(this.canvas);
        this.wrapper.appendChild(this.scoreDisplay);
        this.container.appendChild(this.wrapper);
        document.body.appendChild(this.container);
        window.addEventListener('resize', () => this.resize());
        this.resize();
    }

    resize() {
        if (!this.canvas) return;
        const scale = Math.min(window.innerWidth / 800, window.innerHeight / 600, 1);
        this.wrapper.style.transform = `translate(-50%, -50%) scale(${scale})`;
    }

    start(players, manager) {
        this.ensureCanvas();
        this.manager = manager;
        this.running = true;
        this.frames = 0;
        this.pipeTimer = 0;
        this.pipes = [];
        this.clouds = [];
        this.birds = [];
        const colors = ['#ff5252', '#40c4ff', '#00e676', '#ffea00'];

        players.forEach((_, idx) => {
            const color = colors[idx % colors.length];
            const name = manager.getPlayerName?.(idx) || `Player ${idx + 1}`;
            this.birds.push({
                x: 80 + idx * 40,
                y: 200,
                w: 34,
                h: 28,
                vel: 0,
                color,
                name,
                alive: true,
                score: 0
            });
            manager.scores[idx] = 0;
        });
        // clouds
        for (let i = 0; i < 5; i++) {
            this.clouds.push({
                x: Math.random() * 800,
                y: Math.random() * 200,
                speed: Math.random() * 0.5 + 0.1
            });
        }
        if (this.scoreDisplay) this.scoreDisplay.innerText = '0';
    }

    endRound() {
        if (!this.manager) return;
        let bestSlot = null;
        let bestScore = -Infinity;
        let tie = false;
        this.birds.forEach((b, idx) => {
            const s = this.manager.scores[idx] || 0;
            if (s > bestScore) { bestScore = s; bestSlot = idx; tie = false; }
            else if (s === bestScore) tie = true;
        });
        if (tie) {
            this.manager.endGame(null);
        } else {
            this.manager.endGame(bestSlot);
        }
        this.running = false;
        this.teardown();
    }

    flap(idx) {
        const bird = this.birds[idx];
        if (bird && bird.alive) bird.vel = -5;
    }

    drawBackground() {
        const { ctx } = this;
        const gradient = ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        gradient.addColorStop(0, '#29b6f6');
        gradient.addColorStop(1, '#b3e5fc');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Sun
        ctx.save();
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#ffeb3b';
        ctx.fillStyle = '#ffeb3b';
        ctx.beginPath();
        ctx.arc(this.canvas.width - 80, 80, 40, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Clouds
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        this.clouds.forEach(cloud => {
            ctx.beginPath();
            ctx.arc(cloud.x, cloud.y, 30, 0, Math.PI * 2);
            ctx.arc(cloud.x + 25, cloud.y - 10, 40, 0, Math.PI * 2);
            ctx.arc(cloud.x + 50, cloud.y, 30, 0, Math.PI * 2);
            ctx.fill();
            cloud.x -= cloud.speed;
            if (cloud.x < -100) cloud.x = this.canvas.width + 100;
        });

        // Islands
        ctx.fillStyle = '#4db6ac';
        ctx.beginPath();
        ctx.ellipse(150, this.canvas.height - 40, 100, 40, 0, Math.PI, 0);
        ctx.fill();
        ctx.fillStyle = '#26a69a';
        ctx.beginPath();
        ctx.ellipse(600, this.canvas.height - 40, 180, 60, 0, Math.PI, 0);
        ctx.fill();
        this.drawPalm(600, this.canvas.height - 100);

        // Ocean
        ctx.fillStyle = '#0288d1';
        ctx.fillRect(0, this.canvas.height - 50, this.canvas.width, 50);
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.fillRect(0, this.canvas.height - 45, this.canvas.width, 5);
    }

    drawPalm(x, y) {
        const { ctx } = this;
        ctx.fillStyle = '#004d40';
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + 10, y - 40, x + 20, y - 80);
        ctx.lineTo(x + 15, y - 80);
        ctx.quadraticCurveTo(x + 5, y - 40, x - 5, y);
        ctx.fill();
        ctx.strokeStyle = '#004d40';
        ctx.lineWidth = 4;
        const cx = x + 18, cy = y - 80;
        for (let i = 0; i < 5; i++) {
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.quadraticCurveTo(cx - 30 + (i * 15), cy - 30, cx - 40 + (i * 20), cy + 10);
            ctx.stroke();
        }
    }

    spawnPipe() {
        const topHeight = Math.random() * (this.canvas.height - 150 - 150) + 80;
        const bottomY = topHeight + 150;
        this.pipes.push({
            x: this.canvas.width,
            w: 65,
            topHeight,
            bottomY,
            passed: false
        });
    }

    drawPipe(p) {
        const ctx = this.ctx;
        const bambooColor = '#dce775';
        const bambooShadow = '#afb42b';
        const outline = '#33691e';
        ctx.lineWidth = 2;
        ctx.strokeStyle = outline;
        // top
        ctx.fillStyle = bambooColor;
        ctx.fillRect(p.x, 0, p.w, p.topHeight);
        this.drawSegments(p.x, 0, p.w, p.topHeight, true);
        ctx.strokeRect(p.x, 0, p.w, p.topHeight);
        ctx.fillStyle = bambooShadow;
        ctx.fillRect(p.x - 4, p.topHeight - 20, p.w + 8, 20);
        ctx.strokeRect(p.x - 4, p.topHeight - 20, p.w + 8, 20);
        // bottom
        ctx.fillStyle = bambooColor;
        ctx.fillRect(p.x, p.bottomY, p.w, this.canvas.height - p.bottomY);
        this.drawSegments(p.x, p.bottomY, p.w, this.canvas.height - p.bottomY, false);
        ctx.strokeRect(p.x, p.bottomY, p.w, this.canvas.height - p.bottomY);
        ctx.fillStyle = bambooShadow;
        ctx.fillRect(p.x - 4, p.bottomY, p.w + 8, 20);
        ctx.strokeRect(p.x - 4, p.bottomY, p.w + 8, 20);
    }

    drawSegments(x, y, w, h, isTop) {
        const ctx = this.ctx;
        ctx.fillStyle = 'rgba(51,105,30,0.1)';
        const seg = 60;
        const start = isTop ? y : y + 20;
        const end = isTop ? y + h - 20 : y + h;
        ctx.strokeStyle = '#827717';
        for (let i = start; i < end; i += seg) {
            ctx.beginPath();
            ctx.moveTo(x, i);
            ctx.lineTo(x + w, i);
            ctx.stroke();
            ctx.fillRect(x, i, w, 5);
        }
        ctx.strokeStyle = '#33691e';
    }

    drawBird(bird, idx) {
        const ctx = this.ctx;
        ctx.save();
        ctx.translate(bird.x + bird.w / 2, bird.y + bird.h / 2);
        const rot = bird.alive ? Math.min(Math.PI / 4, Math.max(-Math.PI / 4, bird.vel * 0.1)) : Math.PI / 2;
        ctx.rotate(rot);
        ctx.fillStyle = bird.alive ? bird.color : '#607d8b';
        ctx.beginPath();
        ctx.roundRect(-bird.w / 2, -bird.h / 2, bird.w, bird.h, 5);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.beginPath();
        ctx.ellipse(-5, 2, 8, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(bird.w / 2 - 8, -6, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.arc(bird.w / 2 - 6, -6, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ff9800';
        ctx.beginPath();
        ctx.moveTo(bird.w / 2 - 2, -2);
        ctx.lineTo(bird.w / 2 + 8, 2);
        ctx.lineTo(bird.w / 2 - 2, 8);
        ctx.fill();
        ctx.fillStyle = '#3e2723';
        ctx.beginPath();
        ctx.moveTo(bird.w / 2 + 4, 0);
        ctx.lineTo(bird.w / 2 + 8, 2);
        ctx.lineTo(bird.w / 2 + 4, 4);
        ctx.fill();
        ctx.restore();

        // nickname
        ctx.fillStyle = '#fff';
        ctx.font = '14px "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(bird.name || `P${idx + 1}`, bird.x + bird.w / 2, bird.y + bird.h + 18);
    }

    update(dt, inputs, _players, _timer, manager) {
        if (!this.running || !this.ctx) return;
        const GRAVITY = 0.25;
        const PIPE_SPEED = 2.5;
        const timeUp = false; // No timer for flappy; ends by elimination

        // Spawn pipes
        this.pipeTimer -= dt;
        if (this.pipeTimer <= 0) {
            this.spawnPipe();
            this.pipeTimer = 2.2;
        }

        // Handle input flaps
        this.birds.forEach((_, idx) => {
            const input = inputs[idx] || {};
            if (input.action) {
                this.flap(idx);
            }
        });

        // Update birds
        this.birds.forEach((b, idx) => {
            if (!b.alive) {
                if (b.x > -50) b.x -= PIPE_SPEED;
                return;
            }
            b.vel += GRAVITY;
            b.y += b.vel;
            if (b.y + b.h >= this.canvas.height - 30) {
                b.y = this.canvas.height - 30 - b.h;
                b.alive = false;
                manager.eliminatePlayer(idx);
            }
            if (b.y < 0) {
                b.y = 0;
                b.vel = 0;
            }
        });

        // Update pipes and collisions
        for (let i = 0; i < this.pipes.length; i++) {
            const p = this.pipes[i];
            p.x -= PIPE_SPEED;
            if (p.x + p.w < 0) {
                this.pipes.splice(i, 1);
                i--;
                continue;
            }
            this.birds.forEach((b, idx) => {
                if (!b.alive) return;
                const within = b.x + b.w > p.x && b.x < p.x + p.w;
                if (within && (b.y + 4 < p.topHeight || b.y + b.h - 4 > p.bottomY)) {
                    b.alive = false;
                    manager.eliminatePlayer(idx);
                }
                if (!p.passed && p.x + p.w < b.x) {
                    p.passed = true;
                    b.score += 1;
                    manager.scores[idx] = b.score;
                    manager.updateHud();
                    if (this.scoreDisplay) {
                        const maxScore = Math.max(...this.birds.map(bb => bb.score));
                        this.scoreDisplay.innerText = String(maxScore);
                    }
                }
            });
        }

        // Draw
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.drawBackground();
        this.pipes.forEach(p => this.drawPipe(p));
        // ground
        const sandPattern = this.ctx.createLinearGradient(0, this.canvas.height - 30, 0, this.canvas.height);
        sandPattern.addColorStop(0, '#fff176');
        sandPattern.addColorStop(1, '#fbc02d');
        this.ctx.fillStyle = sandPattern;
        this.ctx.fillRect(0, this.canvas.height - 30, this.canvas.width, 30);
        this.ctx.fillStyle = '#f9a825';
        this.ctx.fillRect(0, this.canvas.height - 30, this.canvas.width, 2);

        this.birds.forEach((b, idx) => this.drawBird(b, idx));

        // End conditions
        const aliveCount = this.birds.filter(b => b.alive).length;
        if (aliveCount === 0 || timeUp) {
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
        this.birds = [];
        this.pipes = [];
        this.clouds = [];
        this.running = false;
    }
}
