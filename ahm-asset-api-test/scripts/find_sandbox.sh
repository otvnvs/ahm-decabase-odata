#!/bin/bash
ADB=/mnt/c/usr/bin/adb.exe
PACKAGE_NAME=com.example.app
$ADB shell "run-as $PACKAGE_NAME sh -c 'find \$(pwd) -type f'"
