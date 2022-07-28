FROM    ubuntu:focal

ENV     EVERDEV_VERSION=latest
ENV     EVERDEV_SOL_COMPILER_VERSION=0.61.2
ENV     EVERDEV_TVM_LINKER_VERSION=latest
ENV     EVERDEV_TONOS_CLI_VERSION=latest
ENV     RUSTUP_HOME=/opt/rust 
ENV     CARGO_HOME=/opt/cargo 
ENV     PATH=/opt/cargo/bin:$PATH
ENV     DEBIAN_FRONTEND=noninteractive

RUN     apt -y update &&\
        apt -y install make cmake curl build-essential openssl pkg-config libssl-dev libtool gcc-mingw-w64 &&\
        curl -fsSL https://deb.nodesource.com/setup_18.x | sh &&\
        mkdir -m777 /opt/rust /opt/cargo &&\
        curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y  &&\ 
        rustup target add aarch64-apple-darwin &&\
        rustup target add x86_64-pc-windows-gnu &&\
        curl https://get.docker.com | bash &&\
        apt-get install -y nodejs &&\
        npm i -g everdev@$EVERDEV_VERSION &&\
        everdev sol set --compiler $EVERDEV_SOL_COMPILER_VERSION &&\
        everdev sol set --linker $EVERDEV_TVM_LINKER_VERSION &&\
        everdev tonos-cli set --version $EVERDEV_TONOS_CLI_VERSION

RUN     addgroup --gid 1000 jenkins &&\
        adduser --home /home/jenkins --shell /bin/bash --uid 1000 --ingroup jenkins jenkins --disabled-password &&\
        mkdir -p /home/jenkins/.jenkins && \
        mkdir -p /home/jenkins/agent &&\
        usermod -aG docker jenkins &&\
        chown -R jenkins: /home/jenkins

USER    jenkins
RUN     everdev sol set --compiler $EVERDEV_SOL_COMPILER_VERSION &&\
        everdev sol set --linker $EVERDEV_TVM_LINKER_VERSION
USER    root

