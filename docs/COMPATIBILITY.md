# Compatibility

What was tried, with what, and what happened. Hosts: AMD Polaris (RX 480) with Mesa 24.0.8, redroid 15 official image, GPU host mode;
and a self-built Android 15 image (AOSP `android-15.0.0_r36`) — see `catalog/builds.json` for the machine-readable version.

## Builds, by image

`libndk_translation.so`, compared by md5 and by the source-line fingerprint ([FINDING-THE-SOURCE.md](FINDING-THE-SOURCE.md)):

| image | md5 | API | `native_bridge.cc` checks at lines | note |
|---|---|---|---|---|
| `35_r06` | `f7ceaac2…` | 35 | 616, 629 | oldest still online (`r01`–`r05` are gone) |
| `35_r07`, `35_r08` | `65148744…` | 35 | 616, 629 | the same file |
| `35_r09`, `35-ext14_r01` | `3f1d2639…` | 35 | 616, 629 | the same file; built from the AOSP source of Dec 2024 |
| **`35-ext15_r01`** | **`fa529513…`** | 35 | **625, 638** | newer code than r09 (9 more lines in `native_bridge.cc`) |
| `34_r14` | `ff473474…` | 34 | – | Android 14 |
| `36_r07` | `1f3d8b1c…` | 36 | 624, 637 | Android 16; other API level, not a drop-in for a 15 container |

## Games

| app | `3f1d2639…` (r09 / ext14) | `fa529513…` (ext15) |
|---|---|---|
| **Loop Sort** (`com.Garawell.LoopSort`, arm64, Unity IL2CPP) | **crash**, deterministic: `SIGSEGV`/`SEGV_ACCERR` at `libndk_translation.so +0x2df110`, called from `libunity.so`, ~11 s after launch | **works** (past level 4; also with the full set of 82 files taken straight from the ext15 image) |
| **Plants vs Zombies 2** (`com.ea.game.pvz2_row`, arm64) | installs, runs, draws its screens | not tried |

Things tried **without effect** on the Loop Sort crash with the r09 build: `ro.berberis.flags=accurate-sigsegv` (the SDK image's
`build.prop` sets it), a Samsung device profile, a different Google account. Swapping only the translator, one proxy library and the
two text files for the ext15 ones fixed it.

## Notes

- Unity IL2CPP relies on `SIGSEGV` handlers for null checks, which is the kind of code that stresses a translator; if a Unity game
  crashes inside `libndk_translation.so`, try another build before anything else.
- The translated code is slower than native: expect 2x–5x more CPU in the native part of an app.
- 64-bit only: the SDK images carry no 32-bit translator (`armeabi-v7a`-only apps are not covered).
