'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { fingerprint, strings } = require('../tools/fingerprint');

function fakeLib(lines, api = 35) {
  const parts = [Buffer.from('\x7fELF\0\0\0\0')];
  for (const l of lines) parts.push(Buffer.from(`frameworks/libs/binary_translation/native_bridge/native_bridge.cc:${l}: CHECK failed: x\0`), Buffer.from([1, 2]));
  const note = Buffer.alloc(16); note.write('Android\0'); note.writeUInt32LE(api, 8);
  parts.push(note);
  return Buffer.concat(parts);
}

test('fingerprint reads the check lines, the API level and the hashes', () => {
  const f = fingerprint(fakeLib([625, 638], 35));
  assert.deepStrictEqual(f.nativeBridgeLines, [625, 638]);
  assert.strictEqual(f.api, 35);
  assert.strictEqual(f.checks, 2);
  assert.match(f.md5, /^[0-9a-f]{32}$/);
});

test('two builds of the same source have the same fingerprint, a newer one does not', () => {
  const a = fingerprint(fakeLib([616, 629]));
  const same = fingerprint(Buffer.concat([fakeLib([616, 629]), Buffer.from('x')]));
  const newer = fingerprint(fakeLib([625, 638]));
  assert.strictEqual(a.sourceFingerprint, same.sourceFingerprint);
  assert.notStrictEqual(a.sourceFingerprint, newer.sourceFingerprint);
});

test('strings returns printable runs and ignores the short ones', () => {
  assert.deepStrictEqual(strings(Buffer.from('abc\0longenough\0xy', 'latin1'), 8), ['longenough']);
});

test('the catalog has no duplicated build and each one names an image', () => {
  const c = require('../catalog/builds.json');
  const ids = c.builds.map((b) => b.id);
  assert.strictEqual(new Set(ids).size, ids.length);
  for (const b of c.builds) assert.ok(b.images.length > 0 && b.libndk_translation.sha256.length === 64);
});
