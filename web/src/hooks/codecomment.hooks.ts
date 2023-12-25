import { useRecoilState, useResetRecoilState, useSetRecoilState } from 'recoil'
import { blobCommentsAtom, blobsCommentsAiAtom } from '../store/comments.state'
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
  commits?: string[]
  multiple?: boolean
}) {
  const { dao, objectAddress, filename, commits = [], multiple } = params
  const { user } = useUser()
  const [threads, setThreads] = useRecoilState(blobCommentsAtom)
  const resetThreads = useResetRecoilState(blobCommentsAtom)
  const setAiComments = useSetRecoilState(blobsCommentsAiAtom)

  const getThreads = async () => {
    if (!objectAddress || !commits.length) {
      return
    }

    setThreads((state) => ({
      ...state,
      [filename]: {
        ...state[filename],
        threads: {
          isFetching: true,
          items: [],
        },
      },
    }))

    const codeHashList = await Promise.all(
      commits.map(async (name) => {
        return dao.getCodeCommetThreadCodeHash({
          daoAddress: dao.getAddress(),
          objectAddress,
          commitName: name,
          filename,
        })
      }),
    )
    const accounts = await getAllAccounts({
      filters: [`code_hash: {in: ${JSON.stringify(codeHashList)} }`],
    })
    const items = await executeByChunk(accounts, MAX_PARALLEL_READ, async ({ id }) => {
      const thread = await dao.getCodeCommentThread({ address: id })
      const comments = await _getMessages(thread.account, {})
      const createdBy = await dao.getGosh().getUserByAddress(thread.createdBy)
      return { thread, createdBy, comments }
    })
    console.debug('Items', items)

    setThreads((state) => ({
      ...state,
      [filename]: {
        ...state[filename],
        threads: {
          isFetching: false,
          items: items
            .sort((a, b) => {
              return a.thread.metadata.startLine - b.thread.metadata.endLine
            })
            .map(({ thread, createdBy, comments }, index) => ({
              id: thread.address,
              snapshot: thread.metadata.snapshot,
              commit: thread.metadata.commit,
              startLine: thread.metadata.startLine,
              endLine: thread.metadata.endLine,
              prev: items[index - 1]?.thread.address,
              next: items[index + 1]?.thread.address,
              isResolved: thread.isResolved,
              isOpen: false,
              isActive: false,
              content: {
                id: '',
                username: createdBy.name,
                datetime: thread.createdAt * 1000,
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
      },
    }))
  }

  const hoverThread = (id: string, hover: boolean) => {
    const thread = threads[filename].threads.items.find((item) => item.id === id)
    if (!thread) {
      return
    }

    const lines = _getThreadLines({ start: thread.startLine, end: thread.endLine })
    const hasOpenedThreads = Object.keys(threads).some((filename) => {
      return threads[filename].threads.items.some((v) => v.isOpen)
    })
    setThreads((state) => ({
      ...state,
      [filename]: {
        ...state[filename],
        selectedLines: hasOpenedThreads
          ? state[filename].selectedLines
          : { commit: thread.commit, lines: hover ? lines : [] },
        threads: {
          ...state[filename].threads,
          items: state[filename].threads.items.map((item) => {
            if (item.id !== thread.id) {
              return { ...item, isActive: false }
            }
            return { ...item, isActive: !item.isActive }
          }),
        },
      },
    }))
  }

  const toggleThread = (id: string) => {
    const thread = threads[filename].threads.items.find((item) => item.id === id)
    if (!thread) {
      return
    }

    const lines = _getThreadLines({ start: thread.startLine, end: thread.endLine })
    setThreads((state) => ({
      ...state,
      [filename]: {
        ...state[filename],
        selectedLines: {
          commit: thread.commit,
          lines: !thread.isOpen ? lines : [],
        },
        threads: {
          ...state[filename].threads,
          items: state[filename].threads.items.map((item) => {
            if (item.id !== thread.id) {
              return { ...item, isOpen: false, isActive: false }
            }
            return { ...item, isOpen: !item.isOpen, isActive: !item.isActive }
          }),
        },
      },
    }))
  }

  const toggleLineSelection = (
    line: number,
    commit: string,
    options?: { multiple?: boolean },
  ) => {
    const { multiple } = options || {}
    if (multiple) {
      setThreads((state) => ({
        ...state,
        [filename]: {
          ...state[filename],
          selectedLines: {
            commit,
            lines: [...state[filename].selectedLines.lines, line],
          },
        },
      }))
    } else {
      setThreads((state) => ({
        ...state,
        [filename]: {
          ...state[filename],
          selectedLines: { commit, lines: [line] },
        },
      }))
    }
  }

  const toggleLineForm = (line: number, commit: string) => {
    const foundIndex = threads[filename].selectedLines.lines.findIndex((v) => v === line)
    const position = foundIndex >= 0 ? threads[filename].selectedLines.lines[0] : line
    setThreads((state) => ({
      ...state,
      [filename]: {
        ...state[filename],
        selectedLines: {
          commit,
          lines: foundIndex < 0 ? [position] : state[filename].selectedLines.lines,
        },
        commentFormLine: { commit, line: position },
      },
    }))
  }

  const resetLinesSelection = () => {
    setThreads((state) => ({
      ...state,
      [filename]: {
        ...state[filename],
        selectedLines: { commit: '', lines: [] },
        commentFormLine: { commit: '', line: 0 },
      },
    }))
  }

  const resolveThread = async (id: string, resolved: boolean) => {
    await dao.resolveCodeCommentThread({ address: id, resolved })
    setThreads((state) => ({
      ...state,
      [filename]: {
        ...state[filename],
        threads: {
          ...state[filename].threads,
          items: state[filename].threads.items.map((item) => {
            if (item.id !== id) {
              return item
            }
            return { ...item, isResolved: resolved }
          }),
        },
      },
    }))
  }

  const submitComment = async (params: {
    id?: string | null
    content: string
    metadata?: TCodeCommentThreadGetResult['metadata'] | null
  }) => {
    const { id, content, metadata } = params
    let _thread: string
    if (id) {
      _thread = id
      const { transaction } = await dao.createCodeComment({
        threadAddress: id,
        message: content,
      })
      await resolveThread(id, false)

      // Update state
      setThreads((state) => ({
        ...state,
        [filename]: {
          ...state[filename],
          threads: {
            ...state[filename].threads,
            items: state[filename].threads.items.map((item) => {
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
                      datetime: Date.now(),
                      content,
                    },
                  ],
                },
              }
            }),
          },
        },
      }))
    } else {
      if (!objectAddress) {
        throw new GoshError('`object` is required')
      }
      if (!metadata) {
        throw new GoshError('`metadata` is required')
      }
      const thread = await dao.createCodeCommentThread({
        name: '',
        object: objectAddress,
        content,
        metadata,
        commit: metadata.commit,
        filename,
      })
      _thread = thread.address

      // Update state
      setThreads((state) => ({
        ...state,
        [filename]: {
          ...state[filename],
          threads: {
            ...state[filename].threads,
            items: [
              ...state[filename].threads.items,
              {
                id: thread.address,
                snapshot: metadata.snapshot,
                commit: metadata.commit,
                startLine: metadata?.startLine || 0,
                endLine: metadata?.endLine || 0,
                prev: state[filename].threads.items.slice(-1)[0]?.id || null,
                next: null,
                isResolved: false,
                isOpen: false,
                isActive: false,
                content: {
                  id: '',
                  username: user.username!,
                  datetime: Date.now(),
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
        },
      }))
      resetLinesSelection()
    }

    // Add new comments to separate storage
    // Used for commenting multiple files for AI
    if (multiple) {
      const item = { filename, comment: content }
      let meta: any
      if (id) {
        const thread = threads[filename].threads.items.find((item) => item.id === id)
        if (thread) {
          meta = {
            snapshot: thread.snapshot,
            thread: _thread,
            startLine: thread.startLine,
            endLine: thread.endLine,
          }
        }
      } else if (metadata) {
        meta = {
          snapshot: metadata.snapshot,
          thread: _thread,
          startLine: metadata.startLine,
          endLine: metadata.endLine,
        }
      }

      // Update AI comments
      if (meta) {
        setAiComments((state) => [...state, { ...item, ...meta }])
      }
    }
  }

  const getCommentsNext = async (threadId: string) => {
    const thread = threads[filename].threads.items.find((item) => item.id === threadId)
    if (!thread) {
      return
    }

    setThreads((state) => ({
      ...state,
      [filename]: {
        ...state[filename],
        threads: {
          ...state[filename].threads,
          items: state[filename].threads.items.map((item) => {
            if (item.id !== thread.id) {
              return item
            }
            return {
              ...item,
              comments: { ...item.comments, isFetching: true },
            }
          }),
        },
      },
    }))

    const { account } = await dao.getCodeCommentThread({ address: thread.id })
    const result = await _getMessages(account, { from: thread.comments.cursor })

    setThreads((state) => ({
      ...state,
      [filename]: {
        ...state[filename],
        threads: {
          ...state[filename].threads,
          items: state[filename].threads.items.map((item) => {
            if (item.id !== thread.id) {
              return item
            }
            return {
              ...item,
              comments: {
                isFetching: false,
                cursor: result.cursor,
                hasNext: result.hasNext || false,
                items: [...result.items, ...item.comments.items],
              },
            }
          }),
        },
      },
    }))
  }

  const _getMessages = async (
    thread: IGoshTopic,
    params: { from?: string; count?: number },
  ) => {
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
          username: (await dao.getGosh().getUserByAddress(decoded.value.pubaddr)).name,
          datetime: message.created_at * 1000,
          content: decoded.value.message,
        })),
    )
    return { items: comments, cursor, hasNext }
  }

  const _getThreadLines = (params: { start: number; end: number }) => {
    const { start, end } = params
    const lines: number[] = []
    for (let i = start; i <= end; i++) {
      lines.push(i)
    }
    return lines
  }

  useEffect(() => {
    const hasState = Object.keys(threads).indexOf(filename) >= 0
    if (!hasState) {
      setThreads((state) => ({
        ...state,
        [filename]: {
          ...state[filename],
          selectedLines: { commit: '', lines: [] },
          commentFormLine: { commit: '', line: 0 },
          threads: { isFetching: true, items: [] },
        },
      }))
    }
  }, [filename])

  return {
    threads: threads[filename]?.threads || { isFetching: false, items: [] },
    selectedLines: threads[filename]?.selectedLines || {},
    commentFormLine: threads[filename]?.commentFormLine || 0,
    getThreads,
    hoverThread,
    toggleThread,
    resolveThread,
    getCommentsNext,
    submitComment,
    toggleLineSelection,
    toggleLineForm,
    resetLinesSelection,
    resetThreads,
  }
}
