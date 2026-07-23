#!/bin/bash
ADB=/mnt/c/usr/bin/adb.exe
TARGET_DIR="/sdcard/Documents/MyHybridMobile"
$ADB shell "find \"$TARGET_DIR\" -type f -print"
