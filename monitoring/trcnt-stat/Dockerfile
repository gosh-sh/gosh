FROM node:16

RUN mkdir -p /home/node/app/node_modules && chown -R node:node /home/node/app
WORKDIR /home/node/app

COPY package*.json ./
USER node
RUN npm install

COPY --chown=node:node app.js ./

EXPOSE 9123
CMD [ "node", "./app.js" ]
