# syntax=docker/dockerfile:1.4.3

FROM denoland/deno:alpine-1.28.3
WORKDIR /app/node_modules/@eversdk/lib-web
COPY --link node_modules/@eversdk/lib-web/index.js ./
COPY --link node_modules/@eversdk/lib-web/eversdk.wasm ./
WORKDIR /app
COPY --link src src
COPY --link bin bin
RUN \
    --mount=type=cache,target=/deno-dir,sharing=locked \
    deno cache src/_deps.ts
