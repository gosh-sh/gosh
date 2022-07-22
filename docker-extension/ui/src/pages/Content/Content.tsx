import { useState, useEffect, useRef } from "react";
import Container from '@mui/material/Container';
import { useParams, Navigate, useLocation } from "react-router-dom";
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import styles from './Content.module.scss';
import classnames from "classnames/bind";
// import helpFile from '../../content/help.md';

const cnb = classnames.bind(styles);

export const Content = ({title, path}: {title?: string, path?: string}) => {
  
  const { id } = useParams<{id: string}>();
  const location = useLocation();
  const ref = useRef<HTMLElement>() as React.MutableRefObject<HTMLElement>;
  const [content, setContent] = useState<any>(null);

  useEffect(() => {
    setContent('');
    async function getContent () {

      //const file = require(`./../../content/${id || path}.md`);
      // const file = await import(`../../content/${id || path}.md`);
      // const response = await fetch(file.default);
      // const markdown = await response.text();
      await setContent(`# GOSH
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
      
      - work with on-chain repository as if you use git repo with gosh helper: <link>
      - build and sign images straight from git on chain (gosh)
          - (temporary solution) as a proof of concept you can start signing images [manually](https://github.com/tonlabs/gosh/tree/main/content-signature)
          - (coming soon) build images from signed on-chain source code ([fetching smart-contracts states](https://github.com/tonlabs/gosh/tree/main/buildkit))
      - ensure you’re using trusted docker images ([authentication signature check](https://github.com/tonlabs/gosh/tree/main/docker-extension))
      `);
    }
    getContent();
  }, [id]);

  useEffect(() => {
    if (location.hash && ref && ref.current && content) ref.current.querySelector(location.hash)!.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [content, location.hash]);

  if ( id === '' ) return (<Navigate
    to={{
      pathname: "/"
    }}
  />);

  if (content === null ) return (<></>);

  return (
    <Container className={cnb("content")}>
      <h1>{title}</h1>
      <section className="content-wrapper" ref={ref}>
        <ReactMarkdown rehypePlugins={[rehypeRaw]} children={`# GOSH
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

- work with on-chain repository as if you use git repo with gosh helper: <link>
- build and sign images straight from git on chain (gosh)
    - (temporary solution) as a proof of concept you can start signing images [manually](https://github.com/tonlabs/gosh/tree/main/content-signature)
    - (coming soon) build images from signed on-chain source code ([fetching smart-contracts states](https://github.com/tonlabs/gosh/tree/main/buildkit))
- ensure you’re using trusted docker images ([authentication signature check](https://github.com/tonlabs/gosh/tree/main/docker-extension))
`}/>
      </section>
    </Container>
  );
};

export default Content;
