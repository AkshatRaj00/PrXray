#!/usr/bin/env bash
set -e

echo "[PR-XRay] Compiling C++20 Core to WebAssembly with Emscripten..."

mkdir -p ../public/wasm
mkdir -p build && cd build

emcmake cmake .. -DCMAKE_BUILD_TYPE=Release
emmake make -j$(nproc 2>/dev/null || sysctl -n hw.ncpu 2>/dev/null || echo 4)

echo "[PR-XRay] Compilation complete. Binaries placed in public/wasm/"
ls -lh ../../public/wasm/