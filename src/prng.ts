export class PRNG {
    private seed: number;
    private state: Uint32Array;
    private stateIndex: number;

    constructor() {
        this.seed = -1;
        this.state = new Uint32Array(16);
        this.stateIndex = 0;
    }

    initState(seed: number) {
        this.seed = seed >>> 0;

        this.state[0] = this.seed;

        for (let i = 1; i < this.state.length; i++) {
            const previousValue = this.state[i - 1];
            const modifiedValue = previousValue ^ (previousValue >>> 30);
            const newValue = Math.imul(1812433253, modifiedValue);
            this.state[i] = i + newValue;
        }
    }

    getRandom(): number {

        const a = this.state[this.stateIndex];
        const b = this.state[(this.stateIndex - 3) & 0xF];
        const c = a ^ b ^ ((b ^ Math.imul(2, a)) << 15);
        const e = this.state[(this.stateIndex - 7) & 0xF];
        const d = (e >>> 11) ^ e;

        const newStateIndex = (this.stateIndex - 1) & 0xF;

        this.state[this.stateIndex] = d ^ c;

        this.state[newStateIndex] ^= d ^ Math.imul(32, (d ^ c) & 0xFED22169) ^ Math.imul(4, this.state[newStateIndex] ^ ((c ^ (d << 10)) << 16));

        this.stateIndex = newStateIndex;

        return this.state[newStateIndex];
    }
}