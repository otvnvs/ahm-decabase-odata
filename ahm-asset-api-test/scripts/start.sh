#!/bin/bash
DEVICE=$1
ADB=/mnt/c/usr/bin/adb.exe 
PACKAGENAME=com.example.app
echo starting $PACKAGENAME
if [ -z "$DEVICE" ]
then
	$ADB devices|grep -v attached|grep device|cut -f1|while read DEVICE;do
		echo $ADB -s "$DEVICE" shell "monkey -p $PACKAGENAME -c android.intent.category.LAUNCHER 1 > /dev/null 2>&1"
		./scripts/start.sh "$DEVICE"
	done
else
	echo starting android application
	$ADB -s "$DEVICE" shell "monkey -p $PACKAGENAME -c android.intent.category.LAUNCHER 1 > /dev/null 2>&1"
fi
