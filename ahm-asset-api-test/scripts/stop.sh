#!/bin/bash
DEVICE=$1
ADB=/mnt/c/usr/bin/adb.exe
PACKAGENAME=com.example.app
echo stopping $PACKAGENAME
if [ -z "$DEVICE" ]
then
	$ADB devices|grep -v attached|grep device|cut -f1|while read DEVICE;do
		./scripts/stop.sh $DEVICE
	done
else
	echo stopping android application
	$ADB -s "$DEVICE" shell "am force-stop $PACKAGENAME"
fi
