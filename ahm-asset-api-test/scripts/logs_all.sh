#!/bin/bash
DEVICE=$1
ADB=/mnt/c/usr/bin/adb.exe
PACKAGENAME=com.example.app
$ADB logcat -T "$(date "+%m-%d %H:%M:%S.0")"

