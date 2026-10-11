#!/usr/bin/env node
'use strict';

// Extracts the files of the ARM translation from a system image of the Android SDK -- a .zip that Google publishes
// and that YOU download (this project does not download Google software):
//
//   https://dl.google.com/android/repository/sys-img/google_apis_playstore/x86_64-35-ext15_r01.zip
//
//   node tools/extract.js <image zip> [outDir]          (outDir defaults to ./out)
//
// It leaves in outDir the files laid out as /system is (system/lib64, system/bin/arm64, system/etc) and a package.json
// with the sha256 and mode of each, then tells which known build the translator is and what is known about it.
// It needs Docker (it runs in an alpine container where it installs erofs-utils and e2fsprogs, so the host needs no
// extra tools) and network access for that `apk add`.
//
// Using that image outside the development of Android apps is a gray area of Google's SDK license: reading it, and
// deciding, is up to you.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');
const { fingerprint } = require('./fingerprint');

const CATALOG = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'catalog', 'builds.json'), 'utf8'));

function sha1File(file) {
  return new Promise((resolve, reject) => {
    const h = crypto.createHash('sha1');
    fs.createReadStream(file).on('error', reject).on('data', (d) => h.update(d)).on('end', () => resolve(h.digest('hex')));
  });
}

async function main() {
  const [zip, outArg] = process.argv.slice(2);
  if (!zip || !fs.existsSync(zip)) {
    console.error('Usage: node tools/extract.js <image zip, e.g. x86_64-35-ext15_r01.zip> [outDir]');
    process.exit(1);
  }
  const out = path.resolve(outArg || 'out');
  const name = path.basename(zip);

  const known = CATALOG.builds.flatMap((b) => b.images.map((i) => ({ ...i, build: b }))).find((i) => i.zip === name);
  const sha1 = await sha1File(zip);
  if (known && known.zipSha1 && known.zipSha1 !== sha1) {
    console.error(`The sha1 of the zip (${sha1}) is not the one recorded for ${name} (${known.zipSha1}): the download is corrupt or it is another build. Nothing was extracted.`);
    process.exit(1);
  }
  if (!known) console.warn(`NOTE: ${name} is not in the catalog: it is extracted anyway and the result is reported as unknown.`);

  fs.mkdirSync(out, { recursive: true });
  const meta = JSON.stringify({
    id: `arm-translation-${name.replace(/^x86_64-/, 'sdk').replace(/\.zip$/, '').replace(/[_-]+/g, '-')}-x86_64`,
    version: known ? known.label : name,
    origen: known ? known.url : '',
    origenSha1: sha1,
  });
  const r = spawnSync('docker', [
    'run', '--rm',
    '-e', `PKG_META=${meta}`,
    '-e', `HOST_UID=${process.getuid()}`, '-e', `HOST_GID=${process.getgid()}`,
    '-v', `${path.resolve(zip)}:/in/sdk.zip:ro`,
    '-v', `${out}:/out`,
    '-v', `${path.join(__dirname, 'extract.py')}:/extract.py:ro`,
    'alpine:3.20',
    'sh', '-c', 'apk add --no-cache python3 erofs-utils e2fsprogs e2fsprogs-extra unzip >/dev/null && python3 -I /extract.py',
  ], { stdio: 'inherit' });
  if (r.status !== 0) process.exit(r.status || 1);

  const lib = path.join(out, 'system', 'lib64', 'libndk_translation.so');
  const f = fingerprint(fs.readFileSync(lib));
  const build = CATALOG.builds.find((b) => b.libndk_translation.sha256 === f.sha256);
  console.log(`\nFiles and package.json in ${out}.`);
  console.log(`libndk_translation.so: md5 ${f.md5}, ${f.size} bytes, API ${f.api}, native_bridge.cc checks at ${f.nativeBridgeLines.join(', ')}`);
  if (build) {
    console.log(`Known build ${build.id} (in: ${build.images.map((i) => i.zip).join(', ')}). Games: ${Object.entries(build.games).map(([g, v]) => `${g}: ${v}`).join('; ') || 'none tried yet'}`);
  } else {
    console.log('This build is not in the catalog (see docs/CONTRIBUTING.md to add it with its test results).');
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
