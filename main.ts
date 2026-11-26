// World News — 25 November 2026 (make.fun news-image-20261125).
//
// The poster is pre-rendered from stories.json by generate.py and stored
// in this repo as entry.png. This program does NOT draw anything: it
// proves the stored PNG is a well-formed, complete 1024x1024 image under
// the 1 MiB cap, then copies its bytes unchanged to the output directory
// and checks the copy byte-for-byte, including a SHA-256 of both files.
//
// Usage:
//   MAKEFUN_OUTPUT_DIR=/output node main.ts
//   (default output dir is /output; the file is written as entry.png)

import { createHash } from "node:crypto";
import { closeSync, fsyncSync, mkdirSync, openSync, readFileSync, writeSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const MAX_BYTES = 1024 * 1024; // competition limit: at most 1 MiB
const EXPECTED_WIDTH = 1024;
const EXPECTED_HEIGHT = 1024;
const PNG_MAGIC = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

function fail(message: string): never {
  console.error(`error: ${message}`);
  process.exit(1);
}

function sha256(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

// CRC-32 (IEEE 802.3, polynomial 0xEDB88320), table built once at load.
const CRC_TABLE: Uint32Array = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Buffer, start: number, end: number): number {
  let crc = 0xffffffff;
  for (let i = start; i < end; i++) {
    crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunkType(bytes: Buffer, offset: number): string {
  return bytes.toString("latin1", offset + 4, offset + 8);
}

function main(): void {
  const here = dirname(fileURLToPath(import.meta.url));
  const sourcePath = join(here, "entry.png");
  const outDir = resolve(process.env.MAKEFUN_OUTPUT_DIR ?? "/output");
  const outPath = join(outDir, "entry.png");

  let bytes: Buffer;
  try {
    bytes = readFileSync(sourcePath);
  } catch {
    fail(`cannot read ${sourcePath}`);
  }

  // 1. Size: the competition caps the poster at 1 MiB.
  if (bytes.length === 0) fail("entry.png is empty");
  if (bytes.length > MAX_BYTES) {
    fail(`entry.png is ${bytes.length} bytes, over the 1 MiB limit`);
  }

  // 2. PNG signature (first 8 bytes).
  if (!bytes.subarray(0, 8).equals(PNG_MAGIC)) {
    fail("entry.png does not start with the PNG signature");
  }

  // 3. Walk every chunk: lengths must chain exactly to the end of file,
  // each chunk's stored CRC-32 must match the bytes it covers, the first
  // chunk must be a 13-byte IHDR, and the last must be a zero-length
  // IEND. A bad CRC or a short file fails here instead of shipping.
  let offset = 8;
  let chunkCount = 0;
  let seenIHDR = false;
  let seenIEND = false;
  let width = 0;
  let height = 0;
  while (offset + 8 <= bytes.length) {
    const length = bytes.readUInt32BE(offset);
    const type = chunkType(bytes, offset);
    if (offset + 12 + length > bytes.length) {
      fail(`chunk ${type} at offset ${offset} runs past end of file`);
    }
    const storedCrc = bytes.readUInt32BE(offset + 8 + length);
    const actualCrc = crc32(bytes, offset + 4, offset + 8 + length);
    if (storedCrc !== actualCrc) {
      fail(`chunk ${type} at offset ${offset} has a bad CRC-32`);
    }
    if (!seenIHDR) {
      if (type !== "IHDR" || length !== 13) {
        fail("first PNG chunk is not a 13-byte IHDR");
      }
      seenIHDR = true;
      width = bytes.readUInt32BE(offset + 8);
      height = bytes.readUInt32BE(offset + 12);
    }
    chunkCount++;
    if (type === "IEND") {
      if (length !== 0) fail("IEND chunk must have zero data length");
      if (offset + 12 + length !== bytes.length) {
        fail("trailing bytes after IEND");
      }
      seenIEND = true;
      break;
    }
    offset += 12 + length;
  }
  if (!seenIHDR) fail("no IHDR chunk found");
  if (!seenIEND) fail("no IEND chunk found; file looks truncated");
  if (width !== EXPECTED_WIDTH || height !== EXPECTED_HEIGHT) {
    fail(`poster is ${width}x${height}, expected 1024x1024`);
  }

  // 4. Copy the bytes unchanged, read the copy back, and compare both
  // the bytes and their hashes with the source.
  const sourceHash = sha256(bytes);
  mkdirSync(outDir, { recursive: true });
  // Write the copy and flush it to disk (fsync) before the read-back,
  // so the check below verifies the bytes actually stored on disk
  // rather than only what the page cache still holds.
  const fd = openSync(outPath, "w");
  try {
    writeSync(fd, bytes);
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
  const back = readFileSync(outPath);
  if (!back.equals(bytes)) {
    fail("read-back of the written file differs from entry.png");
  }
  if (sha256(back) !== sourceHash) {
    fail("read-back hash differs from the source hash");
  }

  console.log(
    `ok: entry.png ${width}x${height}, ${bytes.length} bytes, ` +
      `${chunkCount} PNG chunks with valid CRC-32, sha256 ${sourceHash}, ` +
      `copied unchanged to ${outPath} (verified by read-back)`,
  );
}

main();
