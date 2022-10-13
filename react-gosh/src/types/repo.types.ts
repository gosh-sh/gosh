import { IGoshRepositoryAdapter } from '../gosh/interfaces'

type TRepository = {
    address: string
    name: string
    version: string
    branches: TBranch[]
    head: string
    tags: TTag[]
}

type TRepositoryListItem = Omit<TRepository, 'branches' | 'head' | 'tags'> & {
    adapter: IGoshRepositoryAdapter
    branches?: TBranch[]
    head?: string
    tags?: TTag[]
    isLoadDetailsFired?: boolean
}

type TTreeItem = {
    flags: number
    mode: '040000' | '100644' | string
    type: 'tree' | 'blob' | 'blobExecutable' | 'link'
    sha1: string
    sha256: string
    path: string
    name: string
}

type TTree = {
    [key: string]: TTreeItem[]
}

type TCommit = {
    address: string
    name: string
    branch: string
    tree: string
    title: string
    message: string
    author: string
    committer: string
    parents: string[]
    version: string
    initupgrade: boolean
}

type TBranch = {
    name: string
    commit: TCommit
    isProtected: boolean
}

type TTag = {
    commit: string
    content: string
}

type TPushCallbackParams = {
    treesBuild?: boolean
    treesDeploy?: { count?: number; total?: number }
    snapsDeploy?: { count?: number; total?: number }
    diffsDeploy?: { count?: number; total?: number }
    tagsDeploy?: { count?: number; total?: number }
    commitDeploy?: boolean
    completed?: boolean
}

interface IPushCallback {
    (params: TPushCallbackParams): void
}

export {
    TRepository,
    TRepositoryListItem,
    TTree,
    TTreeItem,
    TCommit,
    TBranch,
    TTag,
    IPushCallback,
    TPushCallbackParams,
}
