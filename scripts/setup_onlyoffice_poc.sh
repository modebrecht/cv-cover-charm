#!/usr/bin/env bash
# Official pinned Document Builder SDK; one download, no Docker/server services.
set -euo pipefail
p2_target="$(realpath -m "${1:?Output directory required}")"
mkdir -p "$p2_target/sdk"
curl --fail --location --connect-timeout 10 --max-time 90 \
  https://github.com/ONLYOFFICE/DocumentBuilder/releases/download/v10.0.0/onlyoffice-documentbuilder-linux-x86_64.tar.xz \
  --output "$p2_target/builder.tar.xz"
printf '%s  %s\n' 194f348429239fbcee4d1c29861550127885facdbb700706c7bb1429a21b33e4 "$p2_target/builder.tar.xz" | sha256sum --check
tar -xJf "$p2_target/builder.tar.xz" -C "$p2_target/sdk"
p2_binary="$(find "$p2_target/sdk" -type f -name docbuilder -print -quit)"
test -n "$p2_binary"
p2_runtime="$(dirname "$p2_binary")"
chmod +x "$p2_binary"
# Match the official AppImage wrapper's font/library setup. The SDK uses the
# CI's installed Liberation fonts, also used by Chromium and LibreOffice.
printf '#!/bin/sh\nexport LD_LIBRARY_PATH="%s:${LD_LIBRARY_PATH:-}"\nexport CUSTOM_FONTS_PATH=/usr/share/fonts\nexec "%s" "$@"\n' "$p2_runtime" "$p2_binary" > "$p2_target/onlyoffice"
chmod +x "$p2_target/onlyoffice"
sha256sum "$p2_target/builder.tar.xz" > "$p2_target/SHA256SUMS"
du -sk "$p2_target/sdk"
