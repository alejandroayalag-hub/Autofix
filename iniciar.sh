#!/bin/bash
cd "$(dirname "$0")/backend"
node src/index.js &
sleep 1
xdg-open http://localhost:3002 2>/dev/null || open http://localhost:3002 2>/dev/null
wait
