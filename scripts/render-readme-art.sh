#!/usr/bin/env bash
# Renders the README images in docs/images from docs/brand/readme-art.html.
# Needs the docs/ folder served on :8791 (python -m http.server 8791 --directory docs)
# and Microsoft Edge or Chrome (set BROWSER to override).
set -euo pipefail
cd "$(dirname "$0")/.."
# Prefer Playwright's headless shell (built for screenshots); Edge's launcher goes silent mid-update.
SHELL_BIN=$(ls "$HOME"/AppData/Local/ms-playwright/chromium_headless_shell-*/*/chrome-headless-shell.exe 2>/dev/null | head -1)
BROWSER="${BROWSER:-${SHELL_BIN:-/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe}}"
PROFILE="$(cygpath -m "$(mktemp -d)" 2>/dev/null || mktemp -d)"
render() { # name width height [extra flags]
  timeout 90 "$BROWSER" --headless=new --disable-gpu --hide-scrollbars --user-data-dir="$PROFILE" \
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
# Social preview (GitHub Settings -> Social preview, and the site's og:image): exactly 1280x640.
timeout 90 "$BROWSER" --headless=new --disable-gpu --hide-scrollbars --user-data-dir="$PROFILE" \
  --window-size=1280,640 --force-device-scale-factor=1 --virtual-time-budget=6000 \
  --screenshot="$PWD/docs/images/social-preview.png" "http://localhost:8791/brand/readme-art.html?p=social" >/dev/null 2>&1
echo "docs/images/social-preview.png"
# Site icons from docs/assets/favicon.svg (the site's gradient book mark).
timeout 90 "$BROWSER" --headless=new --disable-gpu --user-data-dir="$PROFILE" --window-size=32,32 --default-background-color=00000000 \
  --screenshot="$PWD/docs/assets/favicon-32.png" "http://localhost:8791/assets/favicon.svg" >/dev/null 2>&1
timeout 90 "$BROWSER" --headless=new --disable-gpu --user-data-dir="$PROFILE" --window-size=180,180 --default-background-color=0a0816ff \
  --screenshot="$PWD/docs/assets/apple-touch-icon.png" "http://localhost:8791/assets/favicon.svg" >/dev/null 2>&1
echo "docs/assets/favicon-32.png docs/assets/apple-touch-icon.png"
