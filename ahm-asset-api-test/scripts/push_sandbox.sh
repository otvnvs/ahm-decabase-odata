#!/bin/bash
set -e

# --- CONFIGURATION ---
APP_PACKAGE="com.example.app"
ADB=/mnt/c/usr/bin/adb.exe
TARGET_PRIVATE_DIR="/data/user/0/$APP_PACKAGE/files"

echo "---------------------------------------------------"
echo "Pushing build assets directly to private sandbox..."
echo "---------------------------------------------------"

# 1. Verify that the production build directory is present locally
if [ ! -d "./dist" ]; then
    echo "Error: Local ./dist directory not found! Run npm run build first."
    exit 1
fi

# 2. Re-create the www folder directly inside the private app partition
echo "Cleaning and preparing private target directory..."
$ADB shell "run-as $APP_PACKAGE rm -rf files/www && run-as $APP_PACKAGE mkdir -p files/www"

# 3. Stream local assets through ADB exec-in and unpack them inside the secure partition
echo "Streaming ./dist contents straight into $TARGET_PRIVATE_DIR/www/..."
# We use exec-in to provide a clean byte stream, and run-as to navigate to the secure directory before untarring
tar -cC ./dist . | $ADB exec-in "run-as $APP_PACKAGE tar -xC files/www"

# 4. Correct permissions inside the private folder to guarantee WebView readability
echo "Enforcing read/write permissions on sandbox assets..."
$ADB shell "run-as $APP_PACKAGE chmod -R 777 files/www"

# 5. Signal the active WebView layer to execute a live reload interface transition
echo "Sending reload broadcast to WebView layer..."
$ADB shell am broadcast -a "$APP_PACKAGE.ACTION_RELOAD_WEBVIEW" > /dev/null

echo "---------------------------------------------------"
echo "Direct Sandbox Sync Complete!"
echo "---------------------------------------------------"

