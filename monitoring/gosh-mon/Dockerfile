FROM node:16-bullseye

RUN apt-get update
RUN apt-get install -y ca-certificates fonts-liberation libasound2 libatk-bridge2.0-0 libatk1.0-0 \
    libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgbm1 libgcc1 libglib2.0-0 libgtk-3-0 libnspr4 \
    libnss3 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 \
    libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 lsb-release wget xdg-utils git
RUN npm install -g npm
RUN apt-get install -y cargo

RUN mkdir -p /home/node/app/node_modules && \
    mkdir -p /home/node/app/data && \
    chown -R node:node /home/node/app
WORKDIR /home/node/app
COPY package.json ./

RUN ln -s /home/node/app/data/git-remote-gosh /usr/bin/git-remote-gosh

USER node
RUN npm install

COPY --chown=node:node app ./app

EXPOSE 9600
CMD [ "node", "./app/app.js" ]
