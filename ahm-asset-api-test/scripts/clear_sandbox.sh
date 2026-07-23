#!/bin/bash
set -e

# --- CONFIGURATION ---
APP_PACKAGE="com.example.app"
ADB=/mnt/c/usr/bin/adb.exe

echo "---------------------------------------------------"
echo "Cleaning secure private app sandbox folder..."
echo "---------------------------------------------------"

# Verify that the package variable isn't empty before running run-as commands
if [ -z "$APP_PACKAGE" ]; then
    echo "Error: Safety check failed. APP_PACKAGE variable is not set."
    exit 1
fi

# Clean out the assets inside the private partition
if $ADB shell "run-as $APP_PACKAGE rm -rf files/www"; then
    echo "Successfully cleared private folder: /data/user/0/$APP_PACKAGE/files/www/"
else
    echo "Notice: Private asset folder did not exist or could not be removed."
fi

echo "---------------------------------------------------"
echo "Sandbox Cleanup Complete."
echo "---------------------------------------------------"

