import { initParty, mountControllerUI, setControllerReady, sendControllerInput } from './party.js';

async function init() {
    const role = initParty();
    const params = new URLSearchParams(window.location.search);
    if (role === 'controller' && params.get('controller')) {
        mountControllerUI();
        setupControllerButtons();
        return;
    }
    const { bootstrapGame } = await import('./main.js');
    bootstrapGame();
}

function setupControllerButtons() {
    const readyBtn = document.getElementById('ready-toggle');
    readyBtn?.addEventListener('click', () => {
        const next = readyBtn.classList.toggle('waiting');
        readyBtn.innerText = next ? 'Tap Ready' : 'Ready! Waiting for host…';
        readyBtn.classList.toggle('waiting', next);
        setControllerReady(!next);
    });

    const buttons = document.querySelectorAll('.pad-btn');
    const state = { x: 0, z: 0, action: false };
    const sendState = () => sendControllerInput(state);

    buttons.forEach(btn => {
        const dir = btn.dataset.dir;
        const isAction = btn.dataset.action;
        const updateState = (active) => {
            if (dir === 'up') state.z = active ? -1 : 0;
            if (dir === 'down') state.z = active ? 1 : 0;
            if (dir === 'left') state.x = active ? -1 : 0;
            if (dir === 'right') state.x = active ? 1 : 0;
            if (isAction) state.action = active;
            sendState();
        };
        btn.addEventListener('touchstart', e => { e.preventDefault(); updateState(true); });
        btn.addEventListener('touchend', e => { e.preventDefault(); updateState(false); });
        btn.addEventListener('mousedown', () => updateState(true));
        btn.addEventListener('mouseup', () => updateState(false));
        btn.addEventListener('mouseleave', () => updateState(false));
    });
}

init();
