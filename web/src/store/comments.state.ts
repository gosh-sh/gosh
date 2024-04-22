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
  md_metadata: any
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
    threads: { isFetching: boolean; items: TBlobCommentsThread[] }
  }
}

export const blobCommentsAtom = atom<TBlobCommentsAtom>({
  key: 'BlobCommentsAtom',
  default: {},
})
