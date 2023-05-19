import ReactMarkdown from 'react-markdown'
import hljs from 'highlight.js'
import { classNames } from 'react-gosh'
import { Buffer } from 'buffer'
import { useEffect, useMemo, useState } from 'react'
import rehypeRaw from 'rehype-raw'
import { useBlobComments } from '../../../hooks/codecomment.hooks'
import { toast } from 'react-toastify'
import { ToastError } from '../../Toast'
import LineNumber from './LineNumber'
import LineContent from './LineContent'
import { useOutletContext } from 'react-router-dom'
import { TDaoLayoutOutletContext } from '../../../pages/DaoLayout'
import { FormikHelpers } from 'formik'

type TBlobPreviewProps = {
    address?: string
    filename?: string
    commit?: string
    value?: string | Buffer
    className?: string
    commentsOn?: boolean
}

const BlobPreview = (props: TBlobPreviewProps) => {
    const {
        address,
        filename = '',
        value = '',
        commit = '',
        className,
        commentsOn = false,
    } = props
    const { dao } = useOutletContext<TDaoLayoutOutletContext>()
    const {
        threads,
        selectedLines,
        commentFormLine,
        getThreads,
        toggleThread,
        hoverThread,
        submitComment,
        toggleLineSelection,
        toggleLineForm,
        resetLinesSelection,
        resetThreads,
    } = useBlobComments({
        dao: dao.adapter,
        objectAddress: address,
        filename,
        commits: [commit],
    })
    const [mouseDown, setMouseDown] = useState<boolean>(false)

    const onAddCommentSubmit = async (
        values: { comment: string },
        helpers: FormikHelpers<any>,
    ) => {
        try {
            await submitComment({
                content: values.comment,
                metadata: {
                    startLine: selectedLines.lines[0],
                    endLine: selectedLines.lines.slice(-1)[0],
                    commit,
                },
            })
            helpers.resetForm()
        } catch (e: any) {
            console.error(e.message)
            toast.error(<ToastError error={e} />)
        }
    }

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

    useEffect(() => {
        if (commentsOn) {
            getThreads()
        }

        return () => {
            resetThreads()
        }
    }, [commentsOn])

    if (Buffer.isBuffer(value)) {
        return <p className="text-gray-606060 p-3 text-sm">Binary data not shown</p>
    }
    if (filename.split('.').splice(-1)[0] === 'md') {
        return (
            <div className={classNames('markdown-body px-4 py-4', className)}>
                <ReactMarkdown rehypePlugins={[rehypeRaw]}>{value || ''}</ReactMarkdown>
            </div>
        )
    }
    return (
        <table
            className="code-table w-full text-xs"
            onMouseLeave={() => setMouseDown(false)}
        >
            <tbody>
                {highlighted.map((line, index) => {
                    const number = index + 1
                    const tdContent = !line || line === '</span>' ? '&nbsp;' : line
                    const lineThreads = threads.items.filter(
                        (item) => item.startLine === number,
                    )
                    return (
                        <tr
                            key={index}
                            id={`code-line-${number}`}
                            className={classNames(
                                selectedLines.lines?.indexOf(number) >= 0
                                    ? 'bg-yellow-faedcc'
                                    : null,
                            )}
                        >
                            <LineNumber
                                commentsOn={commentsOn}
                                num={number}
                                threads={lineThreads.slice(0, 2)}
                                threadIconProps={{
                                    onClick: (e) => {
                                        const data = (e.target as any).dataset
                                        toggleThread(data.id)
                                    },
                                    onMouseEnter: (e) => {
                                        const data = (e.target as any).dataset
                                        hoverThread(data.id, true)
                                    },
                                    onMouseLeave: (e) => {
                                        const data = (e.target as any).dataset
                                        hoverThread(data.id, false)
                                    },
                                }}
                                lineNumberProps={{
                                    onClick: () => {
                                        toggleLineSelection(number, commit)
                                    },
                                    onMouseDown: () => {
                                        toggleLineSelection(number, commit)
                                        setMouseDown(true)
                                    },
                                    onMouseUp: () => setMouseDown(false),
                                    onMouseEnter: () => {
                                        if (mouseDown) {
                                            toggleLineSelection(number, commit, {
                                                multiple: mouseDown,
                                            })
                                        }
                                    },
                                }}
                            />
                            <LineContent
                                commentsOn={commentsOn}
                                content={tdContent}
                                showForm={commentFormLine.line === number}
                                containerProps={{
                                    onMouseEnter: () => setMouseDown(false),
                                }}
                                commentButtonProps={{
                                    onClick: () => toggleLineForm(number, commit),
                                }}
                                onCommentFormReset={resetLinesSelection}
                                onCommentFormSubmit={onAddCommentSubmit}
                            />
                        </tr>
                    )
                })}
            </tbody>
        </table>
    )
}

export default BlobPreview
