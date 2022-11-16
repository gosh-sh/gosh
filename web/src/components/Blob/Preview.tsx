import ReactMarkdown from 'react-markdown'
import hljs from 'highlight.js'
import { classNames } from 'react-gosh'
import { Buffer } from 'buffer'

type TBlobPreviewProps = {
    filename?: string
    value?: string | Buffer
    className?: string
}

const BlobPreview = (props: TBlobPreviewProps) => {
    const { filename = '', value = '', className } = props

    const createHighlightedCodeBlock = (content: string, language?: string[]) => {
        let lineNumber = 0
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
            .map((lineContent) => {
                return `<tr>
                    <td class='line-number' data-pseudo-content=${++lineNumber}></td>
                    <td>${lineContent}</td>
                  </tr>`
            })
            .join('')

        return `<pre><code><table class='code-table'>${contentTable}</table></code></pre>`
    }

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
