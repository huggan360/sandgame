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
let lastReadyState = false;
let slotResolvers = [];

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

function assignSlot(id, name) {
    const colors = ['#00ffaa', '#ff00ff', '#ffd166', '#60a5fa'];
    const slotIndex = playerSlots.length;
    if (slotIndex >= 4) return null;
    const slot = { id, name: name || `Player ${slotIndex + 1}`, ready: false, color: colors[slotIndex], slot: slotIndex };
    playerSlots.push(slot);
    notify();
    return slot;
}

function handleControllerMessage(conn, msg) {
    if (msg.type === 'join') {
        const slot = assignSlot(conn.peer, msg.name);
        conn.send({ type: 'slot', slot });
    } else if (msg.type === 'input') {
        inputState[msg.id] = msg.state;
    } else if (msg.type === 'ready') {
        const slot = playerSlots.find(p => p.id === conn.peer);
        if (slot) { slot.ready = msg.ready; notify(); }
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
            slotResolvers.splice(0).forEach(r => r());
        }
        if (data.type === 'start') {
            controllerState.started = true;
            startListeners.forEach(cb => cb());
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

export function broadcastStart() {
    connections.forEach(c => c.open && c.send({ type: 'start' }));
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

export function sendJoinRequest(name) {
    if (role !== 'controller' || !controllerState.conn?.open) {
        return Promise.reject(new Error('Not connected'));
    }
    controllerState.conn.send({ type: 'join', name });
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Timed out joining lobby')), 4000);
        slotResolvers.push(() => {
            clearTimeout(timeout);
            resolve(controllerState.slot);
        });
    });
}

const controllerState = {
    ready: false,
    started: false,
    conn: null,
    slot: null
};

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
    const partyCodeLabel = document.getElementById('party-code');
    const status = document.getElementById('party-status');
    if (!partyPanel) return;
    partyPanel.innerHTML = '';
    getPlayers().forEach(p => {
        const div = document.createElement('div');
        div.className = `pill ${p.ready ? 'ready' : ''}`;
        div.innerHTML = `<span class="dot" style="background:${p.color}"></span>${p.name}`;
        partyPanel.appendChild(div);
    });
    if (partyCodeLabel) {
        partyCodeLabel.innerText = `Party code: ${partyCode}`;
    }
    if (status) {
        const readyCount = getPlayers().filter(p => p.ready).length;
        const total = getPlayers().length;
        status.innerText = total === 0 ? 'Waiting for phones to join…' : `${readyCount}/${total} ready • need 2+ to start`;
    }
}
