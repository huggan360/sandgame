import { Input } from './input.js';
import {
    scene, camera, renderer, mats, playerMeshes,
    gameObjects, resetPlayers, clearGameObjects, removeObj, flashHit,
    setEnvironment, updateCamera, setPlayerColors, useDefaultModels, setPlayAreaSize
} from './scene.js';
import { allReady, broadcastGameEnd, broadcastStart, getPartyCode, getPlayers, onReadyStateChange, syncLobbyUI } from './party.js';
import { BrawlGame } from './minigames/brawl.js';
import { CollectGame } from './minigames/collect.js';
import { VolcanoGame } from './minigames/volcano.js'; // Import new game
import { ShellSprintGame } from './minigames/shell_sprint.js';
import { CrabDodgeGame } from './minigames/crab_dodge.js';
import { TankBattleGame } from './minigames/tank_battle.js';
import { SkySlamGame } from './minigames/sky_slam.js';

const ui = {
    lobby: document.getElementById('lobby-card'),
    wheel: document.getElementById('wheel-overlay'),
    intro: document.getElementById('intro-card'),
    result: document.getElementById('result-card'),
    wheelElement: document.getElementById('wheel'),
    timer: document.getElementById('game-timer'),
    title: document.getElementById('game-title'),
    desc: document.getElementById('game-desc'),
    penalty: document.getElementById('game-penalty'),
    countdown: document.getElementById('countdown'),
    winnerText: document.getElementById('winner-text'),
    loserTask: document.getElementById('loser-task'),
    leaderboard: document.getElementById('host-leaderboard-list'),
    codeChip: document.getElementById('party-chip'),
    codeChipText: document.getElementById('party-chip-text'),
    resultStatus: document.getElementById('result-ready-status')
};

const minigameOrder = ['BRAWL', 'COLLECT', 'VOLCANO', 'SHELL', 'CRAB', 'TANK', 'SKY'];

const minigames = {
    'BRAWL': new BrawlGame(),
    'COLLECT': new CollectGame(),
    'VOLCANO': new VolcanoGame(),
    'SHELL': new ShellSprintGame(),
    'CRAB': new CrabDodgeGame(),
    'TANK': new TankBattleGame(),
    'SKY': new SkySlamGame()
};

const GameManager = {
    state: 'LOBBY',
    currentGame: null,
    currentMinigame: null,
    scores: [0,0,0,0],
    timer: 0,
    currentRotation: 0,
    boundaryLimit: 8,
    playerCount: 2,
    activeSlots: [0,1],
    aliveSlots: [0,1],
    recentGames: [],

    setBoundaryLimit(limit) {
        this.boundaryLimit = limit;
        setPlayAreaSize(limit);
    },

    getPlayerName(slot) {
        const players = getPlayers();
        return players.find(p => p.slot === slot)?.name || `Player ${slot + 1}`;
    },

    getActiveMeshes() {
        return this.activeSlots.map(idx => playerMeshes[idx]);
    },

    getActiveInputs() {
        return this.activeSlots.map(idx => Input.getAxisForSlot(idx));
    },

    spinWheel() {
        this.state = 'STARTING';
        ui.lobby.classList.remove('active');
        ui.wheel.classList.add('active');
        const chosenGame = this.chooseNextGame();
        const chosenIndex = minigameOrder.indexOf(chosenGame);
        const slice = 360 / minigameOrder.length;
        const randomOffset = Math.random() * slice;
        const targetAngle = chosenIndex * slice + randomOffset;
        const extraSpins = 5 + Math.random() * 2;
        const startRotation = this.currentRotation;
        const finalRotation = startRotation + extraSpins * 360 + targetAngle;
        const duration = 3800;
        const start = performance.now();

        const animateSpin = (now) => {
            const t = Math.min((now - start) / duration, 1);
            const easeOut = 1 - Math.pow(1 - t, 3);
            const angle = startRotation + (finalRotation - startRotation) * easeOut;
            this.currentRotation = angle;
            ui.wheelElement.style.transform = `rotate(-${angle}deg)`;
            if (t < 1) requestAnimationFrame(animateSpin);
            else this.resolveWheel(chosenGame);
        };

        requestAnimationFrame(animateSpin);
    },

    resolveWheel(type) {
        ui.wheel.classList.remove('active');
        this.setupMinigame(type);
    },

    chooseNextGame() {
        const available = minigameOrder.filter(type => !this.recentGames.includes(type));
        const pool = available.length ? available : minigameOrder;
        const type = pool[Math.floor(Math.random() * pool.length)];
        this.recentGames.push(type);
        if (this.recentGames.length > 3) this.recentGames.shift();
        return type;
    },

    setupMinigame(type) {
        this.state = 'INTRO';
        this.currentGame = type;
        this.currentMinigame = minigames[type];
        ui.intro.classList.add('active');
        const info = this.currentMinigame.meta;
        ui.title.innerText = info.title;
        ui.desc.innerText = info.description;
        ui.penalty.innerText = info.penalty;

        const players = getPlayers();
        this.playerCount = Math.max(2, Math.min(4, players.length || 2));
        this.activeSlots = Array.from({ length: this.playerCount }, (_, i) => i);
        this.aliveSlots = [...this.activeSlots];

        const playerColors = this.activeSlots.map(idx => players[idx]?.color);
        setPlayerColors(playerColors);
        useDefaultModels();

        // Handle Scene Switching
        const env = info.environment || (type === 'VOLCANO' ? 'VOLCANO' : 'ISLAND');
        setEnvironment(env);

        resetPlayers(this.playerCount);
        clearGameObjects();
        this.scores = [0,0,0,0];
        this.setBoundaryLimit(8);
        this.updateHud();
        let count = 3;
        ui.countdown.innerText = count;
        const int = setInterval(() => {
            count--;
            if(count <= 0) {
                clearInterval(int);
                ui.countdown.innerText = 'GO!';
                setTimeout(() => this.beginGameplay(), 500);
            } else {
                ui.countdown.innerText = count;
            }
        }, 1000);
    },

    beginGameplay() {
        ui.intro.classList.remove('active');
        ui.timer.style.display = 'block';
        this.state = 'PLAYING';
        this.timer = 0;
        broadcastStart(this.currentGame);
        this.currentMinigame.start(this.getActiveMeshes(), this);
        this.updateHud();
    },

    endGame(winnerSlot) {
        this.state = 'RESULT';
        ui.timer.style.display = 'none';
        let text = '';
        let penalty = '';
        const players = getPlayers();
        if (typeof winnerSlot === 'number') {
            const winnerName = players.find(p => p.slot === winnerSlot)?.name || `Player ${winnerSlot + 1}`;
            text = `${winnerName} WINS!`;
            const losers = this.activeSlots.filter(s => s !== winnerSlot);
            penalty = losers.length === 1 ? this.getPenalty(losers[0]) : 'Everyone else drinks 1 sip';
        } else {
            text = 'DRAW!';
            penalty = 'Everyone drinks 1 sip';
        }
        ui.winnerText.innerText = text;
        ui.loserTask.innerText = penalty;
        if (ui.resultStatus) ui.resultStatus.innerText = 'Waiting for everyone to ready up…';
        ui.result.classList.add('active');
        broadcastGameEnd(winnerSlot);
    },

    getPenalty(loserSlot) {
        const loserName = this.getPlayerName(loserSlot);
        if(this.currentGame === 'BRAWL') return `${loserName} drinks 1 sip`;
        if(this.currentGame === 'VOLCANO') return `${loserName} takes a SHOT (or 3 sips)`;
        if(this.currentGame === 'COLLECT' || this.currentGame === 'SHELL') return `${loserName} drinks diff score`;
        if(this.currentGame === 'CRAB') return `${loserName} drinks 1 sip`;
        if(this.currentGame === 'TANK') return `${loserName} drinks 3 sips`;
        if(this.currentGame === 'SKY') return `${loserName} finishes their drink`;
        return 'Drink up!';
    },

    eliminatePlayer(slot) {
        const idx = this.aliveSlots.indexOf(slot);
        if (idx !== -1) this.aliveSlots.splice(idx, 1);
        const mesh = playerMeshes[slot];
        if (mesh) mesh.visible = false;
        if (this.state === 'PLAYING') {
            if (this.aliveSlots.length === 1) {
                this.endGame(this.aliveSlots[0]);
            } else if (this.aliveSlots.length === 0) {
                this.endGame(null);
            }
            this.updateHud();
        }
    },

    prepareNextRound() {
        ui.result.classList.remove('active');
        ui.lobby.classList.add('active');
        setEnvironment('ISLAND');
        clearGameObjects();
        resetPlayers(this.playerCount);
        this.state = 'LOBBY';
        this.setBoundaryLimit(8);
        this.updateHud();
        this.spinWheel();
    },

    handleAllReady() {
        if (this.state === 'LOBBY' && allReady()) {
            this.spinWheel();
        } else if (this.state === 'RESULT' && allReady()) {
            this.prepareNextRound();
        }
    },

    async returnToLobby() {
        ui.result.classList.remove('active');
        ui.lobby.classList.add('active');
        setEnvironment('ISLAND');
        clearGameObjects();
        resetPlayers(this.playerCount);
        this.state = 'LOBBY';
        this.setBoundaryLimit(8);
        this.updateHud();
        // Reset controller UI for lobby
        const { resetControllerUIForLobby } = await import('./entry.js');
        resetControllerUIForLobby();
    },

    updateHud() {
        const players = getPlayers();
        const statForSlot = (slot) => {
            const player = players.find(p => p.slot === slot);
            if (!player) return 'Waiting for player';
            if (this.state === 'LOBBY') return player.ready ? 'Ready' : 'Not ready';
            if (this.state === 'RESULT') return 'Tap ready for next round';

            if (!this.activeSlots.includes(slot)) return 'Spectating';

            if(this.currentGame === 'COLLECT' || this.currentGame === 'SHELL') {
                const score = this.scores[slot] || 0;
                return `Score: ${score}`;
            } else if(this.currentGame === 'BRAWL' || this.currentGame === 'VOLCANO' || this.currentGame === 'TANK') {
                const hp = playerMeshes[slot]?.hp ?? 0;
                return `HP: ${hp}`;
            }
            return 'On the field';
        };

        players.forEach(p => {
            const statEl = document.querySelector(`.current-stat[data-slot="${p.slot}"]`);
            if (statEl) statEl.innerText = statForSlot(p.slot);
        });
    }
};

function clampPlayers(limit, meshes, manager, dt = 0) {
    meshes.forEach(mesh => {
        const before = mesh.position.clone();
        mesh.position.clamp(new THREE.Vector3(-limit,0,-limit), new THREE.Vector3(limit,1,limit));

        if (manager?.currentGame === 'VOLCANO') {
            const attemptedLava = mesh.position.x !== before.x || mesh.position.z !== before.z;
            mesh.lavaTick = Math.max(0, (mesh.lavaTick || 0) - dt);
            if (attemptedLava && mesh.visible && (mesh.lavaTick || 0) <= 0) {
                mesh.hp = Math.max(0, (mesh.hp ?? 0) - 1);
                mesh.lavaTick = 1; // 1 second cooldown between lava hits
                manager.updateHud();
                if (mesh.hp <= 0) manager.eliminatePlayer(mesh.playerIndex);
            }
        }
    });
}

function playerCollidesWithObstacle(player) {
    for (const obj of gameObjects) {
        if (obj.type === 'obstacle') {
            const dist = Math.hypot(player.position.x - obj.mesh.position.x, player.position.z - obj.mesh.position.z);
            if (dist < 1.4) return true;
        }
    }
    return false;
}

function processObjects(dt, meshes, manager) {
    for (let i = gameObjects.length - 1; i >= 0; i--) {
        const obj = gameObjects[i];

        // --- PROJECTILES (BRAWL) ---
        if (obj.type === 'projectile') {
            obj.mesh.position.add(obj.vel.clone().multiplyScalar(dt));
            let hitCrate = false;
            for(let j=0; j<gameObjects.length; j++) {
                if(gameObjects[j].type === 'obstacle' && obj.mesh.position.distanceTo(gameObjects[j].mesh.position) < 1.5) {
                    hitCrate = true; break;
                }
            }
            let hitPlayer = null;
            meshes.forEach(mesh => {
                if (!hitPlayer && mesh.visible && obj.owner !== mesh.playerIndex && obj.mesh.position.distanceTo(mesh.position) < 1) {
                    hitPlayer = mesh;
                }
            });
            if (hitCrate) {
                removeObj(i);
            } else if(hitPlayer) {
                hitPlayer.hp--; removeObj(i); flashHit(hitPlayer); manager.updateHud();
                if(hitPlayer.hp <= 0) manager.eliminatePlayer(hitPlayer.playerIndex);
            } else if (obj.mesh.position.length() > 20) {
                removeObj(i);
            }
        }
        // --- COCONUTS (SURVIVAL) ---
        else if (obj.type === 'coconut') {
            obj.mesh.position.y -= (10 + manager.timer) * dt;
            if(obj.mesh.position.y < 0) {
                meshes.forEach(mesh => {
                    if (mesh.visible && obj.mesh.position.distanceTo(mesh.position) < 1.5) manager.eliminatePlayer(mesh.playerIndex);
                });
                removeObj(i);
            }
            if(obj.shadow) obj.shadow.scale.setScalar(1 + (10 - obj.mesh.position.y)*0.1);
        }
        // --- MAGMA ROCKS (VOLCANO) ---
        else if (obj.type === 'magma_rock') {
            obj.mesh.position.y -= 15 * dt; // Fall fast
            obj.mesh.rotation.x += dt;
            obj.mesh.rotation.z += dt;

            if(obj.mesh.position.y < 0) {
                meshes.forEach(mesh => {
                    if(obj.mesh.position.distanceTo(mesh.position) < 1.5 && (!mesh.stunned || mesh.stunned <= 0)) {
                        mesh.hp--; mesh.stunned = 1.5; // Stun for 1.5s
                        flashHit(mesh); manager.updateHud();
                        if(mesh.hp <= 0) manager.eliminatePlayer(mesh.playerIndex);
                    }
                });
                removeObj(i);
            }
            if(obj.shadow) obj.shadow.scale.setScalar(0.5 + (15 - obj.mesh.position.y)*0.1);
        }
        // --- PINEAPPLES (COLLECT) ---
        else if (obj.type === 'pineapple') {
            obj.mesh.rotation.y += dt * 2;
            meshes.forEach(mesh => {
                if (mesh.visible && obj.mesh.position.distanceTo(mesh.position) < 1) {
                    manager.scores[mesh.playerIndex] = (manager.scores[mesh.playerIndex] || 0) + obj.value;
                    removeObj(i); checkCollectionWin(manager);
                }
            });
        }
        // --- CRABS (CRAB DODGE) ---
        else if (obj.type === 'crab') {
            obj.t += dt;
            obj.mesh.position.add(obj.vel.clone().multiplyScalar(dt));
            obj.mesh.position.z += Math.sin(obj.t * 4) * dt * 1.5;
            obj.mesh.rotation.z += dt * 4 * Math.sign(obj.vel.x);
            if (Math.abs(obj.mesh.position.x) > 14) { removeObj(i); continue; }

            if (manager.currentGame === 'CRAB') {
                meshes.forEach(mesh => {
                    if (mesh.visible && obj.mesh.position.distanceTo(mesh.position) < 1) { manager.eliminatePlayer(mesh.playerIndex); }
                });
                if (!manager.aliveSlots.some(slot => playerMeshes[slot].visible)) removeObj(i);
            }
        }
    }
}

function checkCollectionWin(manager) {
    manager.updateHud();
    for (const slot of manager.activeSlots) {
        if ((manager.scores[slot] || 0) >= 5) {
            manager.endGame(slot);
            break;
        }
    }
}

let lastTime = 0;
function animate(time) {
    requestAnimationFrame(animate);
    const dt = (time - lastTime) / 1000;
    lastTime = time;
    const activeMeshes = GameManager.getActiveMeshes();
    const inputs = GameManager.getActiveInputs();
    const speed = 8 * dt;
    const useCustomMovement = GameManager.state === 'PLAYING' && GameManager.currentMinigame && typeof GameManager.currentMinigame.handleMovement === 'function';

    if (GameManager.state === 'LOBBY' || GameManager.state === 'PLAYING') {
        activeMeshes.forEach((mesh, idx) => {
            const input = inputs[idx];
            if (input && (input.x !== 0 || input.z !== 0)) {
                mesh.aimDir = new THREE.Vector3(input.x, 0, input.z).normalize();
            }
        });
        if (!useCustomMovement) {
            activeMeshes.forEach((mesh, idx) => {
                const input = inputs[idx];
                if (!input) return;
                if ((!mesh.stunned || mesh.stunned <= 0) && (input.x !== 0 || input.z !== 0)) {
                    const oldPos = mesh.position.clone();
                    mesh.position.x += input.x * speed;
                    mesh.position.z += input.z * speed;
                    mesh.lookAt(mesh.position.x + input.x, mesh.position.y, mesh.position.z + input.z);
                    if (GameManager.currentGame === 'BRAWL' && playerCollidesWithObstacle(mesh)) {
                        mesh.position.copy(oldPos);
                    }
                }
            });
        } else if (GameManager.state === 'PLAYING') {
            GameManager.currentMinigame.handleMovement(dt, inputs, activeMeshes, GameManager);
        }

        if (GameManager.state === 'PLAYING' && GameManager.boundaryLimit !== null && (!useCustomMovement || GameManager.currentMinigame.allowClampAfterMovement)) {
            clampPlayers(GameManager.boundaryLimit ?? 8, activeMeshes, GameManager, dt);
        }
    }

    if (GameManager.state === 'PLAYING') {
        GameManager.timer += dt;
        ui.timer.innerText = Math.max(0, Math.floor(30 - GameManager.timer)).toString();
        // Time limit ends game (Player with most HP wins in Volcano/Brawl/Tank)
        if(GameManager.timer >= 30 && GameManager.currentGame !== 'COLLECT' && GameManager.currentGame !== 'SHELL') {
            if(GameManager.currentGame === 'BRAWL' || GameManager.currentGame === 'VOLCANO' || GameManager.currentGame === 'TANK') {
                let bestSlot = null; let bestHp = -Infinity; let tie = false;
                GameManager.activeSlots.forEach(slot => {
                    const hp = playerMeshes[slot]?.hp ?? 0;
                    if (hp > bestHp) { bestHp = hp; bestSlot = slot; tie = false; }
                    else if (hp === bestHp) { tie = true; }
                });
                if (!tie && bestSlot !== null) GameManager.endGame(bestSlot);
                else GameManager.endGame(null);
            } else {
                GameManager.endGame(null);
            }
        }
        GameManager.currentMinigame.update(dt, inputs, activeMeshes, GameManager.timer, GameManager);
        processObjects(dt, activeMeshes, GameManager);
    }

    updateCamera(GameManager.state);
    renderer.render(scene, camera);
}

export function bootstrapGame() {
    window.GameManager = GameManager;
    const partyCodeLabel = document.getElementById('party-code');
    const code = getPartyCode();
    if (partyCodeLabel) {
        partyCodeLabel.innerText = `Party code: ${code}`;
    }
    if (ui.codeChipText) {
        ui.codeChipText.innerText = `Code: ${code}`;
        ui.codeChip?.classList.add('visible');
    }
    syncLobbyUI();
    onReadyStateChange((isReady) => {
        GameManager.updateHud();
        if (isReady) {
            GameManager.handleAllReady();
        }
    });
    if (allReady()) {
        GameManager.handleAllReady();
    }
    setEnvironment('ISLAND');
    resetPlayers(GameManager.playerCount);
    animate(0);
}
