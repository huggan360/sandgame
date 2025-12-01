import { getPartyInputs } from './party.js';

export const Input = {
    init() {},
    getAxisForSlot(index) {
        const partyInputs = getPartyInputs();
        return partyInputs[index] ?? { x: 0, z: 0, action: false };
    }
};

Input.init();
