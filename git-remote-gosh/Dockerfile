# syntax=docker/dockerfile:1.4.1

FROM rust:1.62.1-alpine3.15 as builder

WORKDIR /build
COPY --link Cargo.toml Cargo.toml
COPY --link crates crates
COPY --link src src
COPY --link resources resources

RUN apk add libc-dev openssl-dev
RUN OPENSSL_STATIC=1 cargo build --release --bin git-remote-gosh 
RUN cp ./target/release/git-remote-gosh .


FROM alpine:3.15.5
RUN apk add git
RUN mkdir -p /foo
COPY --from=builder /build/target/release/* /foo/

# ENV GOSH_TRACE=1
WORKDIR /workdir
ENTRYPOINT [ "git" ]
