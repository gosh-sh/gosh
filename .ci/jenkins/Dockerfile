
FROM jenkins/jenkins:lts
COPY plugins.txt /usr/share/jenkins/ref/plugins.txt
USER root
RUN curl https://get.docker.com | bash &&\
    jenkins-plugin-cli --plugin-file /usr/share/jenkins/ref/plugins.txt &&\
    usermod -aG docker jenkins &&\
    wget https://github.com/gosh-sh/gosh/releases/latest/download/git-remote-gosh-amd64 &&\
	chmod +x git-remote-gosh-amd64 &&\
	cp git-remote-gosh-amd64 /usr/local/bin/git-remote-gosh
    
USER jenkins
