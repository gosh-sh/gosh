#!/bin/bash

docker network create gosh-monitoring
docker network create --internal gosh-public-grafana
