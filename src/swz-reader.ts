import { inflateSync } from "zlib";
import { PRNG } from "./prng";

const ROTR = function(x: number, n: number) {
    return (x >>> n) | (x << (32-n));
};

export class SWZReader {
    private buffer: Buffer;
    private offset: number;
    private decryptionKey: number;

    private prng: PRNG;

    constructor(buffer: Buffer, decryptionKey: number) {
        this.buffer = buffer;
        this.offset = 0;
        this.decryptionKey = decryptionKey;

        this.prng = new PRNG();
    }

    readByte() {
        return this.buffer.readUInt8(this.offset++);
    }

    readUInt32() {
        const value: number = this.buffer.readUInt32BE(this.offset);
        this.offset += 4;
        return value;
    }

    readHeader(): boolean {
        let expectedChecksum: number = this.readUInt32();
        let seed: number = this.decryptionKey ^ this.readUInt32();

        this.prng.initState(seed);

        let checkSum = 771006925;
        let xorCount = (this.decryptionKey % 0x1F) + 5;

        if (this.decryptionKey % 0x1F != -5) {
            do {
                checkSum ^= this.prng.getRandom();
                --xorCount;
            } while (xorCount);
        }

        return checkSum >>> 0 == expectedChecksum;
    }

    readData(): Buffer | false {
        if(this.buffer.length - this.offset <= 12) {
            return false;
        }

        const compressedSize = (this.readUInt32() ^ this.prng.getRandom());
        const uncompressedSize = (this.readUInt32() ^ this.prng.getRandom());
        const expectedChecksum = this.readUInt32();

        const compressedBuffer = Buffer.alloc(compressedSize);

        let checksum = this.prng.getRandom();

        for(let i = 0; i < compressedSize; i++) {
            const random = this.prng.getRandom();
            const byteIndex = i & 0xF;

            const newByte = this.readByte() ^ (((0xFF << byteIndex) & random) >>> byteIndex);
            compressedBuffer[i] = newByte;

            const bitShift = (i % 0x7);

            checksum = newByte ^ ROTR(checksum, (bitShift + 1) & 0xFF);
        }
        if ((checksum >>> 0) != expectedChecksum) {
            console.log("Incorrect data chunk checksum");
            return false;
        }

        return inflateSync(compressedBuffer);
    }
}