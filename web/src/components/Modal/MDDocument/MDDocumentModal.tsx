import { Dialog } from '@headlessui/react'
import { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import rehypeRaw from 'rehype-raw'

type TMDDocumentModalProps = {
  title?: string
  path?: string
}

const MDDocumentModal = (props: TMDDocumentModalProps) => {
  const { title, path } = props
  const [content, setContent] = useState<any>(null)

  useEffect(() => {
    setContent('')
    const getContent = async () => {
      const file = await import(`./content/${path}.md`)
      const response = await fetch(file.default)
      const markdown = await response.text()
      setContent(markdown)
    }
    getContent()
  }, [path])

  return (
    <Dialog.Panel className="rounded-xl bg-white px-8 py-8 w-full max-w-2xl">
      <Dialog.Title className="text-3xl text-center font-semibold">{title}</Dialog.Title>

      <div className="markdown-body mt-8">
        <ReactMarkdown rehypePlugins={[rehypeRaw]}>{content}</ReactMarkdown>
      </div>
    </Dialog.Panel>
  )
}

export { MDDocumentModal }
