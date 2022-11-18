import ReactMarkdown from 'react-markdown'
import hljs from 'highlight.js'
import { classNames } from 'react-gosh'
import { Buffer } from 'buffer'
import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'

type TBlobPreviewProps = {
    filename?: string
    value?: string | Buffer
    className?: string
}

const BlobPreview = (props: TBlobPreviewProps) => {
    const { filename = '', value = '', className } = props
    const location = useLocation()
    const [selectedLine, setSelectedLine] = useState<number>()

    const createHighlightedCodeBlock = (content: string, language?: string[]) => {
        const highlightedContent = hljs.highlightAuto(content, language).value

        /* Highlight.js wraps comment blocks inside <span class="hljs-comment"></span>.
           However, when the multi-line comment block is broken down into diffirent
           table rows, only the first row, which is appended by the <span> tag, is
           highlighted. The following code fixes it by appending <span> to each line
           of the comment block. */
        const commentPattern = /<span class="hljs-comment">(.|\n)*?<\/span>/g
        const adaptedHighlightedContent = highlightedContent.replace(
            commentPattern,
            (data) => {
                return data.replace(/\r?\n/g, () => {
                    return '\n<span class="hljs-comment">'
                })
            },
        )

        const contentTable = adaptedHighlightedContent
            .split(/\r?\n/)
            .map((lineContent, index) => {
                const number = index + 1
                const trClass = number === selectedLine ? 'code-line--selected' : ''

                return [
                    `<tr id="code-line-${number}" class="code-line ${trClass}">`,
                    `<td class="code-line__number">`,
                    `<a href="#L${number}" data-pseudo-content="${number}"/>`,
                    '</td>',
                    `<td>${lineContent}</td>`,
                    '</tr>',
                ].join('')
            })
            .join('')

        return `<pre><code><table class="code-table w-full">${contentTable}</table></code></pre>`
    }

    useEffect(() => {
        const number = +location.hash.replace('#L', '')
        document.querySelector(`#code-line-${number}`)?.scrollIntoView({
            block: 'center',
            behavior: 'smooth',
        })
    }, [])

    useEffect(() => {
        setSelectedLine(+location.hash.replace('#L', '') || undefined)
    }, [location.hash])

    if (Buffer.isBuffer(value)) {
        return <p className="text-gray-606060 p-3 text-sm">Binary data not shown</p>
    }
    if (filename.split('.').splice(-1)[0] === 'md') {
        return (
            <div className={classNames('markdown-body px-4 py-4', className)}>
                <ReactMarkdown>{value || ''}</ReactMarkdown>
            </div>
        )
    }
    return (
        <div
            className={classNames('text-sm', className)}
            dangerouslySetInnerHTML={{ __html: createHighlightedCodeBlock(value) }}
        />
    )
}

export default BlobPreview
