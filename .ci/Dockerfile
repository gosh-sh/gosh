FROM    ubuntu:latest

ENV     EVERDEV_VERSION=1.5.1
ENV     EVERDEV_SOL_COMPILER_VERSION=0.62.0
ENV     EVERDEV_TVM_LINKER_VERSION=0.15.55
ENV     EVERDEV_TONOS_CLI_VERSION=0.34.1
ENV	DEBIAN_FRONTEND=noninteractive
ENV     NODEJS_VERSION=16.17.0
ENV     PATH=/usr/local/lib/nodejs/node-v${NODEJS_VERSION}-linux-x64/bin:${PATH}

RUN	apt update -y &&\
	apt install -y software-properties-common &&\
	apt-add-repository -y ppa:git-core/ppa &&\
	apt clean && apt update -y &&\
        apt -y install make curl wget jq libssl-dev git ca-certificates xz-utils libc-bin libc6 &&\
        curl https://get.docker.com | bash &&\
        addgroup --gid 1000 jenkins &&\
        adduser --home /home/jenkins --shell /bin/bash --uid 1000 --ingroup jenkins jenkins --disabled-password &&\
        mkdir -p /home/jenkins/.jenkins && \
        mkdir -p /home/jenkins/agent &&\
        mkdir -p /usr/local/lib/nodejs &&\
        usermod -aG docker jenkins &&\
        chown -R jenkins: /home/jenkins &&\
        chown -R jenkins: /usr/local/lib/nodejs &&\
        wget http://archive.ubuntu.com/ubuntu/pool/main/o/openssl/libssl1.1_1.1.1f-1ubuntu2_amd64.deb &&\
        dpkg -i libssl1.1_1.1.1f-1ubuntu2_amd64.deb &&\
        apt -y clean

RUN 	apt install openssl

USER    jenkins
WORKDIR	/home/jenkins

RUN     curl -O https://nodejs.org/dist/v${NODEJS_VERSION}/node-v${NODEJS_VERSION}-linux-x64.tar.xz &&\
        tar -xJvf node-v${NODEJS_VERSION}-linux-x64.tar.xz -C /usr/local/lib/nodejs &&\
        npm i -g everdev@$EVERDEV_VERSION &&\
        everdev sol set --compiler $EVERDEV_SOL_COMPILER_VERSION &&\
        everdev sol set --linker $EVERDEV_TVM_LINKER_VERSION &&\
        everdev tonos-cli set --version $EVERDEV_TONOS_CLI_VERSION