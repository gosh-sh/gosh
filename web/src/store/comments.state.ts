import { atom } from 'recoil'

type TBlobComment = {
  id: string
  username: string
  datetime: number
  content: string
}

type TBlobCommentsThread = {
  id: string
  snapshot: string
  commit: string
  startLine: number
  endLine: number
  prev: string | null
  next: string | null
  isResolved: boolean
  isOpen: boolean
  isActive: boolean
  content: TBlobComment
  comments: {
    isFetching: boolean
    cursor?: string
    hasNext: boolean
    items: TBlobComment[]
  }
}

type TBlobCommentsAtom = {
  [filename: string]: {
    selectedLines: { commit: string; lines: number[] }
    commentFormLine: { commit: string; line: number }
    threads: { isFetching: boolean; items: TBlobCommentsThread[] }
  }
}

type TBlobCommentsAiAtom = {
  filename: string
  snapshot: string
  thread: string
  startLine: number
  endLine: number
  comment: string
}[]

export const blobCommentsAtom = atom<TBlobCommentsAtom>({
  key: 'BlobCommentsAtom',
  default: {},
})

export const blobsCommentsAiAtom = atom<TBlobCommentsAiAtom>({
  key: 'BlobsCommentsAiAtom',
  default: [],
})
