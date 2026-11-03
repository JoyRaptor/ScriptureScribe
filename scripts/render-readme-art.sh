#!/usr/bin/env bash
# Renders the README images in docs/images from docs/brand/readme-art.html.
# Needs the docs/ folder served on :8791 (python -m http.server 8791 --directory docs)
# and Microsoft Edge or Chrome (set BROWSER to override).
set -euo pipefail
cd "$(dirname "$0")/.."
BROWSER="${BROWSER:-/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe}"
PROFILE="$(mktemp -d)"
render() { # name width height [extra flags]
  "$BROWSER" --headless=new --disable-gpu --hide-scrollbars --user-data-dir="$PROFILE" \
    --window-size="$2,$3" --force-device-scale-factor=1.25 --virtual-time-budget=6000 "${@:4}" \
    --screenshot="$PWD/docs/images/readme-$1.png" "http://localhost:8791/brand/readme-art.html?p=$1" >/dev/null 2>&1
  echo "docs/images/readme-$1.png"
}
render banner   1280 620
render hover    1280 640
render bible    1280 640
render research 1280 760
render cards    1280 830
render button   680  170 --default-background-color=00000000
