#!/bin/sh
# Renders the home-screen icon (BLAZE vs DJ NOODLE) with the game's own figures and saves every size.
# Needs the dev server running (./serve.sh) and Playwright's Chromium (npx playwright install chromium).
set -e
cd "$(dirname "$0")/.."
CH=$(ls -d "$HOME"/Library/Caches/ms-playwright/chromium-*/chrome-mac-arm64/"Google Chrome for Testing.app"/Contents/MacOS/"Google Chrome for Testing" | tail -1)
PROFILE=$(mktemp -d)
"$CH" --headless=new --use-angle=swiftshader --enable-unsafe-swiftshader --hide-scrollbars --mute-audio \
  --user-data-dir="$PROFILE" --window-size=1024,1024 --virtual-time-budget=40000 \
  --screenshot=assets/icon-1024.png "http://localhost:${PORT:-8790}/?shot=icon" >/dev/null 2>&1
rm -rf "$PROFILE"
for s in 512 192 180 64 32; do sips -z $s $s assets/icon-1024.png --out assets/icon-$s.png >/dev/null; done
ls -la assets/icon-*.png
