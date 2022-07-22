# Check out https://hub.docker.com/_/node to select a new base image
FROM node:16.6 as build

# Set to a non-root built-in user `node`
USER node

# Create app directory (with user `node`)
RUN mkdir -p /home/node/app

WORKDIR /home/node/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY --chown=node package*.json ./

RUN yarn install --silent

# Bundle app source code
COPY --chown=node . .

RUN npm run build  --silent

# Bind to all network interfaces so that it can be mapped to the host OS
FROM nginx:1.15

RUN rm /etc/nginx/conf.d/default.conf
RUN rm /etc/nginx/nginx.conf

COPY --from=build /home/node/app/build /usr/share/nginx/html

COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
