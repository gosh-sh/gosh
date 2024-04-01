import { useCallback, useEffect } from 'react'
import {
  GoshError,
  MAX_PARALLEL_READ,
  TCodeCommentThreadGetResult,
  executeByChunk,
  getAllAccounts,
  useUser,
} from 'react-gosh'
import { IGoshDaoAdapter, IGoshTopic } from 'react-gosh/dist/gosh/interfaces'
import { useRecoilState, useResetRecoilState } from 'recoil'
import { blobCommentsAtom } from '../store/comments.state'

export function useBlobComments(params: {
  dao: IGoshDaoAdapter
  filename: string
  objectAddress?: string
  commits?: string[]
  initialize?: boolean
}) {
  const { dao, objectAddress, filename, commits = [], initialize } = params
  const { user } = useUser()
  const [threads, setThreads] = useRecoilState(blobCommentsAtom)
  const resetThreads = useResetRecoilState(blobCommentsAtom)

  const getThreads = useCallback(async () => {
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

    setThreads((state) => ({
      ...state,
      [filename]: {
        ...state[filename],
        threads: {
          isFetching: false,
          items: items
            .sort((a, b) => {
              const aNode = a.thread.metadata.md_metadata.md_nodes[0]
              const aNum = aNode.start.line + aNode.start.column
              const bNode = b.thread.metadata.md_metadata.md_nodes[0]
              const bNum = bNode.start.line + bNode.start.column
              return aNum - bNum
            })
            .map(({ thread, createdBy, comments }, index) => ({
              id: thread.address,
              snapshot: thread.metadata.snapshot,
              commit: thread.metadata.commit,
              md_metadata: thread.metadata.md_metadata,
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
  }, [objectAddress, commits.length])

  const hoverThread = (id: string, hover: boolean) => {
    const thread = threads[filename].threads.items.find((item) => item.id === id)
    if (!thread) {
      return
    }

    const lines = [0, 0] //_getThreadLines({ start: thread.startLine, end: thread.endLine })
    const hasOpenedThreads = Object.keys(threads).some((filename) => {
      return threads[filename].threads.items.some((v) => v.isOpen)
    })
    setThreads((state) => ({
      ...state,
      [filename]: {
        ...state[filename],
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

    const lines = [0, 0] // _getThreadLines({ start: thread.startLine, end: thread.endLine })
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
                md_metadata: metadata.md_metadata,
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

  useEffect(() => {
    const hasState = Object.keys(threads).indexOf(filename) >= 0
    if (!hasState) {
      setThreads((state) => ({
        ...state,
        [filename]: {
          ...state[filename],
          threads: { isFetching: true, items: [] },
        },
      }))
    }
  }, [filename])

  useEffect(() => {
    if (initialize) {
      getThreads()
    }

    return () => {
      if (initialize) {
        resetThreads()
      }
    }
  }, [initialize, getThreads])

  return {
    threads: threads[filename]?.threads || { isFetching: false, items: [] },
    getThreads,
    hoverThread,
    toggleThread,
    resolveThread,
    getCommentsNext,
    submitComment,
    resetThreads,
  }
}
