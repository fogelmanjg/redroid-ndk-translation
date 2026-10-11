# redroid-ndk-translation

Which `ndk_translation` (the ARM → x86_64 native bridge, "Berberis") to put in a redroid / Android-on-x86_64 container so that
**ARM64-only apps and games run** — and which builds of it do not work.

The official redroid image declares `arm64-v8a` in its ABI list but ships no translator, so ARM64-only games crash. The
translator is Google's: it ships inside the Android SDK emulator system images. Not every build of it is equal. This project
records, by hash, **which build is in which image and what is known to work with it**, and has the tools to take it out of an
image you downloaded yourself.

> **No binaries here.** The translator is Google's software, under the Android SDK license. This repository only has data
> (hashes, results) and tools. You download the image from `dl.google.com`, the tools verify and extract.
> (The infrastructure — Berberis — is open source in AOSP, but only with a riscv64 front-end: the ARM one is not public, so
> the translator cannot be rebuilt from source.)

## Which image to use

| build (`libndk_translation.so`) | in the SDK images (`google_apis_playstore`, x86_64) | Loop Sort (Unity IL2CPP) |
|---|---|---|
| `fa529513…` (3,893,208 B) | **`x86_64-35-ext15_r01`** | **works** |
| `3f1d2639…` | `x86_64-35_r09`, `x86_64-35-ext14_r01` | **crashes** at ~11 s, inside the translator |
| `65148744…` / `f7ceaac2…` | `35_r07`+`35_r08` / `35_r06` | not tried |
| `ff473474…` / `1f3d8b1c…` | `34_r14` / `36_r07` | not tried |

Use **`x86_64-35-ext15_r01.zip`** (Android 15, platform extension 15). It is still served from
`https://dl.google.com/android/repository/sys-img/google_apis_playstore/x86_64-35-ext15_r01.zip` although Google's current
index (`sys-img2-1.xml`) only lists r09. Details: [docs/COMPATIBILITY.md](docs/COMPATIBILITY.md).

## Use

```sh
node tools/extract.js x86_64-35-ext15_r01.zip out/      # needs Docker; reads the image, writes out/system/... + out/package.json
node tools/fingerprint.js path/to/libndk_translation.so # what build is this file?
```

`out/` has the 82 files laid out as `/system` is (what each one is: [docs/FILES.md](docs/FILES.md)) and a `package.json` with the
sha256 and mode of each, which [redroid-forge](https://github.com/fogelmanjg/redroid-forge)'s `arm-translation` module verifies
before injecting them. To use it by hand: copy them into `/system` of the container **before its first start** (`docker cp`
into the created, stopped container), and start it with these boot properties:

```
ro.dalvik.vm.native.bridge=libndk_translation.so
ro.dalvik.vm.isa.arm64=x86_64
ro.dalvik.vm.isa.arm=x86
```

## How a build is identified without a database

The binary keeps, in its `CHECK failed` messages, the source file and **line number** of every internal check
(`frameworks/libs/binary_translation/native_bridge/native_bridge.cc:625`). Line numbers change with every version of the code, so
they are a fingerprint, and their growth tells which build is newer. That is how the build that works was traced to
`ext15_r01` after no hash search found it anywhere: [docs/FINDING-THE-SOURCE.md](docs/FINDING-THE-SOURCE.md).

## Contributing

Tried a game? A different image? Add it: [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md). Licensed Apache-2.0 (the tools and the data).
