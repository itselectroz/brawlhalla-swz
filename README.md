# brawlhalla-swz

[![Version](https://img.shields.io/npm/v/brawlhalla-swz.svg?style=flat-square)](https://www.npmjs.com/package/brawlhalla-swz)
[![Downloads](https://img.shields.io/npm/dt/brawlhalla-swz.svg?style=flat-square)](https://www.npmjs.com/package/brawlhalla-swz)
[![License](https://img.shields.io/github/license/itselectroz/brawlhalla-swz)](https://www.npmjs.com/package/brawlhalla-swz)

**brawlhalla-swz** is a module for parsing and decrypting SWZ files for the game [Brawlhalla](https://www.brawlhalla.com/).

## Installation

You can install **brawlhalla-swz** through the command line using `npm` or `yarn`.

```console
npm install brawlhalla-swz
```

## Usage

```javascript
import { KeyReader, SWZReader, SWZWriter } from "brawlhalla-swz";

// or

import * as BrawlhallaSWZ from "brawlhalla-swz";
```

## Documentation

### KeyReader

The KeyReader class is used for finding the SWZ decryption key from BrawlhallaAir.swf

#### `new KeyReader(buffer: Buffer): KeyReader`

> Construct a new KeyReader object from the swf data `buffer`

```typescript
import { readFileSync } from "fs";
import { KeyReader } from "brawlhalla-swz";

const swf = readFileSync(`/Path/To/Brawlhalla/BrawlhallaAir.swf`);

const keyReader = new KeyReader(swf);
```

#### `findDecryptionKey(): number | false`

> This method is for scanning the SWF file for the decryption key.\
> Returns false if the key cannot be found.

```typescript
import { KeyReader } from "brawlhalla-swz";

const keyReader = new KeyReader(swfData);

const decryptionKey = keyReader.findDecryptionKey();

> 492627010
```

### SWZReader

The main object for reading SWZ files.

#### `new SWZReader(buffer: Buffer, decryptionKey: number)`

> Constructor for SWZ Reader, taking in the SWF data as a buffer and the SWZ decryption key.\
> Use -1 if you are planning on bruteforcing the key.

```typescript
import { readFileSync } from "fs";
import { SWZReader } from "brawlhalla-swz";

const swf = readFileSync(`/Path/To/Brawlhalla/BrawlhallaAir.swf`);

const reader = new SWZReader(swf, 492627010);
```

#### `readHeader(): boolean`

> Attempt to parse the header of the SWZ File.\
> Returns whether the checksum passed, general indicator as to whether the decryption key is correct.

```typescript
import { readFileSync } from "fs";
import { SWZReader } from "brawlhalla-swz";

const swf = readFileSync(`/Path/To/Brawlhalla/BrawlhallaAir.swf`);

const reader = new SWZReader(swf, 492627010);

const success = reader.readHeader();

if (!success)
  throw new Error("Invalid decryption key");

> true
```

#### `bruteforceHeader(patch: number): number`

> Attempt to bruteforce the decryption key with the patch number.\
> The patch number should be a 4 digit number.\
> e.g. patch 7.01 would be 7010, patch 6.08 would be 6080.\
> Returns either the decryption key or -1.\
> The internal decryption key is set when the key is found, so you can read data as normal afterwards.

```typescript
import { readFileSync } from "fs";
import { SWZReader } from "brawlhalla-swz";

const swf = readFileSync(`/Path/To/Brawlhalla/BrawlhallaAir.swf`);

const reader = new SWZReader(swf, -1);

const key = reader.bruteforceHeader(7010);

if (key == -1)
  throw new Error("Failed to bruteforce decryption key");

// read file here

> 492627010
```

#### `readData(): Buffer | false`

> Read a section of data, false if no data left.\
> Prerequisite is to have parsed the file header.

```typescript
import { readFileSync } from "fs";
import { SWZReader } from "brawlhalla-swz";

const swf = readFileSync(`/Path/To/Brawlhalla/BrawlhallaAir.swf`);

const reader = new SWZReader(swf, -1);

const key = reader.bruteforceHeader(7010);

if (key == -1) throw new Error("Failed to bruteforce decryption key");

let data;
do {
  data = swf.readData();

  console.log(data);
} while (!!data);
```

### SWZWriter

The main object for writing SWZ files.

#### `new SWZWriter(decryptionKey: number)`

> Constructor for SWZ Writer, taking in the SWZ decryption key.

```typescript
import { SWZWriter } from "brawlhalla-swz";

const writer = new SWZWriter(492627010);
```

#### `writeHeader(seed?: number): void`

> Write the SWZ header to internal buffer.\
> Seed is a fixed value of `731341442` if not provided.\
> (Value sampled from previous version of brawlhalla)

```typescript
import { SWZWriter } from "brawlhalla-swz";

const writer = new SWZWriter(492627010);

writer.writeHeader(123456789);
```

#### `writeData(data: Buffer, forceChecksum?: number): void`

> Write a data section to the internal buffer, encrypts the data for you.\
> Forcechecksum allows you to force a specific value for the checksum.\
> Has the potential to hide data from the game, rarely used.

```typescript
import { SWZWriter } from "brawlhalla-swz";

const writer = new SWZWriter(492627010);

writer.writeHeader(123456789);

writer.writeData(Buffer.from("<swz file>"));
```

#### `getBuffer(): Buffer`

> Retrieve the data buffer from the writer.\
> Commonly used to export data to a file.

```typescript
import { SWZWriter } from "brawlhalla-swz";
import { writeFileSync } from "fs";

const writer = new SWZWriter(492627010);

writer.writeHeader(123456789);

writer.writeData(Buffer.from("<swz file>"));

writeFileSync("example.swz", writer.getBuffer());
```

## The SWZ File Format

After this library was created the file format was [publicly reversed on the xentax forum.](http://wiki.xentax.com/index.php/Brawlhalla_SWZ#Format_Specifications)

The SWZ file format is based upon an XOR cipher using a WELL512 pseudorandom number generator. See `src/prng.ts` for an implementation.

The header is a checksum to ensure the correct key is being used on the correct file.
See the `readHeader` method in SWZReader for more details.

The SWZ file almost acts like an archive, each file is its own data section, read with SWZReader's `readData` method.

The first line of each data section is the filename for CSV files.

The filename is the name of the first tag in XML files.

### How are we able to bruteforce the key?

The key for each file isn't truly random. The last 4 digits of every key is the patch which the key is for.

For example the key for the 7.01 tech-test branch is `492627010`

We are yet to find what the other digits represent, they are most likely just random.

However, this discovery reduces the search space enough for it to be easily bruteforced. This is implemented in SWZReader's `bruteforceHeader` method. If you know the patch you can bruteforce the key.

## Contributing

Interested in contributing to **brawlhalla-swz**?

Contributions are welcome, and are accepted via pull requests. Please [review these guidelines](contributing.md) before submitting any pull requests.

### Help

**Installing dependencies:**

```console
npm install
```

**Compile:**

```console
npm run build
```

## License

All code in this repository is licensed under [MIT](LICENSE).
