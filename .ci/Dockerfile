FROM    ubuntu:focal

ENV     EVERDEV_VERSION=latest
ENV     EVERDEV_SOL_COMPILER_VERSION=0.61.2
ENV     EVERDEV_TVM_LINKER_VERSION=latest
ENV     EVERDEV_TONOS_CLI_VERSION=latest

RUN	apt -y update &&\
        apt -y install make curl jq libssl-dev &&\
        curl https://get.docker.com | bash &&\
	curl -fsSL https://deb.nodesource.com/setup_18.x | bash &&\
	apt -y install nodejs &&\
        npm i -g everdev@$EVERDEV_VERSION &&\
        everdev sol set --compiler $EVERDEV_SOL_COMPILER_VERSION &&\
        everdev sol set --linker $EVERDEV_TVM_LINKER_VERSION &&\
        everdev tonos-cli set --version $EVERDEV_TONOS_CLI_VERSION &&\
        apt -y clean &&\
	addgroup --gid 1000 jenkins &&\
        adduser --home /home/jenkins --shell /bin/bash --uid 1000 --ingroup jenkins jenkins --disabled-password &&\
        mkdir -p /home/jenkins/.jenkins && \
        mkdir -p /home/jenkins/agent &&\
        usermod -aG docker jenkins &&\
        chown -R jenkins: /home/jenkins

USER    jenkins
RUN     everdev sol set --compiler $EVERDEV_SOL_COMPILER_VERSION &&\
        everdev sol set --linker $EVERDEV_TVM_LINKER_VERSION
USER    root