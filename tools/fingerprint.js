#!/usr/bin/env node
'use strict';

// Identifies a libndk_translation.so without a database: prints its hashes, the Android API level it was built
// for, and the "source fingerprint" -- the file:line of every `CHECK failed` message that the binary keeps
// (frameworks/libs/binary_translation/...:LINE). The line numbers change with every version of the code, so
// two builds of the same source have the same fingerprint, and the distance between two fingerprints tells
// which build is newer (more lines = newer code). No dependencies.
//
//   node tools/fingerprint.js <libndk_translation.so> [more files...]
//   node tools/fingerprint.js --json <file>

const crypto = require('crypto');
const fs = require('fs');

// printable ASCII runs of at least `min` bytes, like strings(1)
function strings(buf, min = 8) {
  const out = [];
  let start = -1;
  for (let i = 0; i <= buf.length; i++) {
    const printable = i < buf.length && buf[i] >= 0x20 && buf[i] < 0x7f;
    if (printable && start < 0) start = i;
    if (!printable && start >= 0) {
      if (i - start >= min) out.push(buf.toString('latin1', start, i));
      start = -1;
    }
  }
  return out;
}

const SRC_RE = /(frameworks\/libs\/binary_translation\/[A-Za-z0-9_./+-]+):(\d+): CHECK/;

// ELF .note.android.ident: the NDK/platform API level the file was built for (the 4 bytes after "Android\0").
function apiLevel(buf) {
  const i = buf.indexOf('Android\0');
  if (i < 0 || i + 12 > buf.length) return null;
  return buf.readUInt32LE(i + 8);
}

function fingerprint(buf) {
  const sources = new Set();
  for (const s of strings(buf)) {
    const m = SRC_RE.exec(s);
    if (m) sources.add(`${m[1]}:${m[2]}`);
  }
  const list = [...sources].sort();
  const nativeBridge = list.filter((s) => s.includes('/native_bridge/native_bridge.cc')).map((s) => Number(s.split(':')[1]));
  return {
    md5: crypto.createHash('md5').update(buf).digest('hex'),
    sha256: crypto.createHash('sha256').update(buf).digest('hex'),
    size: buf.length,
    api: apiLevel(buf),
    checks: list.length,
    nativeBridgeLines: nativeBridge,
    sourceFingerprint: crypto.createHash('sha256').update(list.join('\n')).digest('hex').slice(0, 16),
  };
}

function main() {
  const args = process.argv.slice(2);
  const json = args[0] === '--json';
  const files = json ? args.slice(1) : args;
  if (files.length === 0) {
    console.error('Usage: node tools/fingerprint.js [--json] <libndk_translation.so> [...]');
    process.exit(1);
  }
  const results = files.map((f) => ({ file: f, ...fingerprint(fs.readFileSync(f)) }));
  if (json) { console.log(JSON.stringify(results.length === 1 ? results[0] : results, null, 2)); return; }
  for (const r of results) {
    console.log(`${r.file}\n  md5 ${r.md5}\n  sha256 ${r.sha256}\n  ${r.size} bytes, API ${r.api}, ${r.checks} source checks`
      + `\n  native_bridge.cc check lines: ${r.nativeBridgeLines.join(', ')}\n  source fingerprint ${r.sourceFingerprint}`);
  }
}

if (require.main === module) main();
module.exports = { fingerprint, strings };
