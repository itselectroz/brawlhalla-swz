import { readFileSync } from "fs";
import { KeyReader } from "./key-reader";
import { PRNG } from "./prng";
import { SWZReader } from "./swz-reader";

const brawlDir = process.platform == "darwin" ? `${process.env.HOME}/Library/Application Support/Steam/steamapps/common/Brawlhalla/Brawlhalla.app/Contents/Resources/` : "C:\\Program Files (x86)\\Steam\\steamapps\\common\\Brawlhalla\\";
const dynamic = readFileSync(`${brawlDir}Dynamic.swz`);
const swf = readFileSync(`${brawlDir}BrawlhallaAir.swf`);

function readSWZ() {
    const swzReader = new SWZReader(dynamic, 201066040);

    console.log(swzReader.readHeader());

    while (true) {
        const result = swzReader.readData();

        if (!result) {
            break;
        }

        console.log(result.toString());
    }
}

function findDecryptionKey() {
    const keyReader = new KeyReader(swf);

    const decryptionKey = keyReader.findDecryptionKey();
    if (!decryptionKey) {
        return;
    }

    console.log(`Found decryption key: ${decryptionKey}`);
}

function automaticallyReadSWZ() {
    const keyReader = new KeyReader(swf);

    const decryptionKey = keyReader.findDecryptionKey();
    if (!decryptionKey) {
        return;
    }

    const swzReader = new SWZReader(dynamic, decryptionKey);

    console.log(swzReader.readHeader());

    while (true) {
        const result = swzReader.readData();

        if (!result) {
            break;
        }

        console.log(result.toString());
    }
}

function nothingToDoWithSWZ() {
    const keyReader = new KeyReader(swf);

    // const pattern = [0xD0, 0x30, 0x24, 0x00, 0x63, 0x0A, 0x24, 0x00, 0x63, 0x0B, 0x24, 0x00, 0x74, 0x63, 0x0C, 0x24, 0x00, 0x74, 0x63, 0x0D, 0x24, 0x00, 0x63, 0x1E];

    const pattern = [0xD0, 0x30, 0x5E, 0xAA, 0x4E, 0xD1, 0x68, 0xAA, 0x4E, 0x5E, 0xFE, 0x8B, 0x01, 0xD2, 0x68, 0xFE, 0x8B, 0x01, 0x5E, 0xA2, 0x98, 0x01, 0xD3, 0x68, 0xA2, 0x98, 0x01, 0x5E, 0xF6, 0x5A];

    const buffer = keyReader.buffer;
    for (let i = 0; i < buffer.length - pattern.length; i++) {
        let bad = false;
        for (let j = 0; j < pattern.length; j++) {
            if (buffer[i + j] != pattern[j]) {
                bad = true;
                break;
            }
        }

        if (bad) {
            continue;
        }

        console.log(buffer.slice(i - 5, i + pattern.length));
    }
}

function testPRNG() {
    const prng = new PRNG();
    prng.initState(0x90E78E04);

    console.log(prng.getRandom().toString(16));
}


testPRNG();