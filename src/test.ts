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
    
    console.log(decryptionKey);

    const swzReader = new SWZReader(dynamic, decryptionKey);

    console.log(swzReader.readHeader());

    // while (true) {
    //     const result = swzReader.readData();

    //     if (!result) {
    //         break;
    //     }

    //     console.log(result.toString());
    // }
}

function bruteforceSWZ() {
    const swzReader = new SWZReader(dynamic, 0);
    swzReader.bruteforceHeader(6030);
    const result = swzReader.readData();
    console.log(result.toString());
}


bruteforceSWZ();