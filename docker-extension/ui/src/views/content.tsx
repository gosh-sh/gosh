import { useState, useEffect, useRef } from "react";
import Container from '@mui/material/Container';
import { useParams, useLocation } from "react-router-dom";
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';

const Content = ({title, path}: {title?: string, path?: string}) => {
  
  const { id } = useParams<{id: string}>();
  const location = useLocation();
  const ref = useRef<HTMLElement>() as React.MutableRefObject<HTMLElement>;
  const [content, setContent] = useState<any>(null);

  useEffect(() => {
    setContent('');
    const filepath = path ? path : id;
    async function getContent () {
      const file = await import(`../content/${filepath}.md`);
      const response = await fetch(file.default);
      const markdown = await response.text();
      await setContent(markdown);
    }
    getContent();
  }, [id, path]);

  useEffect(() => {
    if (location.hash && ref && ref.current && content) ref.current.querySelector(location.hash)!.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [content, location.hash]);

  if (content === null ) return (<></>);

  return (
    <Container maxWidth={false}>
      <section className="content-wrapper" ref={ref}>
        <ReactMarkdown rehypePlugins={[rehypeRaw]}>{content}</ReactMarkdown>
      </section>
    </Container>
  );
};

export default Content;
