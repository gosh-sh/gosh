# syntax=docker/dockerfile:1.4.2

FROM rust:bullseye as builder

WORKDIR /build

# NOTE:
# We can use APT cache here because it's just a builder container
# Don't use cache in the result container
RUN <<EOF
    set -e
    rm -f /etc/apt/apt.conf.d/docker-clean
    echo 'Binary::apt::APT::Keep-Downloaded-Packages "true";' > /etc/apt/apt.conf.d/keep-cache
EOF
RUN \
    --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    apt-get update && apt-get install -yq build-essential cmake

RUN \
    --mount=type=cache,target=/usr/local/cargo/registry \
    --mount=type=cache,target=/usr/local/cargo/git \
    --mount=type=cache,target=/target,sharing=private \
    --mount=type=bind,target=./ \
    cargo install --path ./ --target-dir=/target


FROM debian:bullseye-slim
RUN apt-get update && apt-get install -yq --no-install-recommends git libssl1.1 libc6 ca-certificates
COPY --from=builder /usr/local/cargo/bin/git-remote-gosh /usr/local/bin/git-remote-gosh

# ENV GOSH_TRACE=1
WORKDIR /workdir
ENTRYPOINT [ "git" ]
