#!/bin/sh
# Renders og/card.html to public/og.jpg (1200 x 630, JPEG to keep it light) with headless Chrome.
set -eu
cd "$(dirname "$0")"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
"$CHROME" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
  --allow-file-access-from-files --window-size=1200,630 --virtual-time-budget=8000 \
  --screenshot="$PWD/card.png" "file://$PWD/card.html" 2>/dev/null
sips -s format jpeg -s formatOptions 85 card.png --out ../public/og.jpg >/dev/null
rm card.png
echo "wrote public/og.jpg"
