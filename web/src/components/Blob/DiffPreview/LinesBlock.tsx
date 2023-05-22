import { DiffBlock, DiffLine } from 'diff2html/lib/types'
import { useBlobComments } from '../../../hooks/codecomment.hooks'
import classNames from 'classnames'
import { getIdenticonAvatar } from '../../../helpers'
import { Field, Form, Formik, FormikHelpers } from 'formik'
import { FormikTextarea } from '../../Formik'
import { Button } from '../../Form'
import { useOutletContext } from 'react-router-dom'
import { TDaoLayoutOutletContext } from '../../../pages/DaoLayout'
import { toast } from 'react-toastify'
import { ToastError } from '../../Toast'
import commentBtn from '../../../assets/images/comment-add.png'
import { TCommit } from 'react-gosh'
import { useMemo } from 'react'

type TLinesBlockProps = {
    filename: string
    block: DiffBlock
    commit: TCommit
    address: string
    commentsOn?: boolean
    mouseDown: boolean
    setMouseDown: React.Dispatch<React.SetStateAction<boolean>>
}

const bgStyle: { [type: string]: string } = {
    insert: 'bg-[#ddffdd]',
    delete: 'bg-[#fee8e9]',
    selected: 'bg-yellow-faedcc',
}

const tdBorderStyle: { [type: string]: string } = {
    insert: 'border-x border-x-[#b4e2b4]',
    delete: 'border-x border-x-[#e9aeae]',
}

const getThreadAvatar = (seed: string) => {
    return getIdenticonAvatar({ seed, radius: 20 }).toDataUriSync()
}

const LinesBlock = (props: TLinesBlockProps) => {
    const { commentsOn, filename, block, commit, address, mouseDown, setMouseDown } =
        props
    const { dao } = useOutletContext<TDaoLayoutOutletContext>()
    const {
        threads,
        selectedLines,
        commentFormLine,
        toggleThread,
        hoverThread,
        toggleLineSelection,
        resetLinesSelection,
        toggleLineForm,
        submitComment,
    } = useBlobComments({
        dao: dao.adapter,
        objectAddress: address,
        filename,
        commits: [commit.parents[0].name, commit.name],
    })

    const commits = useMemo(() => {
        return {
            prev: commit.parents[0].name,
            curr: commit.name,
        }
    }, [commit.name])

    const getLineCommit = (line: DiffLine) => {
        const { oldNumber, newNumber } = line
        if (oldNumber === newNumber || newNumber) {
            return { number: newNumber!, commit: commits.curr }
        }
        return { number: oldNumber!, commit: commits.prev }
    }

    const getLineThreads = (line: DiffLine) => {
        const { number, commit } = getLineCommit(line)
        return threads.items.filter((item) => {
            return item.commit === commit && item.startLine === number
        })
    }

    const isLineSelected = (line: DiffLine) => {
        if (!selectedLines.lines) {
            return false
        }

        const { commit, lines } = selectedLines
        const { oldNumber = -1, newNumber = -1 } = line
        const data = getLineCommit(line)

        if (oldNumber === newNumber && lines.indexOf(oldNumber) >= 0) {
            return true
        }
        if (commit === data.commit && lines.indexOf(data.number) >= 0) {
            return true
        }
        return false
    }

    const isLineFormOpen = (line: DiffLine) => {
        const { number, commit } = getLineCommit(line)
        const { line: _number, commit: _commit } = commentFormLine
        return isLineSelected(line) && commit === _commit && number === _number
    }

    const onLineToggle = (line: DiffLine) => {
        const { number, commit } = getLineCommit(line)
        toggleLineSelection(number, commit, { multiple: mouseDown })
    }

    const onLineFormToggle = (line: DiffLine) => {
        const { number, commit } = getLineCommit(line)
        toggleLineForm(number, commit)
    }

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
                    commit: selectedLines.commit,
                },
            })
            helpers.resetForm()
        } catch (e: any) {
            console.error(e.message)
            toast.error(<ToastError error={e} />)
        }
    }

    return (
        <>
            <tr key={block.header}>
                <td className="p-0 pr-2 min-w-[8rem] border-r border-r-gray-e6edff"></td>
                <td className="pl-4 text-black/20">
                    <div className="pl-4 font-mono" data-pseudo-content={block.header} />
                </td>
            </tr>
            {block.lines.map((line, i) => {
                const token = line.content.slice(0, 1)
                const content = line.content.slice(1)
                const threads = getLineThreads(line)
                return (
                    <tr
                        key={i}
                        className={classNames(
                            isLineSelected(line)
                                ? bgStyle['selected']
                                : bgStyle[line.type],
                        )}
                    >
                        <td
                            className={classNames(
                                'p-0 pr-2 w-[8rem]',
                                line.type === 'context'
                                    ? 'border-r border-r-gray-e6edff'
                                    : tdBorderStyle[line.type],
                            )}
                        >
                            <div className="flex flex-nowrap items-center">
                                <div className="basis-1/3 flex flex-nowrap items-center justify-start">
                                    {threads.slice(0, 2).map((thread, i) => (
                                        <div
                                            key={i}
                                            className={classNames(
                                                'rounded-full w-4 h-4 bg-contain bg-center bg-no-repeat',
                                                'cursor-pointer bg-gray-fafafd overflow-hidden',
                                                'hover:scale-150 transition-transform',
                                                thread.isActive ? 'scale-150' : null,
                                                i > 0 ? `-translate-x-${i}` : null,
                                            )}
                                        >
                                            <img
                                                src={getThreadAvatar(
                                                    thread.content.username,
                                                )}
                                                className="w-full"
                                                onClick={() => {
                                                    toggleThread(thread.id)
                                                }}
                                                onMouseEnter={() => {
                                                    hoverThread(thread.id, true)
                                                }}
                                                onMouseLeave={() => {
                                                    hoverThread(thread.id, false)
                                                }}
                                            />
                                        </div>
                                    ))}
                                </div>
                                <div className="basis-1/3">
                                    <button
                                        data-pseudo-content={line.oldNumber}
                                        className="w-full text-xs font-mono text-end cursor-pointer text-black/20 hover:text-black"
                                        onClick={() => onLineToggle(line)}
                                        onMouseDown={() => {
                                            onLineToggle(line)
                                            setMouseDown(true)
                                        }}
                                        onMouseUp={() => setMouseDown(false)}
                                        onMouseEnter={() => {
                                            if (mouseDown) {
                                                onLineToggle(line)
                                            }
                                        }}
                                    />
                                </div>
                                <div className="basis-1/3">
                                    <button
                                        data-pseudo-content={line.newNumber}
                                        className="w-full text-xs font-mono text-end cursor-pointer text-black/20 hover:text-black"
                                        onClick={() => onLineToggle(line)}
                                        onMouseDown={() => {
                                            onLineToggle(line)
                                            setMouseDown(true)
                                        }}
                                        onMouseUp={() => setMouseDown(false)}
                                        onMouseEnter={() => {
                                            if (mouseDown) {
                                                onLineToggle(line)
                                            }
                                        }}
                                    />
                                </div>
                            </div>
                        </td>
                        <td
                            className="relative group pl-4"
                            onMouseEnter={() => setMouseDown(false)}
                        >
                            {dao.details.isAuthMember && commentsOn && (
                                <div
                                    className={classNames(
                                        'absolute hidden left-0 rounded-full w-5 h-5 mx-2 cursor-pointer',
                                        'group-hover:block hover:scale-125 transition-transform',
                                    )}
                                    onClick={() => {
                                        onLineFormToggle(line)
                                    }}
                                >
                                    <img src={commentBtn} className="w-full" />
                                </div>
                            )}
                            <div className="pl-4">
                                <pre>
                                    <span data-pseudo-content={token} className="mr-1" />
                                    {content}
                                </pre>
                            </div>
                            <div
                                className={classNames(
                                    isLineFormOpen(line)
                                        ? 'max-h-screen opacity-100'
                                        : 'max-h-0 opacity-0',
                                    'w-full md:w-1/2 overflow-hidden bg-white',
                                    'border border-gray-e6edff rounded-xl transition-all duration-300',
                                )}
                            >
                                <Formik
                                    initialValues={{ comment: '' }}
                                    onSubmit={onAddCommentSubmit}
                                >
                                    {({ isSubmitting }) => (
                                        <Form>
                                            <Field
                                                name="comment"
                                                component={FormikTextarea}
                                                placeholder="Say something"
                                                rows={2}
                                                className="!border-0"
                                            />
                                            <div className="border-t border-gray-e6edff flex items-center justify-between">
                                                <div className="grow"></div>
                                                <div className="grow text-end">
                                                    <Button
                                                        variant="custom"
                                                        type="button"
                                                        className="text-xs text-gray-7c8db5"
                                                        onClick={resetLinesSelection}
                                                    >
                                                        Close
                                                    </Button>
                                                    <Button
                                                        variant="custom"
                                                        type="submit"
                                                        className="text-xs text-gray-7c8db5"
                                                        disabled={isSubmitting}
                                                        isLoading={isSubmitting}
                                                    >
                                                        Submit
                                                    </Button>
                                                </div>
                                            </div>
                                        </Form>
                                    )}
                                </Formik>
                            </div>
                        </td>
                    </tr>
                )
            })}
        </>
    )
}

export default LinesBlock