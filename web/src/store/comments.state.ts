import { atom } from 'recoil'

type BlobComment = {
    username: string
    datetime: string
    content: string
}

type BlobCommentsThread = {
    id: string
    type: 'context' | 'prev' | 'curr'
    startLine: number
    endLine: number
    prev: string | null
    next: string | null
    isOpen: boolean
    isActive: boolean
    comments: BlobComment[]
}

type BlobCommentsAtom = {
    [filename: string]: {
        selectedLines: { type: 'context' | 'prev' | 'curr'; lines: number[] }
        commentFormLine: number
        threads: BlobCommentsThread[]
    }
}

export const blobCommentsAtom = atom<BlobCommentsAtom>({
    key: 'BlobCommentsAtom',
    default: {
        'nginx_installation_playbook.yml': {
            selectedLines: { type: 'context', lines: [] },
            commentFormLine: 0,
            threads: [
                {
                    id: 'thread-1',
                    type: 'context',
                    startLine: 8,
                    endLine: 8,
                    prev: null,
                    next: 'thread-2',
                    isOpen: false,
                    isActive: false,
                    comments: [
                        {
                            username: 'roman',
                            datetime: '2023-05-05 10:10',
                            content:
                                'Start thread 1 Start thread 1 Start thread 1 Start thread 1Start thread 1',
                        },
                        {
                            username: 'roman',
                            datetime: '2023-05-05 10:20',
                            content: 'My thoughts',
                        },
                    ],
                },
                {
                    id: 'thread-2',
                    type: 'context',
                    startLine: 16,
                    endLine: 21,
                    prev: 'thread-1',
                    next: null,
                    isOpen: false,
                    isActive: false,
                    comments: [
                        {
                            username: 'andrew',
                            datetime: '2023-05-05 10:10',
                            content: 'Start thread 2',
                        },
                        {
                            username: 'artem',
                            datetime: '2023-05-05 10:20',
                            content: 'My thoughts',
                        },
                        {
                            username: 'roman',
                            datetime: '2023-05-05 10:20',
                            content: 'My thoughts',
                        },
                        {
                            username: 'roman',
                            datetime: '2023-05-05 10:20',
                            content: 'My thoughts',
                        },
                        {
                            username: 'roman',
                            datetime: '2023-05-05 10:20',
                            content: 'My thoughts',
                        },
                        {
                            username: 'roman',
                            datetime: '2023-05-05 10:20',
                            content: 'My thoughts',
                        },
                    ],
                },
            ],
        },
        'TechDoc.md': {
            selectedLines: { type: 'context', lines: [] },
            commentFormLine: 0,
            threads: [
                {
                    id: 'thread-1',
                    type: 'curr',
                    startLine: 3,
                    endLine: 5,
                    prev: null,
                    next: 'thread-2',
                    isOpen: false,
                    isActive: false,
                    comments: [
                        {
                            username: 'roman',
                            datetime: '2023-05-05 10:10',
                            content: 'Start thread 1',
                        },
                        {
                            username: 'roman',
                            datetime: '2023-05-05 10:20',
                            content: 'My thoughts',
                        },
                    ],
                },
                {
                    id: 'thread-2',
                    type: 'curr',
                    startLine: 8,
                    endLine: 8,
                    prev: 'thread-1',
                    next: null,
                    isOpen: false,
                    isActive: false,
                    comments: [
                        {
                            username: 'andrew',
                            datetime: '2023-05-05 10:10',
                            content: 'Start thread 2',
                        },
                        {
                            username: 'artem',
                            datetime: '2023-05-05 10:20',
                            content: 'My thoughts',
                        },
                        {
                            username: 'roman',
                            datetime: '2023-05-05 10:20',
                            content: 'My thoughts',
                        },
                        {
                            username: 'roman',
                            datetime: '2023-05-05 10:20',
                            content: 'My thoughts',
                        },
                        {
                            username: 'roman',
                            datetime: '2023-05-05 10:20',
                            content: 'My thoughts',
                        },
                        {
                            username: 'roman',
                            datetime: '2023-05-05 10:20',
                            content: 'My thoughts',
                        },
                    ],
                },
            ],
        },
    },
})

export const blobPreviewEditorAtom = atom({
    key: 'CodeCommentsEditorAtom',
    default: {
        selectedLines: [0],
        showCommentForm: 0,
    },
})
