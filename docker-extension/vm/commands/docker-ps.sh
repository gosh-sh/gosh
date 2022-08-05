#!/bin/sh

curl --unix-socket /var/run/docker.sock "http://localhost/v1.41/containers/json"

mkdir /workdir
cd /workdir

cat > /workdir/Dockerfile<< EOF
FROM alpine:latest
RUN apk --no-cache add curl

EOF

docker build .

