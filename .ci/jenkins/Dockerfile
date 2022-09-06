
FROM jenkins/jenkins:lts
COPY plugins.txt /usr/share/jenkins/ref/plugins.txt
USER root
RUN curl https://get.docker.com | bash &&\
    jenkins-plugin-cli --plugin-file /usr/share/jenkins/ref/plugins.txt &&\
    usermod -aG docker jenkins
USER jenkins
