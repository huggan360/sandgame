import { becomeController, connectControllerToParty, getControllerSlot, initParty, mountControllerUI, onControllerStart, sendJoinRequest, setControllerReady, sendControllerInput, startHosting } from './party.js';

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
    const statusCard = document.getElementById('controller-status');
    const screen = document.getElementById('controller-screen');
    const leaderboardCard = document.getElementById('controller-leaderboard');
    const leaderboardList = document.getElementById('leaderboard-list');
    const fpv = document.getElementById('controller-fpv');
    const fpvReticle = document.getElementById('fpv-reticle');
    const fpvReload = document.getElementById('fpv-reload');
    const fpvBadge = document.getElementById('fpv-badge');
    const fpvPlayerName = document.getElementById('fpv-player-name');
    const layoutTitle = document.getElementById('controller-layout-title');
    const layoutHelp = document.getElementById('controller-layout-help');
    const controllerLayouts = {
        DEFAULT: { title: 'Standard Controls', help: 'Use the joystick to move. Action appears when a game needs it.', actionLabel: 'Action', showAction: true, crosshair: false },
        BRAWL: { title: 'Brawl', help: 'Move to line up a punch. Tap to swing when in range.', actionLabel: 'Punch', showAction: true, crosshair: false },
        SURVIVAL: { title: 'Survival', help: 'No attacks here — weave to dodge falling coconuts.', actionLabel: 'Action', showAction: false, crosshair: false },
        COLLECT: { title: 'Pineapple Rush', help: 'Sprint between pineapples and drop-offs. Tap to grab or drop.', actionLabel: 'Grab/Drop', showAction: true, crosshair: false },
        VOLCANO: { title: 'Magma Madness', help: 'Keep moving to avoid eruptions. No action button needed.', actionLabel: 'Action', showAction: false, crosshair: false },
        SHELL: { title: 'Shell Sprint', help: 'Aim for shells. Boost when the time is right.', actionLabel: 'Boost', showAction: true, crosshair: false },
        CRAB: { title: 'Crab Dodge', help: 'Slide around the crabs — movement only.', actionLabel: 'Action', showAction: false, crosshair: false },
        TANK: { title: 'Tank Takedown', help: 'Aim your turret with the stick. Fire when the reticle is on target.', actionLabel: 'Fire Cannon', showAction: true, crosshair: true },
        SKY: { title: 'Sky Rink', help: 'Skate fast and body check foes off the edge.', actionLabel: 'Body Check', showAction: true, crosshair: false },
        SHOOTING: { title: 'Shooter', help: 'Aim carefully and fire from your own perspective.', actionLabel: 'Shoot', showAction: true, crosshair: true }
    };
    if (codeInput && prefillCode) codeInput.value = prefillCode.toUpperCase();

    const readyBtn = document.getElementById('ready-toggle');
    let connected = false;

    const setReadyWaiting = () => {
        if (!readyBtn) return;
        readyBtn.classList.add('waiting');
        readyBtn.classList.remove('ready');
        readyBtn.innerText = 'Tap Ready';
        readyBtn.disabled = false;
    };

    const refreshFpvIdentity = () => {
        const slot = getControllerSlot();
        const color = slot?.color || '#31ffb0';
        if (fpv) fpv.style.setProperty('--fpv-color', color);
        if (fpvBadge) fpvBadge.style.background = color;
        if (fpvPlayerName) {
            const label = slot?.name || 'Your character';
            fpvPlayerName.textContent = `${label}'s view`;
        }
    };

    const renderLeaderboard = (entries, selfId) => {
        if (!leaderboardList) return;
        leaderboardList.innerHTML = '';
        entries.forEach(entry => {
            const row = document.createElement('div');
            row.className = 'leaderboard-row';
            if (entry.id && entry.id === selfId) row.classList.add('mine');
            const nameSpan = document.createElement('span');
            nameSpan.className = 'name';
            const badge = document.createElement('span');
            badge.className = 'badge';
            badge.style.background = entry.color || '#fff';
            nameSpan.appendChild(badge);
            nameSpan.appendChild(document.createTextNode(entry.name || 'Player'));
            const scoreSpan = document.createElement('span');
            scoreSpan.className = 'score';
            scoreSpan.textContent = `${entry.score ?? 0} pts`;
            row.appendChild(nameSpan);
            row.appendChild(scoreSpan);
            leaderboardList.appendChild(row);
        });
        if (leaderboardCard && entries.length) leaderboardCard.classList.add('active');
    };

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
            refreshFpvIdentity();
            if (joinCard) joinCard.style.display = 'none';
            if (controls) {
                controls.style.display = 'block';
                // Hide gamepad in lobby, only show ready button
                if (pad) pad.style.display = 'none';
            }
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
    let reloadTimer = 0;
    let reloadInterval = null;
    const sendState = () => sendControllerInput(state);

    const updateReticle = () => {
        if (!fpvReticle) return;
        const angle = Math.atan2(state.x, -state.z) * 180 / Math.PI;
        fpvReticle.style.setProperty('--reticle-rotation', `${isNaN(angle) ? 0 : angle}deg`);
    };

    const updateReloadUI = () => {
        if (!fpvReload) return;
        if (reloadTimer > 0) {
            fpvReload.textContent = `Reloading… ${reloadTimer.toFixed(1)}s`;
            fpvReload.classList.add('reloading');
        } else {
            fpvReload.textContent = 'Ready to fire';
            fpvReload.classList.remove('reloading');
        }
    };

    let currentLayout = 'DEFAULT';
    const applyControllerLayout = (gameType = 'DEFAULT') => {
        currentLayout = gameType || 'DEFAULT';
        const config = controllerLayouts[currentLayout] || controllerLayouts.DEFAULT;
        if (layoutTitle) layoutTitle.textContent = config.title;
        if (layoutHelp) layoutHelp.textContent = config.help;

        const showAction = config.showAction !== false;
        if (fireBtn) {
            fireBtn.style.display = showAction ? 'inline-block' : 'none';
            fireBtn.textContent = config.actionLabel || 'Action';
        }

        if (!showAction && state.action) {
            state.action = false;
            sendState();
        }

        if (pad) pad.classList.toggle('movement-only', !showAction);

        const crosshairEnabled = !!config.crosshair;
        if (fpvReticle) fpvReticle.style.display = crosshairEnabled ? 'block' : 'none';
        if (fpvReload) fpvReload.style.display = crosshairEnabled ? 'block' : 'none';
        if (fpv) fpv.classList.toggle('crosshair-enabled', crosshairEnabled);
    };

    const startReload = (seconds = 2) => {
        reloadTimer = seconds;
        updateReloadUI();
        if (reloadInterval) clearInterval(reloadInterval);
        reloadInterval = setInterval(() => {
            reloadTimer = Math.max(0, reloadTimer - 0.1);
            updateReloadUI();
            if (reloadTimer <= 0) {
                clearInterval(reloadInterval);
                reloadInterval = null;
            }
        }, 100);
    };

    updateReloadUI();
    updateReticle();
    applyControllerLayout();

    const resetThumb = () => {
        if (!thumb) return;
        thumb.style.transform = 'translate(-50%, -50%)';
        state.x = 0;
        state.z = 0;
        sendState();
        updateReticle();
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
        state.z = Math.max(-1, Math.min(1, offsetY / maxRadius));
        sendState();
        updateReticle();
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
        if (active && reloadTimer <= 0) {
            startReload(2);
            if (fpvReticle) {
                fpvReticle.classList.add('flash');
                setTimeout(() => fpvReticle?.classList.remove('flash'), 200);
            }
        }
    };

    fireBtn?.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        setAction(true);
    });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(evt => {
        fireBtn?.addEventListener(evt, () => setAction(false));
    });

    onControllerStart((details) => {
        const gameType = details?.game || 'DEFAULT';
        const screen = document.getElementById('controller-screen');
        if (screen) screen.classList.add('started');
        if (pad) pad.style.display = 'flex';
        if (statusLine) statusLine.textContent = 'Game started! Use the controller to play.';
        // Hide join card and status, keep only header with name/party code
        const joinCard = document.getElementById('controller-join');
        const status = document.getElementById('controller-status');
        if (joinCard) joinCard.style.display = 'none';
        if (status) status.style.display = 'none';
        applyControllerLayout(gameType);
        refreshFpvIdentity();
        fpv?.classList.add('active');
        updateReloadUI();
    });

    window.addEventListener('controller-game-end', (evt) => {
        const leaderboard = evt.detail?.leaderboard || [];
        const selfId = evt.detail?.selfId;
        screen?.classList.remove('started');
        if (pad) pad.style.display = 'none';
        if (controls) controls.style.display = 'block';
        setReadyWaiting();
        if (statusCard) statusCard.style.display = 'block';
        if (statusLine) statusLine.textContent = 'Game finished! Tap ready for the next round.';
        setControllerReady(false);
        renderLeaderboard(leaderboard, selfId);
        applyControllerLayout('DEFAULT');
        if (fpv) {
            fpv.classList.remove('crosshair-enabled');
            fpv.classList.remove('active');
        }
        if (fpvReticle) fpvReticle.style.display = 'none';
        if (fpvReload) fpvReload.style.display = 'none';
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

export function resetControllerUIForLobby() {
    const pad = document.getElementById('controller-pad');
    const joinCard = document.getElementById('controller-join');
    const status = document.getElementById('controller-status');
    const readyBtn = document.getElementById('ready-toggle');
    
    if (pad) pad.style.display = 'none';
    if (joinCard) joinCard.style.display = 'block';
    if (status) status.style.display = 'block';
    
    // Reset ready button to "waiting" state
    if (readyBtn) {
        readyBtn.classList.add('waiting');
        readyBtn.classList.remove('ready');
        readyBtn.innerText = 'Tap Ready';
        readyBtn.disabled = false;
    }
}

init();
