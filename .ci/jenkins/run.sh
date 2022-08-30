#!/bin/sh

docker run -d --name jenkins -p 127.0.0.1:8080:8080 -v /var/run/docker.sock:/var/run/docker.sock -v /var/jenkins_home:/var/jenkins_home jenkins:local-with-plugins
