const urlParams = new URLSearchParams(window.location.search);
const controllerCode = urlParams.get('controller');

let partyCode = controllerCode || '';
let role = controllerCode ? 'controller' : 'idle';
let peer = null;
let connections = [];
let playerSlots = [];
let inputState = {};
let listeners = [];
let startListeners = [];
let readinessListeners = [];
let partyStateListeners = [];
let chooseListeners = [];
let gameMessageListeners = [];
let hostGameMessageListeners = [];
let lastReadyState = false;
let slotResolvers = [];
const availableColors = ['#00ffaa', '#ff00ff', '#ffd166', '#60a5fa', '#ff7f50', '#8ce99a'];
let leaderId = null;
let gameMode = 'RANDOM';
let choiceResolver = null;
let choiceTimeout = null;

function randomCode() {
    return Math.random().toString(36).substring(2, 6).toUpperCase();
}

function notify() {
    listeners.forEach(cb => cb(getPlayers()));
    const readyNow = allReady();
    if (readyNow !== lastReadyState) {
        readinessListeners.forEach(cb => cb(readyNow));
        lastReadyState = readyNow;
    }
}

export function getPartyCode() {
    return partyCode;
}

export function onPartyPlayersChange(cb) {
    listeners.push(cb);
}

export function onControllerStart(cb) {
    startListeners.push(cb);
}

export function onReadyStateChange(cb) {
    readinessListeners.push(cb);
}

export function onPartyStateChange(cb) {
    partyStateListeners.push(cb);
}

export function onChooseGameRequest(cb) {
    chooseListeners.push(cb);
}

export function getPlayers() {
    return playerSlots.slice();
}

export function allReady() {
    const players = getPlayers();
    return players.length >= 2 && players.every(p => p.ready);
}

export function getPartyInputs() {
    const ordered = playerSlots.map(slot => inputState[slot.id] || { x: 0, z: 0, action: false });
    return ordered;
}

function pickColor(requested) {
    const used = new Set(playerSlots.map(p => p.color));
    const palette = availableColors.filter(c => !used.has(c));
    if (requested && palette.includes(requested)) return requested;
    return palette[0] || null;
}

function assignSlot(id, name, preferredColor) {
    const slotIndex = playerSlots.length;
    if (slotIndex >= 4) return null;
    const color = pickColor(preferredColor);
    if (!color) return null;
    const slot = { id, name: name || `Player ${slotIndex + 1}`, ready: false, color, slot: slotIndex, score: 0, leader: false, mode: gameMode };
    if (!leaderId) {
        leaderId = id;
        slot.leader = true;
    }
    playerSlots.push(slot);
    notify();
    broadcastPartyState();
    return slot;
}

function ensureLeader() {
    if (leaderId && playerSlots.some(p => p.id === leaderId)) return;
    leaderId = playerSlots[0]?.id || null;
    playerSlots.forEach((p, idx) => p.leader = leaderId && p.id === leaderId ? true : false);
    broadcastPartyState();
}

function broadcastPartyState() {
    const payload = { type: 'party-state', mode: gameMode, leaderId };
    connections.forEach(c => c.open && c.send(payload));
    partyStateListeners.forEach(cb => cb({ mode: gameMode, leaderId }));
}

export function getPartyMode() {
    return gameMode;
}

export function setPartyMode(mode, requesterId) {
    if (requesterId && requesterId !== leaderId) return;
    const next = mode === 'CHOOSE' ? 'CHOOSE' : 'RANDOM';
    if (next === gameMode) return;
    gameMode = next;
    playerSlots.forEach(p => p.mode = gameMode);
    broadcastPartyState();
    notify();
}

function clearChoiceResolver() {
    if (choiceTimeout) clearTimeout(choiceTimeout);
    choiceTimeout = null;
    choiceResolver = null;
}

export function requestLeaderGameChoice(games) {
    if (gameMode !== 'CHOOSE') return Promise.resolve(null);
    return new Promise((resolve) => {
        const leaderConn = connections.find(c => c.peer === leaderId);
        if (!leaderConn?.open) {
            resolve(null);
            return;
        }
        choiceResolver = resolve;
        choiceTimeout = setTimeout(() => {
            clearChoiceResolver();
            resolve(null);
        }, 15000);
        leaderConn.send({ type: 'choose-game', games });
    });
}

function handleControllerMessage(conn, msg) {
    if (msg.type === 'join') {
        const slot = assignSlot(conn.peer, msg.name, msg.color);
        conn.send({ type: 'slot', slot });
    } else if (msg.type === 'input') {
        inputState[msg.id] = msg.state;
    } else if (msg.type === 'ready') {
        const slot = playerSlots.find(p => p.id === conn.peer);
        if (slot) { slot.ready = msg.ready; notify(); }
    } else if (msg.type === 'set-mode') {
        if (conn.peer === leaderId) setPartyMode(msg.mode, conn.peer);
    } else if (msg.type === 'choose-game-choice') {
        if (conn.peer !== leaderId || !choiceResolver) return;
        const resolver = choiceResolver;
        clearChoiceResolver();
        resolver(msg.game);
    } else if (msg.type === 'game-msg') {
        hostGameMessageListeners.forEach(cb => cb({ from: conn.peer, payload: msg.payload }));
    }
}

function hostPeer() {
    partyCode = urlParams.get('party') || randomCode();
    const url = new URL(window.location.href);
    url.searchParams.set('party', partyCode);
    window.history.replaceState({}, '', url.toString());

    peer = new Peer(`host-${partyCode}`);
    peer.on('connection', conn => {
        connections.push(conn);
        conn.on('data', data => handleControllerMessage(conn, data));
        conn.on('close', () => {
            playerSlots = playerSlots.filter(p => p.id !== conn.peer);
            delete inputState[conn.peer];
            ensureLeader();
            clearChoiceResolver();
            notify();
        });
    });
}

function attachControllerConn(conn, reject) {
    controllerState.conn = conn;
    conn.on('data', data => {
        if (data.type === 'slot' && data.slot) {
            controllerState.slot = data.slot;
            updateControllerHeader();
            slotResolvers.splice(0).forEach(r => r(data.slot));
        }
        if (data.type === 'game-end') {
            notifyControllerOfGameEnd(data.leaderboard);
        }
        if (data.type === 'start') {
            controllerState.started = true;
            controllerState.game = data.game;
            startListeners.forEach(cb => cb({ game: data.game }));
        }
        if (data.type === 'game-msg') {
            gameMessageListeners.forEach(cb => cb(data.payload));
        }
        if (data.type === 'party-state') {
            partyStateListeners.forEach(cb => cb({ mode: data.mode, leaderId: data.leaderId }));
        }
        if (data.type === 'choose-game') {
            chooseListeners.forEach(cb => cb({ games: data.games }));
        }
    });
    conn.on('close', () => reject?.(new Error('Connection closed')));
    conn.on('error', reject);
}

function controllerConnect(code) {
    partyCode = code;
    controllerState.started = false;
    controllerState.ready = false;
    controllerState.slot = null;
    controllerState.game = null;
    controllerState.conn = null;
    updateControllerHeader();
    return new Promise((resolve, reject) => {
        peer = new Peer();
        peer.on('error', reject);
        peer.on('open', () => {
            const conn = peer.connect(`host-${partyCode}`);
            attachControllerConn(conn, reject);
            conn.on('open', () => resolve(conn));
        });
    });
}

async function controllerPeer(code, name) {
    await controllerConnect(code);
    await sendJoinRequest(name);
    return controllerState.conn;
}

export function broadcastStart(gameType) {
    connections.forEach(c => c.open && c.send({ type: 'start', game: gameType }));
    startListeners.forEach(cb => cb({ game: gameType }));
}

function notifyControllerOfGameEnd(leaderboard) {
    controllerState.started = false;
    controllerState.game = null;
    const event = new CustomEvent('controller-game-end', { detail: { leaderboard, selfId: controllerState.slot?.id || controllerState.conn?.peer } });
    window.dispatchEvent(event);
}

export function broadcastGameEnd(winnerSlot) {
    if (typeof winnerSlot === 'number' && playerSlots[winnerSlot]) {
        playerSlots[winnerSlot].score = (playerSlots[winnerSlot].score || 0) + 1;
    }
    playerSlots.forEach(p => p.ready = false);
    notify();
    const leaderboard = playerSlots.map(p => ({
        id: p.id,
        name: p.name,
        score: p.score || 0,
        color: p.color,
        slot: p.slot,
        leader: p.leader
    }));
    connections.forEach(c => c.open && c.send({ type: 'game-end', leaderboard }));
}

export function broadcastGameMessage(payload) {
    if (role !== 'host') return;
    connections.forEach(c => c.open && c.send({ type: 'game-msg', payload }));
}

export function onGameMessage(cb) {
    if (typeof cb === 'function') gameMessageListeners.push(cb);
}

export function onControllerGameMessage(cb) {
    if (typeof cb === 'function') hostGameMessageListeners.push(cb);
}

export function sendControllerGameMessage(payload) {
    if (role !== 'controller') return;
    if (controllerState.conn?.open) {
        controllerState.conn.send({ type: 'game-msg', payload });
    }
}

export function sendPartyModeChange(mode) {
    if (role !== 'controller') return;
    if (controllerState.conn?.open) {
        controllerState.conn.send({ type: 'set-mode', mode });
    }
}

export function sendChosenGame(game) {
    if (role !== 'controller') return;
    if (controllerState.conn?.open) {
        controllerState.conn.send({ type: 'choose-game-choice', game });
    }
}

export function setControllerReady(ready) {
    if (role !== 'controller') return;
    controllerState.ready = ready;
    if (controllerState.conn?.open) {
        controllerState.conn.send({ type: 'ready', ready, id: controllerState.slot?.id });
    }
}

export function sendControllerInput(dirState) {
    if (role !== 'controller') return;
    if (controllerState.conn?.open) {
        controllerState.conn.send({ type: 'input', id: controllerState.slot?.id || controllerState.conn.peer, state: dirState });
    }
}

export function initParty() {
    if (role === 'controller') {
        mountControllerUI();
    }
    return role;
}

export function becomeController() {
    role = 'controller';
    mountControllerUI();
    return role;
}

export function startHosting() {
    role = 'host';
    hostPeer();
    onPartyPlayersChange(syncLobbyUI);
    syncLobbyUI();
    return partyCode;
}

export function joinControllerParty(code, name) {
    if (role !== 'controller') return Promise.reject(new Error('Not a controller'));
    return controllerPeer(code, name);
}

export function connectControllerToParty(code) {
    if (role !== 'controller') return Promise.reject(new Error('Not a controller'));
    return controllerConnect(code);
}

export function sendJoinRequest(name, color) {
    if (role !== 'controller' || !controllerState.conn?.open) {
        return Promise.reject(new Error('Not connected'));
    }
    controllerState.conn.send({ type: 'join', name, color });
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Timed out joining lobby')), 4000);
        slotResolvers.push((slot) => {
            clearTimeout(timeout);
            resolve(slot || controllerState.slot);
        });
    });
}

const controllerState = {
    ready: false,
    started: false,
    conn: null,
    slot: null,
    game: null
};

export function getControllerSlot() {
    return controllerState.slot;
}

function updateControllerHeader() {
    const header = document.getElementById('controller-code');
    if (!header) return;
    const codeLabel = partyCode ? `Party ${partyCode}` : 'Enter lobby code to join';
    const slotLabel = controllerState.slot ? controllerState.slot.name : 'Not joined yet';
    header.innerText = `${codeLabel} • ${slotLabel}`;
}

export function mountControllerUI() {
    const screen = document.getElementById('controller-screen');
    if (!screen) return;
    screen.classList.add('active');
    document.body.classList.add('controller-role');
    if (screen.requestFullscreen) screen.requestFullscreen().catch(()=>{});
    updateControllerHeader();
}

export function syncLobbyUI() {
    const partyPanel = document.getElementById('party-panel');
    const status = document.getElementById('party-status');
    const sidebar = document.getElementById('host-leaderboard-list');
    const resultStatus = document.getElementById('result-ready-status');
    const codeChip = document.getElementById('party-chip');
    const codeChipText = document.getElementById('party-chip-text');
    const modeLabel = document.getElementById('mode-label');
    const modeBlurb = document.getElementById('mode-blurb');
    const leaderName = document.getElementById('leader-name');
    const players = getPlayers();
    if (!partyPanel) return;
    partyPanel.innerHTML = '';
    players.forEach(p => {
        const div = document.createElement('div');
        div.className = `pill ${p.ready ? 'ready' : ''}`;
        const leaderTag = p.leader ? '<span class="leader-chip">★ Leader</span>' : '';
        div.innerHTML = `<span class="dot" style="background:${p.color}"></span>${p.name}${leaderTag}`;
        partyPanel.appendChild(div);
    });

    if (status) {
        const readyCount = players.filter(p => p.ready).length;
        const total = players.length;
        const modeText = gameMode === 'CHOOSE' ? 'Choose next game' : 'Random spin';
        status.innerText = total === 0 ? 'Waiting for phones to join…' : `${readyCount}/${total} ready • ${modeText}`;
    }

    if (codeChipText && partyCode) {
        codeChipText.innerText = `Code: ${partyCode}`;
        codeChip?.classList.add('visible');
    }

    if (modeLabel) modeLabel.innerText = gameMode === 'CHOOSE' ? 'Choose Next' : 'Random';
    if (modeBlurb) modeBlurb.innerText = gameMode === 'CHOOSE' ? 'Party leader picks each round from their controller.' : 'We’ll spin up a random mini game each round.';
    if (leaderName) {
        const leaderPlayer = players.find(p => p.leader);
        leaderName.innerText = leaderPlayer ? `${leaderPlayer.name} is leading` : 'Waiting for a leader…';
    }

    if (sidebar) {
        sidebar.innerHTML = '';
        players.forEach(p => {
            const row = document.createElement('div');
            row.className = 'host-row';
            row.dataset.slot = p.slot;
            row.innerHTML = `
                <div class="host-row-header">
                    <span class="badge" style="background:${p.color}"></span>
                    <span class="name">${p.name} ${p.leader ? '★' : ''}</span>
                    <span class="ready-chip ${p.ready ? 'ready' : 'waiting'}">${p.ready ? 'Ready' : 'Not ready'}</span>
                </div>
                <div class="host-row-meta">
                    <span class="score">Score: ${p.score || 0}</span>
                    <span class="current-stat" data-slot="${p.slot}">Tap ready</span>
                </div>
            `;
            sidebar.appendChild(row);
        });
    }

    if (resultStatus) {
        const readyCount = players.filter(p => p.ready).length;
        const total = players.length;
        resultStatus.innerText = total === 0 ? 'Waiting for players to rejoin…' : `${readyCount}/${total} ready for the next round`;
    }

    if (window.GameManager?.updateHud) {
        window.GameManager.updateHud();
    }
}
