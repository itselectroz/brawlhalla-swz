import { readFileSync, writeFileSync } from "fs";
import { KeyReader } from "./key-reader";
import { PRNG } from "./prng";
import { SWZReader } from "./swz-reader";
import { SWZWriter } from "./swz-writer";

const brawlDir = process.platform == "darwin" ? `${process.env.HOME}/Library/Application Support/Steam/steamapps/common/Brawlhalla/Brawlhalla.app/Contents/Resources/` : "C:\\Program Files (x86)\\Steam\\steamapps\\common\\Brawlhalla\\";
const dynamic = readFileSync(`${brawlDir}Dynamic.swz.bak`);
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

function testWriteSWZ() {
    writeFileSync(`${brawlDir}Dynamic.swz.bak`, dynamic);

    const swzReader = new SWZReader(dynamic, 0);
    const decryptionKey = swzReader.bruteforceHeader(6050);
    
    const swzWriter = new SWZWriter(decryptionKey);

    swzWriter.writeHeader();

    while (true) {
        const result = swzReader.readData();

        if (!result) {
            break;
        }

        swzWriter.writeData(result);
    }

    const newDynamic = swzWriter.getBuffer();
    writeFileSync(`${brawlDir}Dynamic.swz`, newDynamic);
}

testWriteSWZ();