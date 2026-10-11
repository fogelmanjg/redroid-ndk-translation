# The 82 files

What `tools/extract.js` takes from the image and where it goes in the container (`/system` is the container's root `system`).

| where | what |
|---|---|
| `/system/lib64/libndk_translation.so` | the translator (ARM64 → x86_64) |
| `/system/lib64/libberberis_exec_region.so` | its runtime: executable memory regions |
| `/system/lib64/libndk_translation_proxy_lib*.so` (20) | one proxy per system library an ARM app can call: it forwards the call to the **native** x86_64 library (EGL, GLES, Vulkan, audio, binder, media…) so the GPU and the system are not emulated |
| `/system/lib64/arm64/*.so` (56) | the ARM side of the system: an ARM `libc`, `libm`, `libdl`, `liblog`… that the translated code is linked against |
| `/system/bin/arm64/app_process64`, `linker64` | ARM's process and dynamic linker (must be executable; the translator opens `app_process64` when it starts) |
| `/system/etc/cpuinfo.arm64.txt` | what the translated code sees as `/proc/cpuinfo` |
| `/system/etc/ld.config.arm64.txt` | the ARM linker's namespaces |

Left out on purpose: `binfmt_misc` registration and the program runner (`ndk_translation_program_runner_binfmt_misc_arm64`), the
32-bit files. binfmt_misc is one table for the whole host, shared by every container: a container must not touch it, and it is only
needed to run ARM *command-line programs*, not apps.

Boot properties (container arguments; redroid turns `ro.*` arguments into properties):

```
ro.dalvik.vm.native.bridge=libndk_translation.so
ro.dalvik.vm.isa.arm64=x86_64
ro.dalvik.vm.isa.arm=x86
```

If the container's Android already declares `ro.dalvik.vm.native.bridge=0` or `libnb.so` in its `build.prop`, the argument wins; the
`init: Could not set 'ro.dalvik.vm.native.bridge' ... Read-only property was already set` line is that file losing.
