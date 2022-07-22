# syntax=docker/dockerfile:1.3

FROM node:latest

WORKDIR /app
COPY . /app
RUN npm i && npm -g i typescript && tsc
ENTRYPOINT [ "node", "cli" ]
CMD [ "--help" ]
