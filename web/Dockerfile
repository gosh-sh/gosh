FROM node:18.10.0-alpine

COPY ./web /workdir 
COPY ./react-gosh /react-gosh

ENV REACT_APP_ISDOCKEREXT=true
ENV BUILD_PATH=/dest
ENV ENV=prod

WORKDIR /workdir

RUN cd ../react-gosh && npm install && npm run build && \
	  cd - && npm install && npm update react-gosh && npm run wasm && cd run-if-modified && npm link && \
	  cd - && npm link run-if-modified

CMD npm run start:${ENV}