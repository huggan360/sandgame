import { Input } from './input.js';
import {
    scene, camera, renderer, mats, p1Mesh, p2Mesh,
    gameObjects, resetPlayers, clearGameObjects, removeObj, flashHit,
    setArenaVisible, updateCamera
} from './scene.js';
import { BrawlGame } from './minigames/brawl.js';
import { SurvivalGame } from './minigames/survival.js';
import { CollectGame } from './minigames/collect.js';

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

const minigames = {
    'BRAWL': new BrawlGame(),
    'SURVIVAL': new SurvivalGame(),
    'COLLECT': new CollectGame()
};

const GameManager = {
    state: 'LOBBY',
    currentGame: null,
    currentMinigame: null,
    p1Score: 0,
    p2Score: 0,
    timer: 0,
    currentRotation: 0,

    spinWheel() {
        ui.lobby.classList.remove('active');
        ui.wheel.classList.add('active');
        const extraSpins = 5;
        const randomAngle = Math.floor(Math.random() * 360);
        const totalDegree = (360 * extraSpins) + randomAngle;
        this.currentRotation += totalDegree;
        ui.wheelElement.style.transform = `rotate(-${this.currentRotation}deg)`;
        setTimeout(() => {
            this.resolveWheel(this.currentRotation % 360);
        }, 3100);
    },

    resolveWheel(finalAngle) {
        let type = '';
        if (finalAngle < 120) type = 'BRAWL';
        else if (finalAngle < 240) type = 'SURVIVAL';
        else type = 'COLLECT';
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
        setArenaVisible(true);
        resetPlayers();
        clearGameObjects();
        p1Mesh.position.set(-5, 0.1, 0);
        p2Mesh.position.set(5, 0.1, 0);
        this.p1Score = 0;
        this.p2Score = 0;
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
        this.currentMinigame.start(p1Mesh, p2Mesh);
    },

    endGame(winner) {
        this.state = 'RESULT';
        ui.timer.style.display = 'none';
        let text = '';
        let penalty = '';
        if(winner === 1) {
            text = 'PLAYER 1 WINS!';
            if(this.currentGame === 'BRAWL') penalty = 'Player 2 drinks 1 sip';
            else if(this.currentGame === 'SURVIVAL') penalty = 'Player 2 drinks 2 sips';
            else if(this.currentGame === 'COLLECT') penalty = `Player 2 drinks ${Math.max(1, 5 - this.p2Score)} sips`;
        } else if (winner === 2) {
            text = 'PLAYER 2 WINS!';
            if(this.currentGame === 'BRAWL') penalty = 'Player 1 drinks 1 sip';
            else if(this.currentGame === 'SURVIVAL') penalty = 'Player 1 drinks 2 sips';
            else if(this.currentGame === 'COLLECT') penalty = `Player 1 drinks ${Math.max(1, 5 - this.p1Score)} sips`;
        } else {
            text = 'DRAW!';
            penalty = 'Everyone drinks 1 sip';
        }
        ui.winnerText.innerText = text;
        ui.loserTask.innerText = penalty;
        ui.result.classList.add('active');
    },

    returnToLobby() {
        ui.result.classList.remove('active');
        ui.lobby.classList.add('active');
        setArenaVisible(false);
        clearGameObjects();
        resetPlayers();
        this.state = 'LOBBY';
        this.updateHud();
    },

    updateHud() {
        if(this.currentGame === 'COLLECT') {
            ui.p1Hud.innerText = `P1 (Green) Score: ${this.p1Score}`;
            ui.p2Hud.innerText = `P2 (Pink) Score: ${this.p2Score}`;
        } else if(this.currentGame === 'BRAWL') {
            ui.p1Hud.innerText = `P1 (Green) HP: ${p1Mesh.hp || 3}`;
            ui.p2Hud.innerText = `P2 (Pink) HP: ${p2Mesh.hp || 3}`;
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

function processObjects(dt) {
    for (let i = gameObjects.length - 1; i >= 0; i--) {
        const obj = gameObjects[i];
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
    const p1In = Input.getP1Axis();
    const p2In = Input.getP2Axis();
    const speed = 8 * dt;

    if (GameManager.state === 'LOBBY' || GameManager.state === 'PLAYING') {
        if (p1In.x !== 0 || p1In.z !== 0) {
            p1Mesh.position.x += p1In.x * speed;
            p1Mesh.position.z += p1In.z * speed;
            p1Mesh.lookAt(p1Mesh.position.x + p1In.x, p1Mesh.position.y, p1Mesh.position.z + p1In.z);
        }
        if (p2In.x !== 0 || p2In.z !== 0) {
            p2Mesh.position.x += p2In.x * speed;
            p2Mesh.position.z += p2In.z * speed;
            p2Mesh.lookAt(p2Mesh.position.x + p2In.x, p2Mesh.position.y, p2Mesh.position.z + p2In.z);
        }
        if (GameManager.state === 'PLAYING') clampPlayers(8);
    }

    if (GameManager.state === 'PLAYING') {
        GameManager.timer += dt;
        ui.timer.innerText = Math.max(0, Math.floor(30 - GameManager.timer)).toString();
        if(GameManager.timer >= 30 && GameManager.currentGame !== 'COLLECT') {
            GameManager.endGame(0);
        }
        GameManager.currentMinigame.update(dt, { p1: p1In, p2: p2In }, p1Mesh, p2Mesh, GameManager.timer);
        processObjects(dt);
    }

    updateCamera(GameManager.state);
    renderer.render(scene, camera);
}

window.GameManager = GameManager;
resetPlayers();
animate(0);
