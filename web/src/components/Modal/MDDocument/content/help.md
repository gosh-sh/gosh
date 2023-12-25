# GOSH

Secure Software Supply Chain achieved through record-setting blockchain tech, distributed programming and decentralized architecture - integrated into the same familiar git, no workflow adjustment required.

## Motivation

Software Supply Chain is a high-impact area. Yet there exists a distinctive lack of secure, trustless, verifiable, and transparent delivery of source code/binaries to developers and users in all software fields. Currently there is no industrial solution available that is not centralized and thus not dependent on the decisions of a few actors.

## Objective

Mitigate security and transparency issues arising from conventional software supply chain by providing a secure and convenient on-chain environment to operate on source code repositories.

## Architecture

Trust management system has to be built in accordance with the following principles:

1. Entities are represented by hashes (container images, git commits);
2. Anyone can add some metadata with signature to any entity;
3. Anyone can decide whose metadata to trust;
4. Chain/tree of trust: dependencies can be organized using the same technique.

## Instruments and utilities

A variety of utility tools to assist with all the aspects of the solution are under active development. A sneak peek of the tool set to be released in the upcoming months:

-   work with on-chain repository as if you use git repo with gosh helper:
    -   [Documentation](https://docs.gosh.sh/working-with-gosh/git-remote-helper)
    -   [Gosh Git Helper Releases](https://github.com/gosh-sh/gosh/releases)
-   build and sign images via `Build image` tab in each repository
-   ensure you’re using trusted docker images on [Containers page](#/containers)
