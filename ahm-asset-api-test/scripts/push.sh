#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -f "$SCRIPT_DIR/push_sandbox.sh" ]; then
    bash "$SCRIPT_DIR/push_sandbox.sh"
else
    echo "Warning: Companion script not found at $SCRIPT_DIR/push_sandbox.sh"
fi
if [ -f "$SCRIPT_DIR/push_public.sh" ]; then
    bash "$SCRIPT_DIR/push_public.sh"
else
    echo "Warning: Companion script not found at $SCRIPT_DIR/push_public.sh"
fi
