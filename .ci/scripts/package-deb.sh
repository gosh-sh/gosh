#!/bin/bash

PKG_NAME="git-remote-gosh"
BINARIES=("git-remote-gosh" "git-remote-gosh_v1_0_0" "git-remote-gosh_v2_0_0" "git-remote-gosh_v3_0_0" "git-remote-gosh_v4_0_0")
DISPATCHER_FILE="dispatcher.ini"
ARCHITECTURES=("amd64" "arm64")
DIR=$1

for arch in "${ARCHITECTURES[@]}"; do
    # Create necessary directories
    mkdir -p "${PKG_NAME}_${arch}/DEBIAN"
    mkdir -p "${PKG_NAME}_${arch}/usr/local/bin"
    mkdir -p "${PKG_NAME}_${arch}/usr/local/share/git-remote-gosh"

    # Copy binaries into package
    for binary in "${BINARIES[@]}"; do
        cp "$DIR/linux-${arch}/${binary}" "${PKG_NAME}_${arch}/usr/local/bin/"
    done

    # Copy dispatcher.ini into package
    cp "$DIR/linux-${arch}/${DISPATCHER_FILE}" "${PKG_NAME}_${arch}/usr/local/bin"

    # Create control file
    cat << EOF > "${PKG_NAME}_${arch}/DEBIAN/control"
Package: ${PKG_NAME}
Version: 4.1.21
Section: custom
Priority: optional
Architecture: ${arch}
Maintainer: GOSH <hr@gosh.sh>
Description: Git remote helper for GOSH repositories.
EOF

    # Build Debian package (binary package)
    dpkg-deb --build "${PKG_NAME}_${arch}"
done