import { becomeController, connectControllerToParty, initParty, mountControllerUI, onControllerStart, sendJoinRequest, setControllerReady, sendControllerInput, startHosting } from './party.js';

async function init() {
    const role = initParty();
    const params = new URLSearchParams(window.location.search);
    if (role === 'controller' && params.get('controller')) {
        document.getElementById('landing')?.classList.add('hidden');
        mountControllerUI();
        setupControllerButtons(params.get('controller'));
        return;
    }
    setupLanding();
}

function setupControllerButtons(prefillCode) {
    const codeForm = document.getElementById('controller-code-form');
    const codeInput = document.getElementById('controller-code-input');
    const nameForm = document.getElementById('controller-name-form');
    const nameInput = document.getElementById('controller-name-input');
    const joinCard = document.getElementById('controller-join');
    const controls = document.getElementById('controller-controls');
    const pad = document.getElementById('controller-pad');
    const joystick = document.getElementById('joystick');
    const thumb = document.getElementById('joystick-thumb');
    const fireBtn = document.getElementById('fire-btn');
    const statusLine = document.getElementById('controller-status-text');
    const codeStep = document.getElementById('code-step');
    const nameStep = document.getElementById('name-step');
    if (codeInput && prefillCode) codeInput.value = prefillCode.toUpperCase();

    const readyBtn = document.getElementById('ready-toggle');
    let connected = false;

    codeForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const code = codeInput?.value.trim().toUpperCase();
        if (!code) {
            statusLine.textContent = 'Enter the code shown in the lobby.';
            return;
        }
        statusLine.textContent = 'Connecting to lobby…';
        try {
            await connectControllerToParty(code);
            statusLine.textContent = 'Connected! Now choose a nickname to join.';
            codeStep?.classList.add('hidden');
            nameStep?.classList.remove('hidden');
        } catch (err) {
            console.error(err);
            statusLine.textContent = 'Could not join. Double check the code and try again.';
        }
    });

    nameForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = nameInput?.value.trim() || `Phone ${Math.floor(Math.random()*90+10)}`;
        statusLine.textContent = 'Joining lobby…';
        try {
            await sendJoinRequest(name);
            connected = true;
            if (readyBtn) readyBtn.disabled = false;
            statusLine.textContent = `Joined as ${name}. Tap ready while waiting for host.`;
            if (joinCard) joinCard.style.display = 'none';
            if (controls) controls.style.display = 'block';
        } catch (err) {
            console.error(err);
            statusLine.textContent = 'Could not join. Try a different nickname?';
        }
    });

    readyBtn?.addEventListener('click', () => {
        if (!connected) return;
        const next = readyBtn.classList.toggle('waiting');
        readyBtn.innerText = next ? 'Tap Ready' : 'Ready! Waiting for host…';
        readyBtn.classList.toggle('waiting', next);
        setControllerReady(!next);
    });

    const state = { x: 0, z: 0, action: false };
    const sendState = () => sendControllerInput(state);

    const resetThumb = () => {
        if (!thumb) return;
        thumb.style.transform = 'translate(-50%, -50%)';
        state.x = 0;
        state.z = 0;
        sendState();
    };

    const updateFromPointer = (clientX, clientY) => {
        if (!joystick || !thumb) return;
        const rect = joystick.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = clientX - cx;
        const dy = clientY - cy;
        const maxRadius = rect.width / 2 - 30;
        const dist = Math.min(Math.hypot(dx, dy), maxRadius);
        const angle = Math.atan2(dy, dx);
        const offsetX = Math.cos(angle) * dist;
        const offsetY = Math.sin(angle) * dist;
        thumb.style.transform = `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px))`;
        state.x = Math.max(-1, Math.min(1, offsetX / maxRadius));
        state.z = Math.max(-1, Math.min(1, -offsetY / maxRadius));
        sendState();
    };

    let dragging = false;
    joystick?.addEventListener('pointerdown', (e) => {
        dragging = true;
        joystick.setPointerCapture?.(e.pointerId);
        updateFromPointer(e.clientX, e.clientY);
    });
    joystick?.addEventListener('pointermove', (e) => {
        if (!dragging) return;
        e.preventDefault();
        updateFromPointer(e.clientX, e.clientY);
    });
    const endDrag = (e) => {
        if (!dragging) return;
        dragging = false;
        joystick?.releasePointerCapture?.(e.pointerId);
        resetThumb();
    };
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(evt => {
        joystick?.addEventListener(evt, endDrag);
    });

    const setAction = (active) => {
        state.action = active;
        sendState();
    };

    fireBtn?.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        setAction(true);
    });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(evt => {
        fireBtn?.addEventListener(evt, () => setAction(false));
    });

    onControllerStart(() => {
        const screen = document.getElementById('controller-screen');
        if (screen) screen.classList.add('started');
        if (pad) pad.style.display = 'flex';
        if (statusLine) statusLine.textContent = 'Game started! Use the controller to play.';
    });
}

function setupLanding() {
    const landing = document.getElementById('landing');
    const hostBtn = document.getElementById('host-btn');
    const joinBtn = document.getElementById('join-btn');
    const lobbyCard = document.getElementById('lobby-card');

    hostBtn?.addEventListener('click', async () => {
        landing?.classList.add('hidden');
        startHosting();
        const { bootstrapGame } = await import('./main.js');
        bootstrapGame();
        lobbyCard?.classList.add('active');
    });

    joinBtn?.addEventListener('click', () => {
        landing?.classList.add('hidden');
        becomeController();
        mountControllerUI();
        setupControllerButtons();
    });
}

init();
