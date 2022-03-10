import { readFileSync } from "fs";
import { SWZReader } from "./swz-reader";

const dynamic = readFileSync("C:\\Program Files (x86)\\Steam\\steamapps\\common\\Brawlhalla\\Init.swz");

const swzReader = new SWZReader(dynamic, 201066040);

console.log(swzReader.readHeader());

while(true) {
    const result = swzReader.readData();

    if(!result) {
        break;
    }

    console.log(result.toString());
}