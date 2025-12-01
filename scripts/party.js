const urlParams = new URLSearchParams(window.location.search);
const controllerCode = urlParams.get('controller');

let partyCode = '';
let role = controllerCode ? 'controller' : 'host';
let peer = null;
let connections = [];
let playerSlots = [];
let inputState = {};
let listeners = [];

function randomCode() {
    return Math.random().toString(36).substring(2, 6).toUpperCase();
}

function notify() {
    listeners.forEach(cb => cb(getPlayers()));
}

export function getPartyCode() {
    return partyCode;
}

export function onPartyPlayersChange(cb) {
    listeners.push(cb);
}

export function getPlayers() {
    return playerSlots.slice();
}

export function allReady() {
    const players = getPlayers();
    return players.length > 0 && players.every(p => p.ready);
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

function controllerPeer() {
    partyCode = controllerCode;
    peer = new Peer();
    const conn = peer.connect(`host-${partyCode}`);
    conn.on('open', () => {
        conn.send({ type: 'join', name: `Phone ${Math.floor(Math.random()*90+10)}` });
    });
    conn.on('data', data => {
        if (data.type === 'slot' && data.slot) {
            controllerState.slot = data.slot;
            updateControllerHeader();
        }
        if (data.type === 'start') {
            controllerState.started = true;
        }
    });
    controllerState.conn = conn;
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
    if (role === 'host') {
        hostPeer();
    } else {
        controllerPeer();
    }
    return role;
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
    const slotLabel = controllerState.slot ? controllerState.slot.name : 'Waiting for seat…';
    header.innerText = `Party ${partyCode} • ${slotLabel}`;
}

export function mountControllerUI() {
    const screen = document.getElementById('controller-screen');
    if (!screen) return;
    screen.classList.add('active');
    if (screen.requestFullscreen) screen.requestFullscreen().catch(()=>{});
    updateControllerHeader();
}

export function syncLobbyUI() {
    const partyPanel = document.getElementById('party-panel');
    const partyLink = document.getElementById('party-link');
    const startBtn = document.getElementById('start-btn');
    const status = document.getElementById('party-status');
    if (!partyPanel) return;
    partyPanel.innerHTML = '';
    getPlayers().forEach(p => {
        const div = document.createElement('div');
        div.className = `pill ${p.ready ? 'ready' : ''}`;
        div.innerHTML = `<span class="dot" style="background:${p.color}"></span>${p.name}`;
        partyPanel.appendChild(div);
    });
    const joinUrl = new URL(window.location.href);
    joinUrl.searchParams.set('controller', partyCode);
    partyLink.innerText = `Share this link: ${joinUrl.toString()}`;
    if (status) {
        const readyCount = getPlayers().filter(p => p.ready).length;
        const total = getPlayers().length;
        status.innerText = total === 0 ? 'Waiting for phones to join…' : `${readyCount}/${total} ready to play`;
    }
    if (startBtn) startBtn.disabled = !allReady();
}

if (role === 'host') {
    onPartyPlayersChange(syncLobbyUI);
}
