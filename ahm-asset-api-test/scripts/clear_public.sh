#!/bin/bash
set -e

# --- CONFIGURATION ---
TARGET_DIR="/sdcard/Documents/MyHybridMobile"
ADB=/mnt/c/usr/bin/adb.exe

echo "---------------------------------------------------"
echo "Cleaning public staging directory on device..."
echo "---------------------------------------------------"

# Verify that the directory path variable isn't empty before running a destructive command
if [ -z "$TARGET_DIR" ] || [ "$TARGET_DIR" == "/" ]; then
    echo "Error: Safety check failed. Target directory variable is invalid."
    exit 1
fi

# Wipe out the specific public staging ground
if $ADB shell "rm -rf '$TARGET_DIR/www'"; then
    echo "Successfully cleared: $TARGET_DIR/www/"
else
    echo "Notice: Target folder did not exist or could not be removed."
fi

echo "---------------------------------------------------"
echo "Public Cleanup Complete."
echo "---------------------------------------------------"

