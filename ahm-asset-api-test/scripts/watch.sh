#!/bin/bash

# Target observation coordinates (Project Root)
WEB_ASSETS_DIR="./"

# Application Package & Remote Paths
APP_PACKAGE="com.example.app"
TARGET_WORKSPACE_BASE="/sdcard/Documents/MyHybridMobile/www"
TARGET_SANDBOX_BASE="files/www"

# Executable Path Binaries
ADB="/mnt/c/usr/bin/adb.exe"

# ANSI Color Codes
CLR_RESET="\033[0m"
CLR_INFO="\033[1;34m"    # Bold Blue
CLR_SUCCESS="\033[1;32m" # Bold Green
CLR_WARN="\033[1;33m"    # Bold Yellow
CLR_ERROR="\033[1;31m"   # Bold Red

echo "==================================================="
echo -e "${CLR_INFO}FULL SYNCHRONIZATION LIVE MONITORING DAEMON ACTIVE${CLR_RESET}"
echo "==================================================="
echo "Monitoring: Create, Update, and Delete actions."
echo "Press [CTRL+C] to terminate the live loop."
echo "---------------------------------------------------"

# Trackers mapping file paths to timestamps
declare -A WEB_FILE_TIMESTAMPS

# Helper function to find valid files while completely pruning ignored paths
find_valid_files() {
    find "$WEB_ASSETS_DIR" \
        \( -path "*/node_modules" -o -path "*/.git" \) -prune \
        -o -type f -not -name ".*.swp" -print0
}

# Initialize tracking database for existing assets
while IFS= read -r -d '' f; do
    clean_key="${f#./}"
    WEB_FILE_TIMESTAMPS["$clean_key"]=$(stat -c %Y "$f")
done < <(find_valid_files)

while true; do
    # Create a temporary local array to track active files in the current loop iteration
    declare -A ACTIVE_FILES_SNAPSHOT

    # ---------------------------------------------------------
    # SCAN PHASE: DETECT CREATIONS AND UPDATES
    # ---------------------------------------------------------
    while IFS= read -r -d '' current_file; do
        clean_key="${current_file#./}"
        ACTIVE_FILES_SNAPSHOT["$clean_key"]=1
        
        current_time=$(stat -c %Y "$current_file" 2>/dev/null || echo 0)
        last_time=${WEB_FILE_TIMESTAMPS["$clean_key"]}

        # Case A: Brand New File Created OR Case B: Existing File Updated
        if [ -z "$last_time" ] || [ "$current_time" -gt "$last_time" ]; then
            WEB_FILE_TIMESTAMPS["$clean_key"]=$current_time
            
            REMOTE_WORKSPACE_FILE="$TARGET_WORKSPACE_BASE/$clean_key"
            REMOTE_SANDBOX_FILE="$TARGET_SANDBOX_BASE/$clean_key"
            REMOTE_WORKSPACE_DIR=$(dirname "$REMOTE_WORKSPACE_FILE")
            REMOTE_SANDBOX_DIR=$(dirname "$REMOTE_SANDBOX_FILE")

            if [ -z "$last_time" ]; then
                echo -e "\n${CLR_SUCCESS}[NEW FILE DETECTED] Creating: $clean_key${CLR_RESET}"
            else
                echo -e "\n${CLR_SUCCESS}[ASSET MODIFIED] Syncing Delta: $clean_key${CLR_RESET}"
            fi
            
            # Step 1: Update Public Workspace Staging
            $ADB shell "mkdir -p '$REMOTE_WORKSPACE_DIR'"
            $ADB push "$current_file" "$REMOTE_WORKSPACE_FILE" > /dev/null

            # Step 2: Push safely into Secure App Sandbox Environment
            $ADB shell "run-as $APP_PACKAGE mkdir -p '$REMOTE_SANDBOX_DIR'"
            $ADB shell "run-as $APP_PACKAGE cp '$REMOTE_WORKSPACE_FILE' '$REMOTE_SANDBOX_FILE'"

            # Step 3: Dispatch refresh event signal
            echo "Broadcasting ACTION_RELOAD_WEBVIEW..."
            $ADB shell am broadcast -a "$APP_PACKAGE.ACTION_RELOAD_WEBVIEW" > /dev/null
            echo -e "${CLR_SUCCESS}-> Push Complete!${CLR_RESET}"
            echo -e "\a"
	    beep -t bell --release=10
        fi
    done < <(find_valid_files)

    # ---------------------------------------------------------
    # PURGE PHASE: DETECT DELETIONS
    # ---------------------------------------------------------
    for tracked_file in "${!WEB_FILE_TIMESTAMPS[@]}"; do
        # If a file is in our database but wasn't found during the scan phase, it was deleted
        if [ -z "${ACTIVE_FILES_SNAPSHOT["$tracked_file"]}" ]; then
            echo -e "\n${CLR_WARN}[FILE DELETION DETECTED] Removing: $tracked_file${CLR_RESET}"
            
            REMOTE_WORKSPACE_FILE="$TARGET_WORKSPACE_BASE/$tracked_file"
            REMOTE_SANDBOX_FILE="$TARGET_SANDBOX_BASE/$tracked_file"

            # Step 1: Wipe file from public staging area
            $ADB shell "rm -f '$REMOTE_WORKSPACE_FILE'"

            # Step 2: Wipe file inside the application workspace sandbox
            $ADB shell "run-as $APP_PACKAGE rm -f '$REMOTE_SANDBOX_FILE'"

            # Step 3: Remove from our local tracker loop database
            unset WEB_FILE_TIMESTAMPS["$tracked_file"]

            # Step 4: Dispatch reload signal to drop cache resources
            echo "Broadcasting ACTION_RELOAD_WEBVIEW..."
            $ADB shell am broadcast -a "$APP_PACKAGE.ACTION_RELOAD_WEBVIEW" > /dev/null
            echo -e "${CLR_WARN}-> Remote Cleanup Complete!${CLR_RESET}"
            echo -e "\a"
        fi
    done

    sleep 0.8
done

