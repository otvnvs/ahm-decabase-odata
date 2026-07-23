#!/bin/bash
set -e

# --- CONFIGURATION ---
APP_PACKAGE="com.example.app"
ADB="/mnt/c/usr/bin/adb.exe"

# Hardcoded strict list matching your exact AndroidManifest uses-permission parameters
TARGET_PERMISSIONS=(
    "android.permission.INTERNET"
    "android.permission.ACCESS_NETWORK_STATE"
    "android.permission.CAMERA"
    "android.permission.RECORD_AUDIO"
    "android.permission.MODIFY_AUDIO_SETTINGS"
    "android.permission.VIBRATE"
    "android.permission.POST_NOTIFICATIONS"
    "android.permission.READ_EXTERNAL_STORAGE"
    "android.permission.WRITE_EXTERNAL_STORAGE"
    "android.permission.MANAGE_EXTERNAL_STORAGE"
)

# Checks if a permission is classified as an Install-Time/Normal permission
is_normal_permission() {
    case "$1" in
        "android.permission.INTERNET"|\
        "android.permission.ACCESS_NETWORK_STATE"|\
        "android.permission.MODIFY_AUDIO_SETTINGS"|\
        "android.permission.VIBRATE")
            return 0 # True
            ;;
        *)
            return 1 # False
            ;;
    esac
}

get_appops_name() {
    case "$1" in
        "android.permission.MANAGE_EXTERNAL_STORAGE") echo "MANAGE_EXTERNAL_STORAGE" ;;
        "android.permission.ACCESS_FINE_LOCATION")    echo "FINE_LOCATION" ;;
        "android.permission.ACCESS_COARSE_LOCATION")  echo "COARSE_LOCATION" ;;
        "android.permission.CAMERA")                  echo "CAMERA" ;;
        *)                                            echo "" ;;
    esac
}

print_help() {
    echo "========================================================================="
    echo "Fixed Android Manifest Security Permission Manipulation Utility Script"
    echo "========================================================================="
    echo "Usage: $0 [FLAG] [OPTIONAL VALUE]"
    echo ""
    echo "Flags:"
    echo "  -h, --help                Print this operational instruction console log"
    echo "  -a, --all                 List manifest permissions with real-time states"
    echo "  -e, --grant [PERM]        Grant an explicit manifest string permission value"
    echo "  -d, --revoke [PERM]       Revoke an explicit manifest string permission value"
    echo "  --grant-all               Bulk-grant all testing suite runtime permissions"
    echo "  --revoke-all              Bulk-revoke all testing suite runtime permissions"
}

list_all_status() {
    echo "--- SCANNING MANIFEST PERMISSIONS & REAL-TIME STATUS ---"
    
    # Scrape the global runtime dumpsys footprint once into memory to save processing time
    local dumpsys_out
    dumpsys_out=$($ADB shell dumpsys package "$APP_PACKAGE" | tr -d '\r')

    for perm in "${TARGET_PERMISSIONS[@]}"; do
        local status="DENIED"
        local appops_tag
        appops_tag=$(get_appops_name "$perm")

        if is_normal_permission "$perm"; then
            status="GRANTED (INSTALL-TIME)"
        elif [ -n "$appops_tag" ] && $ADB shell appops get "$APP_PACKAGE" "$appops_tag" 2>/dev/null | grep -E "allow|allow;" >/dev/null; then
            status="GRANTED"
        elif echo "$dumpsys_out" | grep -A 30 "runtime permissions:" | grep "$perm" | grep "granted=true" >/dev/null; then
            status="GRANTED"
        elif echo "$dumpsys_out" | grep "$perm" | grep "granted=true" >/dev/null; then
            status="GRANTED"
        fi
        echo "  Permission: $perm -> [$status]"
    done
}

# --- ARGUMENT ROUTING MATRIX ENGINE ---
if [ $# -eq 0 ]; then
    print_help
    exit 0
fi

case "$1" in
    -h|--help)
        print_help
        exit 0
        ;;
    -a|--all)
        list_all_status
        exit 0
        ;;
    -e|--grant)
        if [ -z "$2" ]; then
            echo "Error: Target permission parameter missing from invocation instruction."
            exit 1
        fi
        echo "[ADB ACTION] Granting permission: $2"
        appops_tag=$(get_appops_name "$2")
        if [ -n "$appops_tag" ]; then
            $ADB shell appops set --uid "$APP_PACKAGE" "$appops_tag" allow
        fi
        if ! is_normal_permission "$2"; then
            $ADB shell pm grant "$APP_PACKAGE" "$2" 2>/dev/null || true
        fi
        list_all_status
        exit 0
        ;;
    -d|--revoke)
        if [ -z "$2" ]; then
            echo "Error: Target permission parameter missing from invocation instruction."
            exit 1
        fi
        echo "[ADB ACTION] Revoking permission: $2"
        appops_tag=$(get_appops_name "$2")
        if [ -n "$appops_tag" ]; then
            $ADB shell appops set --uid "$APP_PACKAGE" "$appops_tag" deny
        fi
        if ! is_normal_permission "$2"; then
            $ADB shell pm revoke "$APP_PACKAGE" "$2" 2>/dev/null || true
        fi
        # App process recycle removed to keep application active for runtime testing
        list_all_status
        exit 0
        ;;
    --revoke-all)
        echo "[ADB ACTION] Initiating lockdown batch revocation across all runtime manifest definitions..."
        for perm in "${TARGET_PERMISSIONS[@]}"; do
            is_normal_permission "$perm" && continue
            appops_tag=$(get_appops_name "$perm")
            if [ -n "$appops_tag" ]; then
                $ADB shell appops set --uid "$APP_PACKAGE" "$appops_tag" deny
            fi
            $ADB shell pm revoke "$APP_PACKAGE" "$perm" 2>/dev/null || true
        done
        # App process recycle removed to keep application active for runtime testing
        list_all_status
        exit 0
        ;;
    --grant-all)
        echo "[ADB ACTION] Initiating batch grant across all runtime manifest definitions..."
        for perm in "${TARGET_PERMISSIONS[@]}"; do
            is_normal_permission "$perm" && continue
            appops_tag=$(get_appops_name "$perm")
            if [ -n "$appops_tag" ]; then
                $ADB shell appops set --uid "$APP_PACKAGE" "$appops_tag" allow
            fi
            $ADB shell pm grant "$APP_PACKAGE" "$perm" 2>/dev/null || true
        done
        list_all_status
        exit 0
        ;;
    *)
        echo "Error: Unknown argument layout instruction path detected: $1"
        print_help
        exit 1
        ;;
esac

