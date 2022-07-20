# syntax=docker/dockerfile:1.4.1

FROM rust:bullseye as builder

WORKDIR /build
# RUN --mount=type=bind,source=.,target=/src cp /src/* . && touch test && cargo install --path /src
COPY --link Cargo.toml Cargo.toml
COPY --link crates crates
COPY --link src src
COPY --link resources resources

RUN apt-get update && apt-get install -yq build-essential cmake
RUN \
    --mount=type=cache,target=/usr/local/cargo/registry \
    --mount=type=cache,target=/usr/local/cargo/git \
    --mount=type=cache,target=./target \
    cargo build --release --bin git-remote-gosh && cp ./target/release/git-remote-gosh .


FROM debian:bullseye-slim
RUN apt-get update && apt-get install -yq --no-install-recommends libssl1.1 libc6 ca-certificates
COPY --from=builder /build/git-remote-gosh /usr/local/bin/git-remote-gosh

# ENV GOSH_TRACE=1
WORKDIR /workdir
ENTRYPOINT [ "git-remote-gosh" ]
