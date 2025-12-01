Purpose
-------
This file gives an AI coding agent the minimum, immediately-actionable context to be productive in this repository.

**Big Picture**
- Browser-only multiplayer party game. One browser tab acts as the host (full game + Three.js scene); other browser tabs/phones act as controllers and connect to the host via PeerJS.
- Host responsibilities: manage lobby, spin wheel, load minigames, run physics/logic and broadcast start/end messages. See `scripts/main.js` (the `GameManager`).
- Controllers: lightweight UIs that send inputs and ready/join events to the host. See `scripts/entry.js` and `scripts/party.js`.
- Rendering & scene utilities live in `scripts/scene.js` (Three.js) and are shared by minigames.

**Key Files / Where to Look**
- `index.html` — page shell, includes CDN scripts for `three.js` and `peerjs`, and bootstraps `scripts/entry.js` with `type="module"`.
- `scripts/entry.js` — app init, controller UI, and dynamic host bootstrap (loads `main.js` when hosting).
- `scripts/party.js` — PeerJS handshake and message protocol; primary API exported for lobby/controller logic.
- `scripts/main.js` — `GameManager` object: state machine (LOBBY → STARTING → INTRO → PLAYING → RESULT), minigame registry, UI wiring.
- `scripts/scene.js` — Three.js scene, helpers and shared functions: `resetPlayers`, `clearGameObjects`, `spawnObstacles`, `spawnProjectile`, `setEnvironment`, `setPlayerColors`, `useTankModels`, etc.
- `scripts/minigames/*.js` — minigame modules (one class per file). Example: `scripts/minigames/brawl.js`.

**Minigame API (concrete)**
- Pattern: export a class with at least:
  - `get meta()` — object with `{ title, description, penalty, environment? }` (used to render intro UI)
  - `start(players[, manager])` — setup; passed host-side player meshes (main may also pass manager as second arg)
  - `update(dt, input, players)` — called each frame or tick to apply game logic
- Example (from `scripts/minigames/brawl.js`):
  class with `get meta() { return { title:'Tiki Brawl', description: '...', penalty:'1 Sip' } }`
  `start(players)` sets per-player HP and spawns obstacles
  `update(dt, input, players)` consumes controller input and fires projectiles

**Networking / Message Protocol (from `scripts/party.js`)**
- PeerJS is included via CDN in `index.html` and used directly (no server-side code required). Host Peer id pattern: `host-<PARTY_CODE>`.
- Controller → Host message types: `{ type: 'join', name, color }`, `{ type: 'input', id, state }`, `{ type: 'ready', ready }`.
- Host → Controller messages: `{ type: 'slot', slot }`, `{ type: 'start', game }`, `{ type: 'game-end', leaderboard }`.
- Important exported helpers to call/observe: `startHosting()`, `becomeController()`, `connectControllerToParty(code)`, `sendJoinRequest(name,color)`, `sendControllerInput(state)`, `setControllerReady(bool)`, `broadcastStart(type)`, `broadcastGameEnd(winnerSlot)`, `onPartyPlayersChange(cb)`, `onControllerStart(cb)`, `onReadyStateChange(cb)`, `getPlayers()`.

**DOM / UI conventions (IDs used by code)**
- Host UI: `#lobby-card`, `#wheel-overlay`, `#intro-card`, `#result-card`, `#party-panel`, `#party-code`, `#party-chip`, `#host-leaderboard-list`, `#game-timer`, `#countdown`.
- Controller UI: `#controller-screen`, `#controller-code-input`, `#controller-name-input`, `#ready-toggle`, `#joystick`, `#fire-btn`, `#controller-pad`, `#leaderboard-list`.
- Code uses `document.getElementById` heavily and toggles classes (`active`, `hidden`, `waiting`, `ready`) — follow that convention when adding UI hooks.

**Runtime / Develop / Debug**
- No build step. Open `index.html` in a modern browser (Chrome/Edge/Firefox). The app loads `three.js` and `peerjs` from CDNs.
- To serve locally (recommended so module imports and fullscreen work):
  - `python3 -m http.server 8000` (then open `http://localhost:8000/`)
  - or `npx serve` / any static file server.
- Runtime inspection:
  - `window.GameManager` is exposed (see `scripts/main.js`) — use `window.GameManager.state`, call `window.GameManager.spinWheel()` to trigger flow, or inspect `window.GameManager.currentGame`.
  - `party.getPlayers()` equivalents: call exported functions inside console if module scope available; otherwise inspect host UI elements `#party-panel` / `#host-leaderboard-list`.

**Project-specific patterns & gotchas**
- Native ESM modules: code uses `import`/`export` and dynamic `import()` for code-splitting (see `entry.js` bootstrapping `main.js`). Keep files as modules; do not convert to bundler-only syntax without updating `index.html`.
- PeerJS dependency comes from CDN — offline dev will fail unless the library is available locally.
- Minigames are small stateful classes that mutate `playerMeshes` from `scene.js`. Avoid duplicating player state; prefer scene helpers (`resetPlayers`, `setPlayerColors`) and `gameObjects` list.
- GameManager is authoritative for transitions and broadcasting. Minigames should not call `broadcastStart`/`broadcastGameEnd` directly — let the manager handle round lifecycle.

If anything here is unclear or you'd like more detail (for example a cheatsheet of the `party.js` public functions or a template minigame scaffold), tell me which section to expand and I'll iterate.
