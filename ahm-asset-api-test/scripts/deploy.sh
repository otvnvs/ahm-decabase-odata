#!/bin/bash
set -e
npm run dist
./scripts/push.sh
./scripts/restart.sh
