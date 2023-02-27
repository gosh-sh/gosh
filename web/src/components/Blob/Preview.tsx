import ReactMarkdown from 'react-markdown'
import hljs from 'highlight.js'
import { classNames } from 'react-gosh'
import { Buffer } from 'buffer'
import { useEffect, useMemo, useState } from 'react'
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

    const fileext = useMemo(() => {
        const splitted = filename.split('.')
        return splitted.length === 1 ? undefined : splitted.splice(-1)[0]
    }, [filename])

    const highlighted = useMemo(() => {
        if (Buffer.isBuffer(value)) return []

        const aliases = fileext ? [fileext] : undefined
        const content = hljs.highlightAuto(value, aliases).value

        /* Highlight.js wraps comment blocks inside <span class="hljs-comment"></span>.
           However, when the multi-line comment block is broken down into diffirent
           table rows, only the first row, which is appended by the <span> tag, is
           highlighted. The following code fixes it by appending <span> to each line
           of the comment block. */
        const commentPattern = /<span class="hljs-comment">(.|\n)*?<\/span>/g
        const adaptedContent = content.replace(commentPattern, (data) => {
            return data.replace(/\r?\n/g, () => {
                return '\n<span class="hljs-comment">'
            })
        })

        return adaptedContent.split(/\r?\n/)
    }, [value, fileext])

    const getHighlightedCodeBlock = () => {
        const contentTable = highlighted
            .map((line, index) => {
                const number = index + 1
                const trClass = number === selectedLine ? 'code-line--selected' : ''
                const tdContent = !line || line === '</span>' ? '&nbsp;' : line

                return [
                    `<tr id="code-line-${number}" class="code-line ${trClass}">`,
                    `<td class="code-line__number">`,
                    `<a href="#L${number}" data-pseudo-content="${number}"/>`,
                    '</td>',
                    `<td class="code-line__content">${tdContent}</td>`,
                    '</tr>',
                ].join('')
            })
            .join('')

        return [
            '<pre class="overflow-y-hidden">',
            `<code><table class="code-table w-full">${contentTable}</table></code>`,
            '</pre>',
        ].join('')
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
            className={classNames('relative text-sm', className)}
            dangerouslySetInnerHTML={{
                __html: getHighlightedCodeBlock(),
            }}
        />
    )
}

export default BlobPreview
