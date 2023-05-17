import { useRecoilState, useResetRecoilState } from 'recoil'
import { blobCommentsAtom } from '../store/comments.state'
import { IGoshDaoAdapter, IGoshTopic } from 'react-gosh/dist/gosh/interfaces'
import { useEffect } from 'react'
import {
    GoshError,
    MAX_PARALLEL_READ,
    TCodeCommentThreadGetResult,
    executeByChunk,
    getAllAccounts,
    useUser,
} from 'react-gosh'

export function useBlobComments(params: {
    dao: IGoshDaoAdapter
    filename: string
    objectAddress?: string
    commitName?: string
}) {
    const { dao, objectAddress, filename, commitName } = params
    const { user } = useUser()
    const [threads, setThreads] = useRecoilState(blobCommentsAtom)
    const resetThreads = useResetRecoilState(blobCommentsAtom)

    const getThreads = async () => {
        if (!objectAddress || !commitName) {
            return
        }

        const codeHash = await dao.getCodeCommetThreadCodeHash({
            daoAddress: dao.getAddress(),
            objectAddress,
            commitName,
            filename,
        })
        const accounts = await getAllAccounts({
            filters: [`code_hash: {eq:"${codeHash}"}`],
        })
        const items = await executeByChunk(
            accounts,
            MAX_PARALLEL_READ,
            async ({ id }) => {
                const thread = await dao.getCodeCommentThread({ address: id })
                const comments = await getMessages(thread.account, {})
                const createdBy = await dao.getGosh().getUserByAddress(thread.createdBy)
                return { thread, createdBy, comments }
            },
        )
        console.debug('Items', items)

        setThreads((state) => ({
            ...state,
            [filename]: {
                ...state[filename],
                threads: items
                    .sort((a, b) => {
                        return a.thread.metadata.startLine - b.thread.metadata.endLine
                    })
                    .map(({ thread, createdBy, comments }, index) => ({
                        id: thread.address,
                        type: 'context',
                        startLine: thread.metadata.startLine,
                        endLine: thread.metadata.endLine,
                        prev: items[index - 1]?.thread.address,
                        next: items[index + 1]?.thread.address,
                        isOpen: false,
                        isActive: false,
                        content: {
                            id: '',
                            username: createdBy.name,
                            datetime: new Date(thread.createdAt * 1000).toLocaleString(),
                            content: thread.content,
                        },
                        comments: {
                            isFetching: false,
                            cursor: comments.cursor,
                            hasNext: comments.hasNext || false,
                            items: comments.items,
                        },
                    })),
            },
        }))
    }

    const hoverThread = (id: string, hover: boolean) => {
        const thread = threads[filename].threads.find((item) => item.id === id)
        if (!thread) {
            return
        }

        const lines: never[] = []
        for (let i = thread.startLine; i <= thread.endLine; i++) {
            lines.push(i as never)
        }
        setThreads((state) => ({
            ...state,
            [filename]: {
                ...state[filename],
                selectedLines: { type: thread.type, lines: hover ? lines : [] },
                threads: state[filename].threads.map((item) => {
                    if (item.id !== thread.id) {
                        return { ...item, isActive: false }
                    }
                    return { ...item, isActive: !item.isActive }
                }),
            },
        }))
    }

    const toggleThread = (id: string) => {
        setThreads((state) => ({
            ...state,
            [filename]: {
                ...state[filename],
                threads: state[filename].threads.map((item) => {
                    if (item.id !== id) {
                        return { ...item, isOpen: false, isActive: false }
                    }
                    return { ...item, isOpen: !item.isOpen, isActive: !item.isActive }
                }),
            },
        }))
    }

    const toggleLineSelection = (
        line: number,
        options?: { multiple?: boolean; type?: 'context' | 'prev' | 'curr' },
    ) => {
        const { multiple, type = 'context' } = options || {}
        if (multiple) {
            setThreads((state) => ({
                ...state,
                [filename]: {
                    ...state[filename],
                    selectedLines: {
                        type,
                        lines: [...state[filename].selectedLines.lines, line],
                    },
                },
            }))
        } else {
            setThreads((state) => ({
                ...state,
                [filename]: {
                    ...state[filename],
                    selectedLines: { type, lines: [line] },
                },
            }))
        }
    }

    const toggleLineForm = (line: number) => {
        const foundIndex = threads[filename].selectedLines.lines.findIndex(
            (v) => v === line,
        )
        const position = foundIndex >= 0 ? threads[filename].selectedLines.lines[0] : line
        setThreads((state) => ({
            ...state,
            [filename]: {
                ...state[filename],
                selectedLines: {
                    type: 'context',
                    lines:
                        foundIndex < 0 ? [position] : state[filename].selectedLines.lines,
                },
                commentFormLine: position,
            },
        }))
    }

    const resetLinesSelection = () => {
        setThreads((state) => ({
            ...state,
            [filename]: {
                ...state[filename],
                selectedLines: { type: 'context', lines: [] },
                commentFormLine: 0,
            },
        }))
    }

    const submitComment = async (params: {
        id?: string | null
        content: string
        metadata?: TCodeCommentThreadGetResult['metadata'] | null
    }) => {
        const { id, content, metadata } = params
        if (id) {
            const { transaction } = await dao.createCodeComment({
                threadAddress: id,
                message: content,
            })

            // Update state
            setThreads((state) => ({
                ...state,
                [filename]: {
                    ...state[filename],
                    threads: state[filename].threads.map((item) => {
                        if (item.id !== id) {
                            return item
                        }
                        return {
                            ...item,
                            comments: {
                                ...item.comments,
                                items: [
                                    ...item.comments.items,
                                    {
                                        id: transaction.out_msgs[0],
                                        username: user.username!,
                                        datetime: new Date().toLocaleString(),
                                        content,
                                    },
                                ],
                            },
                        }
                    }),
                },
            }))
        } else {
            if (!objectAddress) {
                throw new GoshError('`object` is required')
            }
            if (!commitName) {
                throw new GoshError('`commit` is required')
            }
            if (!metadata) {
                throw new GoshError('`metadata` is required')
            }
            const thread = await dao.createCodeCommentThread({
                name: '',
                object: objectAddress,
                content,
                metadata,
                commit: commitName,
                filename,
            })

            // Update state
            setThreads((state) => ({
                ...state,
                [filename]: {
                    ...state[filename],
                    threads: [
                        ...state[filename].threads,
                        {
                            id: thread.address,
                            type: 'context',
                            startLine: metadata?.startLine || 0,
                            endLine: metadata?.endLine || 0,
                            prev: state[filename].threads.slice(-1)[0].id,
                            next: null,
                            isOpen: false,
                            isActive: false,
                            content: {
                                id: '',
                                username: user.username!,
                                datetime: new Date().toLocaleString(),
                                content,
                            },
                            comments: {
                                isFetching: false,
                                hasNext: false,
                                items: [],
                            },
                        },
                    ],
                },
            }))
            resetLinesSelection()
        }
    }

    const getMessages = async (
        thread: IGoshTopic,
        params: { from?: string; count?: number },
    ) => {
        // setThreads((state) => ({
        //     ...state,
        //     [filename]: {
        //         ...state[filename],
        //         threads: state[filename].threads.map((item) => {
        //             if (item.id !== thread.address) {
        //                 return item
        //             }
        //             return { ...item, comments: { ...item.comments, isFetching: true } }
        //         }),
        //     },
        // }))

        const { messages, cursor, hasNext } = await thread.getMessages(
            {
                msgType: ['IntIn'],
                allow_latest_inconsistent_data: true,
                limit: params.count || 5,
                cursor: params.from,
                node: ['created_at'],
            },
            true,
            false,
        )
        const comments = await Promise.all(
            messages
                .filter(({ decoded }) => decoded && decoded.name === 'acceptMessage')
                .sort((a, b) => (a.message.created_lt > b.message.created_lt ? 1 : -1))
                .map(async ({ message, decoded }) => ({
                    id: message.id.replace('message/', ''),
                    username: (
                        await dao.getGosh().getUserByAddress(decoded.value.pubaddr)
                    ).name,
                    datetime: new Date(message.created_at * 1000).toLocaleString(),
                    content: decoded.value.message,
                })),
        )

        return { items: comments, cursor, hasNext }

        // setThreads((state) => ({
        //     ...state,
        //     [filename]: {
        //         ...state[filename],
        //         threads: state[filename].threads.map((item) => {
        //             if (item.id !== thread.address) {
        //                 return item
        //             }

        //             const comments = messages
        //                 .filter(
        //                     ({ decoded }) => decoded && decoded.name === 'acceptMessage',
        //                 )
        //                 .map(({ message, decoded }) => ({
        //                     id: message.id.replace('message/', ''),
        //                     username: 'todo',
        //                     datetime: 'todo',
        //                     content: decoded.value.message,
        //                 }))
        //             return {
        //                 ...item,
        //                 comments: {
        //                     isFetching: false,
        //                     cursor,
        //                     hasNext: hasNext || false,
        //                     items: [...comments, ...item.comments.items],
        //                 },
        //             }
        //         }),
        //     },
        // }))
    }

    useEffect(() => {
        const hasState = Object.keys(threads).indexOf(filename) >= 0
        if (!hasState) {
            setThreads((state) => ({
                ...state,
                [filename]: {
                    ...state[filename],
                    selectedLines: { type: 'context', lines: [] },
                    commentFormLine: 0,
                    threads: [],
                },
            }))
        }
    }, [filename])

    return {
        items: threads[filename]?.threads || [],
        selectedLines: threads[filename]?.selectedLines || {},
        commentFormLine: threads[filename]?.commentFormLine || 0,
        getThreads,
        hoverThread,
        toggleThread,
        submitComment,
        toggleLineSelection,
        toggleLineForm,
        resetLinesSelection,
        resetThreads,
    }
}
