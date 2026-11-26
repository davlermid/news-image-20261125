// main.ts — news-image-20261125 entry copier (Node 22, no dependencies).
//
// Validates builds/news-image-20261125/entry.png (PNG magic, 1024x1024,
// at most 1 MiB, CRC-32 of every chunk) and copies its bytes unchanged to
// $MAKEFUN_OUTPUT_DIR/entry.png (default /output/entry.png). The copy is
// verified by comparing SHA-256 of source vs copy. No other output is
// produced; this competition's output is entry.png only.

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const SOURCE = join(HERE, "entry.png");
const MAX_BYTES = 1048576; // 1 MiB
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

// CRC-32 (IEEE 802.3, polynomial 0xEDB88320), table-driven.
const CRC_TABLE: Uint32Array = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function sha256(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex");
}

function fail(message: string): never {
  console.error(`main.ts: ERROR: ${message}`);
  process.exit(1);
}

// Validate the PNG structurally: magic, IHDR 1024x1024, and CRC-32 of
// every chunk (length + type + data). Returns the raw bytes.
function validatePng(path: string): Buffer {
  if (!existsSync(path)) fail(`entry.png not found: ${path}`);
  const size = statSync(path).size;
  if (size > MAX_BYTES) fail(`entry.png is ${size} bytes, over the 1 MiB limit`);
  if (size < 8 + 25) fail(`entry.png is ${size} bytes, too small to be a PNG`);
  const buf = readFileSync(path);
  if (!buf.subarray(0, 8).equals(PNG_MAGIC)) fail("entry.png: bad PNG magic");
  let offset = 8;
  let sawIhdr = false;
  let sawIend = false;
  while (offset + 12 <= buf.length) {
    const length = buf.readUInt32BE(offset);
    const type = buf.subarray(offset + 4, offset + 8).toString("latin1");
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    const crcEnd = dataEnd + 4;
    if (crcEnd > buf.length) fail(`entry.png: truncated chunk ${type}`);
    const storedCrc = buf.readUInt32BE(dataEnd);
    const computed = crc32(buf.subarray(offset + 4, dataEnd));
    if (storedCrc !== computed) {
      fail(`entry.png: CRC-32 mismatch in chunk ${type} (stored ${storedCrc}, computed ${computed})`);
    }
    if (!sawIhdr) {
      if (type !== "IHDR") fail("entry.png: first chunk is not IHDR");
      if (length !== 13) fail("entry.png: IHDR length is not 13");
      const width = buf.readUInt32BE(dataStart);
      const height = buf.readUInt32BE(dataStart + 4);
      if (width !== 1024 || height !== 1024) {
        fail(`entry.png: dimensions are ${width}x${height}, must be 1024x1024`);
      }
      sawIhdr = true;
    }
    if (type === "IEND") {
      if (length !== 0) fail("entry.png: IEND chunk is not empty");
      sawIend = true;
      break;
    }
    offset = crcEnd;
  }
  if (!sawIhdr) fail("entry.png: missing IHDR chunk");
  if (!sawIend) fail("entry.png: missing IEND chunk");
  return buf;
}

function main(): void {
  const bytes = validatePng(SOURCE);
  const sourceHash = sha256(bytes);
  const outDir = process.env.MAKEFUN_OUTPUT_DIR || "/output";
  mkdirSync(outDir, { recursive: true });
  const dest = join(outDir, "entry.png");
  // Byte-for-byte copy of the validated PNG; nothing is re-encoded.
  writeFileSync(dest, bytes);
  const copied = readFileSync(dest);
  const copiedHash = sha256(copied);
  if (copiedHash !== sourceHash) {
    fail(`copy hash mismatch: source ${sourceHash}, copy ${copiedHash}`);
  }
  if (copied.length !== bytes.length) {
    fail(`copy size mismatch: source ${bytes.length}, copy ${copied.length}`);
  }
  console.log(`main.ts: validated entry.png: 1024x1024, ${bytes.length} bytes, sha256 ${sourceHash}`);
  console.log(`main.ts: copied ${bytes.length} bytes to ${dest}, sha256 ${copiedHash}`);
}

main();
