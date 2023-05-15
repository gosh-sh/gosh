import { useRecoilState } from 'recoil'
import { blobCommentsAtom } from '../store/comments.state'

export function useBlobComments(filename: string) {
    const [threads, setThreads] = useRecoilState(blobCommentsAtom)

    const getThreads = async () => {
        return threads
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

    const submitComment = async () => {}

    return {
        items: threads[filename]?.threads || [],
        selectedLines: threads[filename]?.selectedLines || [],
        commentFormLine: threads[filename]?.commentFormLine || 0,
        getThreads,
        hoverThread,
        toggleThread,
        submitComment,
        toggleLineSelection,
        toggleLineForm,
        resetLinesSelection,
    }
}
