import { Input } from './input.js';
import {
    scene, camera, renderer, mats, p1Mesh, p2Mesh,
    gameObjects, resetPlayers, clearGameObjects, removeObj, flashHit,
    setEnvironment, updateCamera
} from './scene.js';
import { allReady, broadcastGameEnd, broadcastStart, getPartyCode, onReadyStateChange, syncLobbyUI } from './party.js';
import { BrawlGame } from './minigames/brawl.js';
import { SurvivalGame } from './minigames/survival.js';
import { CollectGame } from './minigames/collect.js';
import { VolcanoGame } from './minigames/volcano.js'; // Import new game
import { ShellSprintGame } from './minigames/shell_sprint.js';
import { CrabDodgeGame } from './minigames/crab_dodge.js';
import { GeyserGauntletGame } from './minigames/geyser_gauntlet.js';
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
    p1Hud: document.querySelector('.p1-hud'),
    p2Hud: document.querySelector('.p2-hud')
};

const minigameOrder = ['BRAWL', 'SURVIVAL', 'COLLECT', 'VOLCANO', 'SHELL', 'CRAB', 'GEYSER', 'SKY'];

const minigames = {
    'BRAWL': new BrawlGame(),
    'SURVIVAL': new SurvivalGame(),
    'COLLECT': new CollectGame(),
    'VOLCANO': new VolcanoGame(),
    'SHELL': new ShellSprintGame(),
    'CRAB': new CrabDodgeGame(),
    'GEYSER': new GeyserGauntletGame(),
    'SKY': new SkySlamGame()
};

const GameManager = {
    state: 'LOBBY',
    currentGame: null,
    currentMinigame: null,
    p1Score: 0,
    p2Score: 0,
    timer: 0,
    currentRotation: 0,
    boundaryLimit: 8,

    spinWheel() {
        this.state = 'STARTING';
        broadcastStart();
        ui.lobby.classList.remove('active');
        ui.wheel.classList.add('active');
        const slice = 360 / minigameOrder.length;
        const randomSlice = Math.floor(Math.random() * minigameOrder.length);
        const randomOffset = Math.random() * slice;
        const targetAngle = randomSlice * slice + randomOffset;
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
            else this.resolveWheel(angle % 360);
        };

        requestAnimationFrame(animateSpin);
    },

    resolveWheel(finalAngle) {
        const slice = 360 / minigameOrder.length;
        const index = Math.floor(finalAngle / slice) % minigameOrder.length;
        const type = minigameOrder[index];
        
        ui.wheel.classList.remove('active');
        this.setupMinigame(type);
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

        // Handle Scene Switching
        const env = info.environment || (type === 'VOLCANO' ? 'VOLCANO' : 'ISLAND');
        setEnvironment(env);

        resetPlayers();
        clearGameObjects();
        p1Mesh.position.set(-5, 0.1, 0);
        p2Mesh.position.set(5, 0.1, 0);
        this.p1Score = 0;
        this.p2Score = 0;
        this.boundaryLimit = 8;
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
        this.currentMinigame.start(p1Mesh, p2Mesh, this);
        this.updateHud();
    },

    endGame(winner) {
        this.state = 'RESULT';
        ui.timer.style.display = 'none';
        let text = '';
        let penalty = '';
        if(winner === 1) {
            text = 'PLAYER 1 WINS!';
            penalty = this.getPenalty(2);
        } else if (winner === 2) {
            text = 'PLAYER 2 WINS!';
            penalty = this.getPenalty(1);
        } else {
            text = 'DRAW!';
            penalty = 'Everyone drinks 1 sip';
        }
        ui.winnerText.innerText = text;
        ui.loserTask.innerText = penalty;
        ui.result.classList.add('active');
        const winnerSlot = winner === 1 ? 0 : winner === 2 ? 1 : null;
        broadcastGameEnd(winnerSlot);
    },

    getPenalty(loser) {
        if(this.currentGame === 'BRAWL') return `Player ${loser} drinks 1 sip`;
        if(this.currentGame === 'SURVIVAL') return `Player ${loser} drinks 2 sips`;
        if(this.currentGame === 'VOLCANO') return `Player ${loser} takes a SHOT (or 3 sips)`;
        if(this.currentGame === 'COLLECT' || this.currentGame === 'SHELL') return `Player ${loser} drinks diff score`;
        if(this.currentGame === 'CRAB') return `Player ${loser} drinks 1 sip`;
        if(this.currentGame === 'GEYSER') return `Player ${loser} drinks 3 sips`;
        if(this.currentGame === 'SKY') return `Player ${loser} finishes their drink`;
        return 'Drink up!';
    },

    async returnToLobby() {
        ui.result.classList.remove('active');
        ui.lobby.classList.add('active');
        setEnvironment('ISLAND');
        clearGameObjects();
        resetPlayers();
        this.state = 'LOBBY';
        this.boundaryLimit = 8;
        this.updateHud();
        // Reset controller UI for lobby
        const { resetControllerUIForLobby } = await import('./entry.js');
        resetControllerUIForLobby();
    },

    updateHud() {
        if(this.currentGame === 'COLLECT' || this.currentGame === 'SHELL') {
            ui.p1Hud.innerText = `P1 Score: ${this.p1Score}`;
            ui.p2Hud.innerText = `P2 Score: ${this.p2Score}`;
        } else if(this.currentGame === 'BRAWL' || this.currentGame === 'VOLCANO' || this.currentGame === 'GEYSER') {
            ui.p1Hud.innerText = `P1 HP: ${p1Mesh.hp || 0}`;
            ui.p2Hud.innerText = `P2 HP: ${p2Mesh.hp || 0}`;
        } else {
            ui.p1Hud.innerText = 'P1 (Green)';
            ui.p2Hud.innerText = 'P2 (Pink)';
        }
    }
};

function clampPlayers(limit) {
    p1Mesh.position.clamp(new THREE.Vector3(-limit,0,-limit), new THREE.Vector3(limit,1,limit));
    p2Mesh.position.clamp(new THREE.Vector3(-limit,0,-limit), new THREE.Vector3(limit,1,limit));
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

function processObjects(dt) {
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
            const distP1 = obj.mesh.position.distanceTo(p1Mesh.position);
            const distP2 = obj.mesh.position.distanceTo(p2Mesh.position);
            if (hitCrate) {
                removeObj(i);
            } else if(obj.owner !== 1 && distP1 < 1) {
                p1Mesh.hp--; removeObj(i); flashHit(p1Mesh); GameManager.updateHud();
                if(p1Mesh.hp <= 0) GameManager.endGame(2);
            } else if(obj.owner !== 2 && distP2 < 1) {
                p2Mesh.hp--; removeObj(i); flashHit(p2Mesh); GameManager.updateHud();
                if(p2Mesh.hp <= 0) GameManager.endGame(1);
            } else if (obj.mesh.position.length() > 20) {
                removeObj(i);
            }
        }
        // --- COCONUTS (SURVIVAL) ---
        else if (obj.type === 'coconut') {
            obj.mesh.position.y -= (10 + GameManager.timer) * dt;
            if(obj.mesh.position.y < 0) {
                const distP1 = obj.mesh.position.distanceTo(p1Mesh.position);
                const distP2 = obj.mesh.position.distanceTo(p2Mesh.position);
                if(distP1 < 1.5) GameManager.endGame(2);
                else if(distP2 < 1.5) GameManager.endGame(1);
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
                const distP1 = obj.mesh.position.distanceTo(p1Mesh.position);
                const distP2 = obj.mesh.position.distanceTo(p2Mesh.position);
                
                // Hit Logic
                if(distP1 < 1.5 && p1Mesh.stunned <= 0) {
                    p1Mesh.hp--; p1Mesh.stunned = 1.5; // Stun for 1.5s
                    flashHit(p1Mesh); GameManager.updateHud();
                    if(p1Mesh.hp <= 0) GameManager.endGame(2);
                }
                if(distP2 < 1.5 && p2Mesh.stunned <= 0) {
                    p2Mesh.hp--; p2Mesh.stunned = 1.5; 
                    flashHit(p2Mesh); GameManager.updateHud();
                    if(p2Mesh.hp <= 0) GameManager.endGame(1);
                }
                removeObj(i);
            }
            if(obj.shadow) obj.shadow.scale.setScalar(0.5 + (15 - obj.mesh.position.y)*0.1);
        }
        // --- PINEAPPLES (COLLECT) ---
        else if (obj.type === 'pineapple') {
            obj.mesh.rotation.y += dt * 2;
            const distP1 = obj.mesh.position.distanceTo(p1Mesh.position);
            const distP2 = obj.mesh.position.distanceTo(p2Mesh.position);
            if(distP1 < 1) {
                GameManager.p1Score += obj.value; removeObj(i); checkCollectionWin();
            } else if (distP2 < 1) {
                GameManager.p2Score += obj.value; removeObj(i); checkCollectionWin();
            }
        }
        // --- CRABS (CRAB DODGE) ---
        else if (obj.type === 'crab') {
            obj.t += dt;
            obj.mesh.position.add(obj.vel.clone().multiplyScalar(dt));
            obj.mesh.position.z += Math.sin(obj.t * 4) * dt * 1.5;
            obj.mesh.rotation.z += dt * 4 * Math.sign(obj.vel.x);
            if (Math.abs(obj.mesh.position.x) > 14) { removeObj(i); continue; }

            if (GameManager.currentGame === 'CRAB') {
                const distP1 = obj.mesh.position.distanceTo(p1Mesh.position);
                const distP2 = obj.mesh.position.distanceTo(p2Mesh.position);
                if (distP1 < 1) { GameManager.endGame(2); removeObj(i); }
                else if (distP2 < 1) { GameManager.endGame(1); removeObj(i); }
            }
        }
    }
}

function checkCollectionWin() {
    GameManager.updateHud();
    if(GameManager.p1Score >= 5) GameManager.endGame(1);
    else if(GameManager.p2Score >= 5) GameManager.endGame(2);
}

let lastTime = 0;
function animate(time) {
    requestAnimationFrame(animate);
    const dt = (time - lastTime) / 1000;
    lastTime = time;
    const p1In = Input.getAxisForSlot(0);
    const p2In = Input.getAxisForSlot(1);
    const speed = 8 * dt;
    const useCustomMovement = GameManager.state === 'PLAYING' && GameManager.currentMinigame && typeof GameManager.currentMinigame.handleMovement === 'function';

    if (GameManager.state === 'LOBBY' || GameManager.state === 'PLAYING') {
        if (p1In.x !== 0 || p1In.z !== 0) {
            p1Mesh.aimDir = new THREE.Vector3(p1In.x, 0, p1In.z).normalize();
        }
        if (p2In.x !== 0 || p2In.z !== 0) {
            p2Mesh.aimDir = new THREE.Vector3(p2In.x, 0, p2In.z).normalize();
        }
        if (!useCustomMovement) {
            // Player 1 Movement (Blocked if stunned)
            if ((!p1Mesh.stunned || p1Mesh.stunned <= 0) && (p1In.x !== 0 || p1In.z !== 0)) {
                const oldPos = p1Mesh.position.clone();
                p1Mesh.position.x += p1In.x * speed;
                p1Mesh.position.z += p1In.z * speed;
                p1Mesh.lookAt(p1Mesh.position.x + p1In.x, p1Mesh.position.y, p1Mesh.position.z + p1In.z);
                if (GameManager.currentGame === 'BRAWL' && playerCollidesWithObstacle(p1Mesh)) {
                    p1Mesh.position.copy(oldPos);
                }
            }
            // Player 2 Movement (Blocked if stunned)
            if ((!p2Mesh.stunned || p2Mesh.stunned <= 0) && (p2In.x !== 0 || p2In.z !== 0)) {
                const oldPos = p2Mesh.position.clone();
                p2Mesh.position.x += p2In.x * speed;
                p2Mesh.position.z += p2In.z * speed;
                p2Mesh.lookAt(p2Mesh.position.x + p2In.x, p2Mesh.position.y, p2Mesh.position.z + p2In.z);
                if (GameManager.currentGame === 'BRAWL' && playerCollidesWithObstacle(p2Mesh)) {
                    p2Mesh.position.copy(oldPos);
                }
            }
        } else if (GameManager.state === 'PLAYING') {
            GameManager.currentMinigame.handleMovement(dt, { p1: p1In, p2: p2In }, p1Mesh, p2Mesh);
        }

        if (GameManager.state === 'PLAYING' && GameManager.boundaryLimit !== null && (!useCustomMovement || GameManager.currentMinigame.allowClampAfterMovement)) {
            clampPlayers(GameManager.boundaryLimit ?? 8);
        }
    }

    if (GameManager.state === 'PLAYING') {
        GameManager.timer += dt;
        ui.timer.innerText = Math.max(0, Math.floor(30 - GameManager.timer)).toString();
        // Time limit ends game (Player with most HP wins in Volcano/Brawl)
        if(GameManager.timer >= 30 && GameManager.currentGame !== 'COLLECT' && GameManager.currentGame !== 'SHELL') {
            if(GameManager.currentGame === 'BRAWL' || GameManager.currentGame === 'VOLCANO' || GameManager.currentGame === 'GEYSER') {
                if(p1Mesh.hp > p2Mesh.hp) GameManager.endGame(1);
                else if(p2Mesh.hp > p1Mesh.hp) GameManager.endGame(2);
                else GameManager.endGame(0);
            } else {
                GameManager.endGame(0);
            }
        }
        GameManager.currentMinigame.update(dt, { p1: p1In, p2: p2In }, p1Mesh, p2Mesh, GameManager.timer, GameManager);
        processObjects(dt);
    }

    updateCamera(GameManager.state);
    renderer.render(scene, camera);
}

export function bootstrapGame() {
    window.GameManager = GameManager;
    const partyCodeLabel = document.getElementById('party-code');
    if (partyCodeLabel) {
        partyCodeLabel.innerText = `Party code: ${getPartyCode()}`;
    }
    syncLobbyUI();
    onReadyStateChange((isReady) => {
        if (isReady && GameManager.state === 'LOBBY') {
            GameManager.spinWheel();
        }
    });
    if (allReady() && GameManager.state === 'LOBBY') {
        GameManager.spinWheel();
    }
    setEnvironment('ISLAND');
    resetPlayers();
    animate(0);
}