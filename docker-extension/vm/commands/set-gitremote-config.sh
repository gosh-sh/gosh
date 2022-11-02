#!/bin/sh

CONFIG=$1

mkdir -p /root/.gosh
echo $CONFIG > /root/.gosh/config.json
