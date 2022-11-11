import { IGoshRepositoryAdapter } from '../gosh/interfaces'
import { TAddress } from './types'

enum EBlobFlag {
    BINARY = 1,
    COMPRESSED = 2,
    IPFS = 4,
}

type TRepository = {
    address: TAddress
    name: string
    version: string
    branches: number
    head: string
    tags: TTag[]
}

type TRepositoryListItem = Omit<TRepository, 'branches' | 'head' | 'tags'> & {
    adapter: IGoshRepositoryAdapter
    branches?: number
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
    address: TAddress
    name: string
    branch: string
    content: string
    tree: string
    title: string
    message: string
    author: string
    committer: string
    parents: TAddress[]
    version: string
    versionPrev: string
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

type TDiff = {
    snap: string
    patch: string | null
    ipfs: string | null
    commit: string
    sha1: string
    sha256: string
}

type TPushProgress = {
    treesBuild?: boolean
    treesDeploy?: { count?: number; total?: number }
    snapsDeploy?: { count?: number; total?: number }
    diffsDeploy?: { count?: number; total?: number }
    tagsDeploy?: { count?: number; total?: number }
    commitDeploy?: boolean
    completed?: boolean
}

type TUpgradeData = {
    commit: TCommit
    tree: TTree
    blobs: {
        treepath: string
        content: string | Buffer
    }[]
}

type TBranchCompareProgress = {
    trees?: boolean
    blobs?: { count?: number; total?: number }
}

type TBranchOperateProgress = {
    snapshotsRead?: boolean
    snapshotsWrite?: { count?: number; total?: number }
    completed?: boolean
}

interface IPushCallback {
    (params: TPushProgress): void
}

interface ITBranchOperateCallback {
    (params: TBranchOperateProgress): void
}

export {
    EBlobFlag,
    TRepository,
    TRepositoryListItem,
    TTree,
    TTreeItem,
    TCommit,
    TBranch,
    TTag,
    TDiff,
    TUpgradeData,
    TPushProgress,
    TBranchCompareProgress,
    TBranchOperateProgress,
    IPushCallback,
    ITBranchOperateCallback,
}
