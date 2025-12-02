import { broadcastGameMessage, getPlayers, onControllerGameMessage } from '../party.js';

function haversineKm(a, b) {
    const R = 6371;
    const toRad = (deg) => deg * Math.PI / 180;
    const dLat = toRad(b.lat - a.lat);
    const dLon = toRad(b.lng - a.lng);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
}

export class SatelliteGuessGame {
    constructor() {
        this.roundLength = 60;
        this.roundEndsAt = null;
        this.roundDuration = 60;
        this.target = null;
        this.guesses = {};
        this.active = false;
        this.listenerBound = null;
        this.cities = [
            { name: 'New York, USA', lat: 40.7128, lng: -74.0060, zoom: 13 },
            { name: 'Paris, France', lat: 48.8566, lng: 2.3522, zoom: 13 },
            { name: 'Tokyo, Japan', lat: 35.6762, lng: 139.6503, zoom: 13 },
            { name: 'Sydney, Australia', lat: -33.8688, lng: 151.2093, zoom: 13 },
            { name: 'Cairo, Egypt', lat: 30.0444, lng: 31.2357, zoom: 13 },
            { name: 'Rio de Janeiro, Brazil', lat: -22.9068, lng: -43.1729, zoom: 13 },
            { name: 'Dubai, UAE', lat: 25.2048, lng: 55.2708, zoom: 13 },
            { name: 'Moscow, Russia', lat: 55.7558, lng: 37.6173, zoom: 12 },
            { name: 'London, UK', lat: 51.5074, lng: -0.1278, zoom: 13 },
            { name: 'Cape Town, South Africa', lat: -33.9249, lng: 18.4241, zoom: 13 }
        ];
    }

    get meta() {
        return {
            title: 'Satellite Guess',
            description: 'Explore a satellite view clue, drop a pin on the map from your phone, closest guess wins.',
            penalty: 'Winner hands out 3 sips',
            environment: 'ARENA',
            duration: 60
        };
    }

    pickCity() {
        return this.cities[Math.floor(Math.random() * this.cities.length)];
    }

    handleGuess(msg, manager) {
        if (!msg?.payload || msg.payload.game !== 'SATELLITE') return;
        if (msg.payload.event !== 'guess-lock') return;
        const players = getPlayers();
        const slot = players.find(p => p.id === msg.from)?.slot;
        if (slot === undefined || slot === null) return;
        this.guesses[slot] = { lat: msg.payload.lat, lng: msg.payload.lng };
        if (Object.keys(this.guesses).length >= manager.playerCount) {
            this.finishRound(manager);
        }
    }

    start(_players, manager) {
        this.target = this.pickCity();
        this.roundDuration = manager?.gameDuration ?? this.roundLength;
        this.roundEndsAt = performance.now() + (this.roundDuration || this.roundLength) * 1000;
        this.guesses = {};
        this.active = true;
        manager.setBoundaryLimit(null);
        if (!this.listenerBound) {
            this.listenerBound = (msg) => this.active && this.handleGuess(msg, manager);
            onControllerGameMessage(this.listenerBound);
        }

        broadcastGameMessage({
            game: 'SATELLITE',
            event: 'round-start',
            target: this.target,
            duration: this.roundDuration
        });

        window.dispatchEvent(new CustomEvent('satellite-round-start', {
            detail: { target: this.target, duration: this.roundDuration }
        }));
    }

    finishRound(manager) {
        if (!this.target || manager.state !== 'PLAYING') return;
        const players = getPlayers();
        let winner = null;
        let best = Infinity;
        const resultGuesses = {};

        players.forEach(p => {
            const guess = this.guesses[p.slot];
            if (!guess) {
                manager.scores[p.slot] = Infinity;
                resultGuesses[p.slot] = { missed: true, name: p.name, color: p.color };
                return;
            }
            const dist = haversineKm(this.target, guess);
            manager.scores[p.slot] = dist;
            resultGuesses[p.slot] = { ...guess, dist, name: p.name, color: p.color };
            if (dist < best) {
                best = dist;
                winner = p.slot;
            }
        });
        if (!Number.isFinite(best)) winner = null;

        broadcastGameMessage({
            game: 'SATELLITE',
            event: 'round-end',
            guesses: resultGuesses,
            target: this.target
        });

        window.dispatchEvent(new CustomEvent('satellite-round-end', {
            detail: { target: this.target, guesses: resultGuesses }
        }));

        this.active = false;
        manager.updateHud?.();
        manager.endGame(winner ?? null);
    }

    update(_dt, _inputs, _players, _timer, manager) {
        if (manager.state !== 'PLAYING') return;
        if (this.roundEndsAt && performance.now() >= this.roundEndsAt) {
            this.finishRound(manager);
        }
    }
}
