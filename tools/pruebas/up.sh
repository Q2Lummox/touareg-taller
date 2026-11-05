#!/bin/bash
curl -s -o /dev/null localhost:8767/ || (cd "$(dirname "$0")/../.." && setsid nohup python3 -m http.server 8767 >/dev/null 2>&1 < /dev/null & sleep 1)
