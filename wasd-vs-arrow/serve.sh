#!/bin/sh
# Starts the game on http://localhost:8790 and opens it in your browser. Add --lan to play on an iPad too.
cd "$(dirname "$0")"
PORT="${PORT:-8790}"
(sleep 0.6 && open "http://localhost:$PORT") &
exec python3 serve.py "$PORT" "$@"
