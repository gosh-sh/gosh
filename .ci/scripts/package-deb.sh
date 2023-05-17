#!/bin/bash

PKG_NAME="git-remote-gosh"
BINARIES=("git-remote-gosh" "git-remote-gosh_v1_0_0" "git-remote-gosh_v2_0_0" "git-remote-gosh_v3_0_0" "git-remote-gosh_v4_0_0")
DISPATCHER_FILE="dispatcher.ini"

# Create necessary directories
mkdir -p "${PKG_NAME}/DEBIAN"
mkdir -p "${PKG_NAME}/usr/local/bin"
mkdir -p "${PKG_NAME}/usr/local/share/git-remote-gosh"

# Copy binaries into package
for binary in "${BINARIES[@]}"; do
    cp "linux-amd64/${binary}" "${PKG_NAME}/usr/local/bin/"
done

# Copy dispatcher.ini into package
cp "linux-amd64/${DISPATCHER_FILE}" "${PKG_NAME}/usr/local/bin"

# Create control file
cat << EOF > "${PKG_NAME}/DEBIAN/control"
Package: ${PKG_NAME}
Version: 4.1.20
Section: custom
Priority: optional
Architecture: amd64
Maintainer: GOSH <hr@gosh.sh>
Description: Git remote helper for GOSH repositories.
EOF

# Build Debian package (binary package)
dpkg-deb --build "${PKG_NAME}"