import { deflateSync } from "zlib";
import { PRNG } from "./prng";

const ROTR = function(x: number, n: number) {
    return (x >>> n) | (x << (32-n));
};

export class SWZWriter {
    private data: number[];

    private offset: number;
    private decryptionKey: number;

    private prng: PRNG;

    constructor(decryptionKey: number) {
        this.decryptionKey = decryptionKey;

        this.offset = 0;
        this.data = [];

        this.prng = new PRNG();
    }

    private writeByte(value: number) {
        this.data[this.offset++] = value >>> 0;
    }

    private writeUInt32(value: number) {
        value = value >>> 0;

        this.data[this.offset++] = (value >>> 24) & 0xFF;
        this.data[this.offset++] = (value >>> 16) & 0xFF;
        this.data[this.offset++] = (value >>> 8) & 0xFF;
        this.data[this.offset++] = value & 0xFF;
    }

    writeHeader(seed?: number) {
        seed = seed != undefined ? seed : 731341442;

        this.prng.initState(seed);

        let checkSum = 771006925;
        let xorCount = (this.decryptionKey % 0x1F) + 5;

        if (this.decryptionKey % 0x1F != -5) {
            do {
                checkSum ^= this.prng.getRandom();
                --xorCount;
            } while (xorCount);
        }

        this.writeUInt32(checkSum);
        this.writeUInt32(seed ^ this.decryptionKey);
    }

    writeData(data: Buffer) {
        const uncompressedSize = data.length;

        const compressedData = deflateSync(data);
        const compressedSize = compressedData.length;

        const compressedBuffer = new Array(compressedSize);
        
        this.writeUInt32(compressedSize ^ this.prng.getRandom());
        this.writeUInt32(uncompressedSize ^ this.prng.getRandom());

        let checksum = this.prng.getRandom();

        for (let i = 0; i < compressedSize; i++) {
            const random = this.prng.getRandom();
            const byteIndex = i & 0xF;

            const newByte = compressedData[i] ^ (((0xFF << byteIndex) & random) >>> byteIndex);
            compressedBuffer[i] = newByte;

            const bitShift = (i % 0x7);

            checksum = compressedData[i] ^ ROTR(checksum, (bitShift + 1) & 0xFF);
        }

        this.writeUInt32(checksum);
        
        for(let i = 0; i < compressedSize; i++) {
            this.writeByte(compressedBuffer[i]);
        }
    }

    getBuffer() {
        return Buffer.from(this.data);
    }
}