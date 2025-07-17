#!/bin/bash
VERSION_NUMBER=$(sed -n "s/\* Version: \(.*\)$/\1/p" ./wp-museum.php | tr -d '[:space:]')
BASE_RELEASE_DIR="./release"
SUB_RELEASE_DIR="wp-museum"
RELEASE_DIR="${BASE_RELEASE_DIR}/${SUB_RELEASE_DIR}"
RELEASE_FILE="${SUB_RELEASE_DIR}.zip"
SRC_DIR="./src"
BLOCKS_BUILD_DIR="./build"
REACT_DIR="${BASE_RELEASE_DIR}/${SUB_RELEASE_DIR}/react"

echo "Building version ${VERSION_NUMBER} for release..."
echo "Release directory: ${RELEASE_DIR}"
echo "Release file: ${RELEASE_FILE}"

if [ ! -d $BASE_RELEASE_DIR ]
then
	mkdir $BASE_RELEASE_DIR
	if [ ! -d $BASE_RELEASE_DIR ]
	then
		echo "Release directory (${BASE_RELEASE_DIR} does not exist. Exiting."
		exit 2
	fi
fi

if [ ! -d $RELEASE_DIR ]
then
	mkdir $RELEASE_DIR
	if [ ! -d $RELEASE_DIR ]
	then
		echo "Failed to create ${RELEASE_DIR}. Exiting"
		exit 2
	fi
fi

if [ ! -d $REACT_DIR ]
then
	mkdir $REACT_DIR
	if [ ! -d $REACT_DIR ]
	then
		echo "Failed to create ${REACT_DIR}. Exiting"
		exit 2
	fi
fi

if [ ! -d $BLOCKS_BUILD_DIR ]
then
	echo "Blocks build directory (${BLOCKS_BUILD_DIR}) does not exist. Exiting."
	rmdir $RELEASE_DIR
	exit 2
fi

rm -rf $BLOCKS_BUILD_DIR
echo "Building blocks..."
npm run build
if [ ! "$(ls -A ${BLOCKS_BUILD_DIR})" ]
then
	echo "Blocks failed to build. Exiting."
	rmdir $RELEASE_DIR
	exit 2
fi

echo "Copying files to release directory..."
cp ./wp-museum.php $RELEASE_DIR
cp -r ./build/* $REACT_DIR
cp -r ./src/* $RELEASE_DIR

echo "Setting DEV_BUILD to false..."
sed -i '' 's/const DEV_BUILD = true/const DEV_BUILD = false/' $RELEASE_DIR/wp-museum.php

echo "Creating release .zip file."
cd $BASE_RELEASE_DIR
zip -r $RELEASE_FILE $SUB_RELEASE_DIR
cd ..
echo "Created ${BASE_RELEASE_DIR}/${RELEASE_FILE}"

echo "Tagging release..."
git tag -a ${VERSION_NUMBER} -m "Release ${VERSION_NUMBER}"
git push origin --tags

read -p 'Delete release directory (y/n)? ' yn
if [ $yn = 'y' ] || [ $yn = 'Y' ]
then
	rm -r ${RELEASE_DIR}
fi

echo "Done."
