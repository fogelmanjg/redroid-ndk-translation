# Finding which image a translator comes from

The case that started this: a translator that ran Loop Sort fine, of unknown origin (it came from a third-party Docker image and a
self-built AOSP tree), while the one extracted from the current SDK image (`35_r09`) crashed. Where did the good one come from?

1. **Hash search** (md5, sha1, sha256, ELF BuildId, size): nothing indexed. Binary hashes of loose files almost never are. Community
   scripts (Waydroid's, redroid-script) take this library from third-party prebuilt repositories or from ChromeOS firmware, each
   with its own pinned checksum: none matched, and none is an official source.
2. **`.note.android.ident`**: tells the API level the file was built for. Good and r09: API 35; Android 16's: 36. Timestamps are
   stripped (reproducible builds; the image's file times are 2008-12-31).
3. **The source line numbers kept in the binary** — the thing that worked. `strings` shows
   `frameworks/libs/binary_translation/native_bridge/native_bridge.cc:625: CHECK failed ...`; the line numbers move with the code.
   Comparing the good file with the r09 one: more checks (209 vs 204) and `native_bridge.cc` at 625/638 vs 616/629 → newer code.
   The AOSP tree of `android-15.0.0_r36` (commit of 10 Dec 2024) has exactly 616/629, so r09 was built from that.
4. **Scan every image that is still online.** Google's index lists only the current revision of each API, but older revisions and the
   platform-extension images are still served: HEAD the URLs (`x86_64-35_r06..r09`, `x86_64-35-ext14_r01`, `x86_64-35-ext15_r01`…).
   Extract each (`tools/extract.js`), fingerprint it (`tools/fingerprint.js`). `35-ext15_r01` had the same md5 as the good file.

`tools/fingerprint.js` automates step 3. A new image is checked in a few minutes without a database: compare the md5, and if it is new,
compare `nativeBridgeLines` with the table in [COMPATIBILITY.md](COMPATIBILITY.md) to see where it sits.
