#!/bin/bash
set -e

# --- CONFIGURATION ---
APP_PACKAGE="com.example.app"
# Staging ground in a globally readable temporary path
TARGET_DIR="/data/local/tmp/MyHybridMobile"
ADB=/mnt/c/usr/bin/adb.exe

echo "---------------------------------------------------"
echo "Instantly syncing build production assets via ADB..."
echo "---------------------------------------------------"

# 1. Verify that the production build directory is present locally
if [ ! -d "./dist" ]; then
    echo "Error: Local ./dist directory not found! Run npm run build first."
    exit 1
fi

# 2. Reset and recreate target staging directories on the Android device
echo "Preparing staging directories on device..."
$ADB shell "rm -rf '$TARGET_DIR' && mkdir -p '$TARGET_DIR/www'"

# 3. Push the contents inside ./dist directly to the device root www folder
echo "Pushing ./dist folder contents to $TARGET_DIR/www/..."
$ADB push ./dist/. "$TARGET_DIR/www" > /dev/null 2>&1

# CRITICAL EMULATOR COMPATIBILITY STEP:
# Open up permissions on the staging folder so your unprivileged app user can read and copy it
echo "Opening staging permissions for application context..."
$ADB shell "chmod -R 777 $TARGET_DIR"

# 4. Deploy everything inside the secure app sandbox using 'run-as'
echo "Deploying to public storage..."
# Ensure the files directory exists in the application storage
$ADB shell "run-as $APP_PACKAGE mkdir -p files"
# Safely clear old app asset files inside the app sandbox boundary
$ADB shell "run-as $APP_PACKAGE rm -rf files/www"
# Perform the copy operation *as the app user*, reading from the open /data/local/tmp path
$ADB shell "run-as $APP_PACKAGE cp -r $TARGET_DIR/www files/"

# 5. Signal the active WebView layer to execute a live reload interface transition
echo "Sending reload broadcast to WebView layer..."
$ADB shell am broadcast -a "$APP_PACKAGE.ACTION_RELOAD_WEBVIEW" > /dev/null

echo "---------------------------------------------------"
echo "Sync Complete! Build assets updated inside public."
echo "---------------------------------------------------"

