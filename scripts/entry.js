import { becomeController, connectControllerToParty, getControllerSlot, initParty, mountControllerUI, onChooseGameRequest, onControllerStart, onGameMessage, onPartyStateChange, sendChosenGame, sendJoinRequest, sendPartyModeChange, sendControllerGameMessage, setControllerReady, sendControllerInput, startHosting } from './party.js';

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
    const layoutTitle = document.getElementById('controller-layout-title');
    const layoutHelp = document.getElementById('controller-layout-help');
    const colorChoices = document.querySelectorAll('[data-controller-color]');
    const modeButtons = document.querySelectorAll('[data-mode-choice]');
    const modeStatus = document.getElementById('mode-status');
    const modePanel = document.getElementById('mode-panel');
    const gameChoicePanel = document.getElementById('game-choice-panel');
    const gameChoiceList = document.getElementById('game-choice-list');
    const choiceHint = document.getElementById('choice-hint');
    const leaderboardToggle = document.getElementById('leaderboard-toggle');
    const satPanel = document.getElementById('satellite-panel');
    const satGuess = document.getElementById('satellite-guess');
    const satLockBtn = document.getElementById('satellite-lock');
    const satStatus = document.getElementById('satellite-status');
    let selectedColor = null;
    const controllerLayouts = {
        DEFAULT: { title: 'Standard Controls', help: 'Use the joystick to move. Action appears when a game needs it.', actionLabel: 'Action', showAction: false, crosshair: false },
        BRAWL: { title: 'Brawl', help: 'Move to aim and tap to fire tiki shots.', actionLabel: 'Fire', showAction: true, crosshair: false },
        COLLECT: { title: 'Pineapple Rush', help: 'Sprint between pineapples and drop-offs.', actionLabel: 'Grab/Drop', showAction: false, crosshair: false },
        VOLCANO: { title: 'Magma Madness', help: 'Keep moving to avoid eruptions. No action button needed.', actionLabel: 'Action', showAction: false, crosshair: false },
        CRAB: { title: 'Crab Dodge', help: 'Slide around the crabs — movement only.', actionLabel: 'Action', showAction: false, crosshair: false },
        TANK: { title: 'Tank Takedown', help: 'Aim your turret with the stick. Tap to fire.', actionLabel: 'Fire Cannon', showAction: true, crosshair: false },
        SKY: { title: 'Ice Sumo', help: 'Glide on the ice and bump rivals off. Joystick only.', actionLabel: 'Body Check', showAction: false, crosshair: false },
        FLAPPY: { title: 'Flappy Flock', help: 'Tap to flap. No joystick needed.', actionLabel: 'Flap', showAction: true, hideStick: true, crosshair: false },
        RUNNER: { title: 'Desert Dash', help: 'Tap to jump and dodge obstacles.', actionLabel: 'Jump', showAction: true, crosshair: false },
        SATELLITE: { title: 'Satellite Guess', help: 'Explore the satellite clue and drop a pin on the map.', actionLabel: 'Lock Guess', showAction: false, hideStick: true, crosshair: false },
        SHOOTING: { title: 'Shooter', help: 'Aim carefully and fire straight ahead.', actionLabel: 'Shoot', showAction: true, crosshair: false }
    };
    const minigameLabels = {
        BRAWL: 'Brawl',
        COLLECT: 'Pineapple Rush',
        VOLCANO: 'Magma Madness',
        CRAB: 'Crab Dodge',
        TANK: 'Tank Takedown',
        SKY: 'Sky Rink',
        FLAPPY: 'Flappy Flock',
        RUNNER: 'Boardwalk Dash',
        SATELLITE: 'Satellite Guess'
    };

    let isLeader = false;
    let partyMode = 'RANDOM';
    let selfId = null;
    let leaderboardOpen = false;

    const updateModeUI = () => {
        modeButtons?.forEach(btn => {
            const mode = btn.dataset.modeChoice;
            const active = partyMode === mode;
            btn.classList.toggle('active', active);
            btn.disabled = !isLeader;
        });
        if (modeStatus) {
            modeStatus.textContent = isLeader ? 'You are party leader. Choose how rounds are picked.' : 'Leader decides if rounds are random or chosen.';
        }
        if (gameChoicePanel) gameChoicePanel.classList.toggle('not-leader', !isLeader);
        if (partyMode === 'RANDOM') gameChoicePanel?.classList.remove('active');
    };

    const setSelectedColor = (color) => {
        selectedColor = color;
        colorChoices?.forEach(btn => {
            const match = btn.dataset.controllerColor === color;
            btn.classList.toggle('selected', match);
        });
    };

    colorChoices?.forEach(btn => {
        btn.addEventListener('click', () => setSelectedColor(btn.dataset.controllerColor));
    });
    if (!selectedColor && colorChoices?.length) {
        setSelectedColor(colorChoices[0].dataset.controllerColor);
    }
    if (codeInput && prefillCode) codeInput.value = prefillCode.toUpperCase();

    const readyBtn = document.getElementById('ready-toggle');
    let connected = false;
    modeButtons?.forEach(btn => {
        btn.addEventListener('click', () => {
            if (!isLeader) return;
            const mode = btn.dataset.modeChoice;
            partyMode = mode;
            sendPartyModeChange(mode);
            updateModeUI();
        });
    });

    const setReadyWaiting = () => {
        if (!readyBtn) return;
        readyBtn.classList.add('waiting');
        readyBtn.classList.remove('ready');
        readyBtn.innerText = 'Tap Ready';
        readyBtn.disabled = false;
        if (modePanel) modePanel.style.display = 'block';
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
        if (leaderboardCard) {
            leaderboardCard.dataset.hasData = entries.length ? 'true' : 'false';
            if (leaderboardOpen && entries.length) leaderboardCard.classList.add('active');
            else leaderboardCard.classList.remove('active');
        }
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
        const chosenColor = selectedColor || colorChoices?.[0]?.dataset?.controllerColor;
        statusLine.textContent = 'Joining lobby…';
        try {
            const slot = await sendJoinRequest(name, chosenColor);
            if (slot?.color) setSelectedColor(slot.color);
            if (slot?.id) selfId = slot.id;
            isLeader = !!slot?.leader;
            partyMode = slot?.mode || partyMode;
            updateModeUI();
            connected = true;
            if (readyBtn) readyBtn.disabled = false;
            statusLine.textContent = `Joined as ${name}. Tap ready while waiting for host.`;
            if (joinCard) joinCard.style.display = 'none';
            if (controls) {
                controls.style.display = 'block';
                // Hide gamepad in lobby, only show ready button
                if (pad) pad.style.display = 'none';
            }
            if (modePanel) modePanel.style.display = 'block';
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

    satLockBtn?.addEventListener('click', () => {
        if (!satState.guessMarker) {
            satStatus && (satStatus.textContent = 'Tap the guess map to place your pin first.');
            return;
        }
        const pos = satState.guessMarker.getLatLng();
        sendControllerGameMessage({
            game: 'SATELLITE',
            event: 'guess-lock',
            lat: pos.lat,
            lng: pos.lng
        });
        satLockBtn.disabled = true;
        satStatus && (satStatus.textContent = 'Guess locked in! Waiting for others…');
    });

    const state = { x: 0, z: 0, action: false };
    const sendState = () => sendControllerInput(state);

    let currentLayout = 'DEFAULT';
    const satState = {
        guessMap: null,
        guessMarker: null,
        resultLine: null,
        overlays: [],
        target: null
    };
    let leafletLoading = null;

    const loadLeaflet = () => {
        if (window.L) return Promise.resolve();
        if (leafletLoading) return leafletLoading;
        leafletLoading = new Promise((resolve, reject) => {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
            link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
            link.crossOrigin = '';
            document.head.appendChild(link);

            const script = document.createElement('script');
            script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
            script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
            script.crossOrigin = '';
            script.onload = resolve;
            script.onerror = () => reject(new Error('Failed to load Leaflet'));
            document.head.appendChild(script);
        });
        return leafletLoading;
    };

    const setupSatelliteMaps = async (payload) => {
        satLockBtn && (satLockBtn.disabled = true);
        satStatus && (satStatus.textContent = 'Loading maps…');
        if (!satPanel) return;
        satPanel.style.display = 'block';
        await loadLeaflet();

        const target = payload?.target || { lat: 0, lng: 0, zoom: 2 };
        satState.target = target;

        if (!satState.guessMap) {
            satState.guessMap = L.map(satGuess).setView([20, 0], 1);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap'
            }).addTo(satState.guessMap);
            satState.guessMap.on('click', (e) => {
                if (!satState.guessMap) return;
                if (satState.guessMarker) {
                    satState.guessMarker.setLatLng(e.latlng);
                } else {
                    satState.guessMarker = L.marker(e.latlng).addTo(satState.guessMap);
                }
                satLockBtn && (satLockBtn.disabled = false);
                satStatus && (satStatus.textContent = 'Pin placed. Lock in your guess.');
            });
        }

        // Reset overlays
        if (satState.overlays.length) {
            satState.overlays.forEach(layer => layer && satState.guessMap?.removeLayer(layer));
            satState.overlays = [];
        }
        if (satState.guessMarker) {
            satState.guessMap.removeLayer(satState.guessMarker);
            satState.guessMarker = null;
        }
        if (satState.resultLine) {
            satState.guessMap.removeLayer(satState.resultLine);
            satState.resultLine = null;
        }
        satState.guessMap.setView([20, 0], 1);
        satStatus && (satStatus.textContent = 'Tap the map to place your pin.');
        setTimeout(() => satState.guessMap?.invalidateSize(), 50);
    };

    const finishSatelliteRound = (payload) => {
        satLockBtn && (satLockBtn.disabled = true);
        if (!payload?.target || !payload?.guesses || !satState.guessMap || !window.L) {
            satStatus && (satStatus.textContent = 'Round ended.');
            return;
        }
        satStatus && (satStatus.textContent = 'Round ended. Results on host screen.');
        const myGuess = payload.guesses[getControllerSlot()?.slot ?? -1];
        if (myGuess && !myGuess.missed && typeof myGuess.lat === 'number' && typeof myGuess.lng === 'number') {
            const line = L.polyline([[payload.target.lat, payload.target.lng], [myGuess.lat, myGuess.lng]], {
                color: '#ef4444',
                weight: 3,
                opacity: 0.7,
                dashArray: '10, 10'
            }).addTo(satState.guessMap);
            satState.resultLine = line;
            satState.overlays.push(line);
            const targetMarker = L.circleMarker([payload.target.lat, payload.target.lng], {
                color: '#10b981',
                fillColor: '#10b981',
                fillOpacity: 1,
                radius: 8
            }).addTo(satState.guessMap);
            satState.overlays.push(targetMarker);
            satState.guessMap.fitBounds(L.latLngBounds([[payload.target.lat, payload.target.lng], [myGuess.lat, myGuess.lng]]).pad(0.2));
        }
    };

    const applyControllerLayout = (gameType = 'DEFAULT') => {
        currentLayout = gameType || 'DEFAULT';
        const config = controllerLayouts[currentLayout] || controllerLayouts.DEFAULT;
        if (layoutTitle) layoutTitle.textContent = config.title;
        if (layoutHelp) layoutHelp.textContent = config.help;

        const showAction = config.showAction !== false;
        if (fireBtn) {
            fireBtn.style.display = 'inline-block';
            fireBtn.style.visibility = showAction ? 'visible' : 'hidden';
            fireBtn.style.pointerEvents = showAction ? 'auto' : 'none';
            fireBtn.textContent = config.actionLabel || 'Action';
        }

        if (!showAction && state.action) {
            state.action = false;
            sendState();
        }

        if (pad) {
            // Keep layout consistent even when action is hidden
            pad.classList.remove('movement-only');
            pad.style.display = currentLayout === 'SATELLITE' ? 'none' : '';
        }
        if (satPanel) satPanel.style.display = currentLayout === 'SATELLITE' ? 'block' : 'none';

        if (joystick) {
            joystick.style.display = config.hideStick ? 'none' : 'block';
            if (config.hideStick) resetThumb();
        }
    };

    applyControllerLayout();
    updateModeUI();

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
        state.z = Math.max(-1, Math.min(1, offsetY / maxRadius));
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

    const setLeaderboardVisible = (visible) => {
        leaderboardOpen = visible;
        leaderboardCard?.classList.toggle('active', visible);
        if (leaderboardToggle) leaderboardToggle.textContent = visible ? '▾' : '▴';
    };

    leaderboardToggle?.addEventListener('click', () => {
        setLeaderboardVisible(!leaderboardOpen);
    });

    onPartyStateChange(({ mode, leaderId }) => {
        partyMode = mode || 'RANDOM';
        isLeader = leaderId && selfId ? leaderId === selfId : isLeader;
        updateModeUI();
    });

    onChooseGameRequest(({ games }) => {
        if (!gameChoicePanel || !gameChoiceList) return;
        gameChoiceList.innerHTML = '';
        const list = games && games.length ? games : Object.keys(minigameLabels);
        list.forEach(key => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'choice-btn';
            btn.textContent = minigameLabels[key] || key;
            btn.disabled = !isLeader;
            btn.addEventListener('click', () => {
                if (!isLeader) return;
                sendChosenGame(key);
                gameChoicePanel.classList.remove('active');
                gameChoicePanel.classList.remove('hidden');
            });
            gameChoiceList.appendChild(btn);
        });
        if (choiceHint) choiceHint.textContent = isLeader ? 'Pick the next minigame.' : 'Leader is choosing the next game…';
        gameChoicePanel.classList.remove('hidden');
        gameChoicePanel.classList.add('active');
    });

    onGameMessage((payload) => {
        if (payload?.game !== 'SATELLITE') return;
        if (payload.event === 'round-start') {
            applyControllerLayout('SATELLITE');
            setupSatelliteMaps(payload);
        } else if (payload.event === 'round-end') {
            finishSatelliteRound(payload);
        }
    });

    onControllerStart((details) => {
        const gameType = details?.game || 'DEFAULT';
        const screen = document.getElementById('controller-screen');
        if (screen) screen.classList.add('started');
        if (pad && gameType !== 'SATELLITE') pad.style.display = 'flex';
        if (gameType === 'SATELLITE' && satPanel) satPanel.style.display = 'block';
        if (statusLine) statusLine.textContent = 'Countdown started! Get ready to play.';
        // Hide join card and status, keep only header with name/party code
        const joinCard = document.getElementById('controller-join');
        const status = document.getElementById('controller-status');
        if (joinCard) joinCard.style.display = 'none';
        if (status) status.style.display = 'none';
        if (readyBtn) readyBtn.style.display = 'none';
        if (modePanel) modePanel.style.display = 'none';
        gameChoicePanel?.classList.remove('active');
        applyControllerLayout(gameType);
    });

    window.addEventListener('controller-game-end', (evt) => {
        const leaderboard = evt.detail?.leaderboard || [];
        const selfId = evt.detail?.selfId;
        screen?.classList.remove('started');
        if (pad) pad.style.display = 'none';
        if (satPanel) satPanel.style.display = 'none';
        if (controls) controls.style.display = 'block';
        if (readyBtn) readyBtn.style.display = 'block';
        if (modePanel) modePanel.style.display = 'block';
        setReadyWaiting();
        if (statusCard) statusCard.style.display = 'block';
        if (statusLine) statusLine.textContent = 'Game finished! Tap ready for the next round.';
        setControllerReady(false);
        renderLeaderboard(leaderboard, selfId);
        applyControllerLayout('DEFAULT');
    });

    window.addEventListener('resize', () => {
        if (satState.guessMap?.invalidateSize) {
            satState.guessMap.invalidateSize();
        }
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
