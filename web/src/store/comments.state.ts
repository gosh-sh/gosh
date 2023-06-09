import { atom } from 'recoil'

type BlobComment = {
    id: string
    username: string
    datetime: number
    content: string
}

type BlobCommentsThread = {
    id: string
    commit: string
    startLine: number
    endLine: number
    prev: string | null
    next: string | null
    isResolved: boolean
    isOpen: boolean
    isActive: boolean
    content: BlobComment
    comments: {
        isFetching: boolean
        cursor?: string
        hasNext: boolean
        items: BlobComment[]
    }
}

type BlobCommentsAtom = {
    [filename: string]: {
        selectedLines: { commit: string; lines: number[] }
        commentFormLine: { commit: string; line: number }
        threads: { isFetching: boolean; items: BlobCommentsThread[] }
    }
}

export const blobCommentsAtom = atom<BlobCommentsAtom>({
    key: 'BlobCommentsAtom',
    default: {},
})

export const blobsCommentsCountAtom = atom<{ [filename: string]: number }>({
    key: 'BlobsCommentsCountAtom',
    default: {},
})
