#!/bin/bash
npm run dist&&./scripts/push.sh && ./scripts/restart.sh &&npm run start
