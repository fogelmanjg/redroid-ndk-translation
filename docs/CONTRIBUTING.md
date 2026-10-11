# Contributing

- **Tried a game** with a build? Add it to `catalog/builds.json` (`games.<name>`: `works`, `crashes`, or a short note) and to the
  table in `docs/COMPATIBILITY.md`, with the crash site if it crashes (`libndk_translation.so +0x...` from the tombstone).
- **A new image or revision?** `node tools/extract.js <zip>` prints the md5 and the fingerprint; if the build is not in the catalog,
  add an entry (the zip's sha1, the URL, the fingerprint) — `node tools/fingerprint.js --json <libndk_translation.so>` gives the fields.
- **Never** add the binaries, or links to places that are not the official `dl.google.com`.

Run the tests with `node --test test/`.
