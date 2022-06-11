import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "fs";
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
    const decryptionKey = swzReader.bruteforceHeader(6060);

    if (decryptionKey == -1) {
        console.log("Failed to bruteforce decryption key");
        return;
    }
    
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

function testWriteSWZMetadata() {
    writeFileSync(`${brawlDir}Dynamic.swz.bak`, dynamic);

    const swzReader = new SWZReader(dynamic, 0);
    const decryptionKey = swzReader.bruteforceHeader(6060);

    if (decryptionKey == -1) {
        console.log("Failed to bruteforce decryption key");
        return;
    }
    
    const swzWriter = new SWZWriter(decryptionKey);

    swzWriter.writeHeader();

    while (true) {
        const result = swzReader.readData();

        if (!result) {
            break;
        }

        swzWriter.writeData(result);
    }

    swzWriter.writeData(Buffer.from("<Metadata><ModName>Test Mod</ModName></Metadata>"), 0xDEADBEEF)

    const newDynamic = swzWriter.getBuffer();
    writeFileSync(`${brawlDir}Dynamic.swz`, newDynamic);
}

function dumpSWZ() {
    const patch = 6060;

    let decryptionKey = -1;

    // Loop through all .swz files in the brawlhalla directory
    for (const file of readdirSync(brawlDir)) {
        if (!file.endsWith(".swz") || file.includes(".bak")) {
            continue;
        }

        // If the dump/file directory doesn't exist yet, create it
        if (!existsSync(`./dump/${file}`)) {
            mkdirSync(`./dump/${file}`);
        }

        const swzReader = new SWZReader(readFileSync(`${brawlDir}${file}`), decryptionKey);

        if (decryptionKey == -1) {
            decryptionKey = swzReader.bruteforceHeader(patch);
            if (decryptionKey == -1) {
                console.log("Failed to bruteforce decryption key");
                process.exit();
            }
        }
        else {
            swzReader.readHeader();
        }

        while (true) {
            const result = swzReader.readData();

            if (!result) {
                break;
            }
            
            const data = result.toString();

            if (data.startsWith("<")) {
                const nameMatch = data.match(/<([^>]*)>/);
                if (nameMatch) {
                    let name = nameMatch[1];

                    // <LevelDesc AssetDir="BattleHill" LevelName="BattleHill">

                    const levelMatch = name.match(/LevelName="([^"]*)"/);
                    if (levelMatch) {
                        name = `LevelDesc_${levelMatch[1]}`;
                    }
                    const fileName = `./dump/${file}/${name}.xml`;
                    writeFileSync(fileName, result);
                }
            }
            else {
                // Get name as first line in string
                const nameMatch = data.match(/^([^\n]*)\n/);
                if (nameMatch) {
                    const name = nameMatch[1];
                    const fileName = `./dump/${file}/${name}.xml`;
                    writeFileSync(fileName, result);
                }
            }
        }
    }
}

dumpSWZ();