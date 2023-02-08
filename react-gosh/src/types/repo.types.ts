import { IGoshRepositoryAdapter } from '../gosh/interfaces'
import { TAddress } from './types'

enum EBlobFlag {
    BINARY = 1,
    COMPRESSED = 2,
    IPFS = 4,
}

enum ETaskBounty {
    ASSING = 1,
    REVIEW = 2,
    MANAGER = 3,
}

type TRepository = {
    address: TAddress
    name: string
    version: string
    branches: number
    head: string
    commitsIn: { branch: string; commit: TCommit }[]
}

type TRepositoryListItem = Omit<TRepository, 'branches' | 'head' | 'commitsIn'> & {
    adapter: IGoshRepositoryAdapter
    branches?: number
    head?: string
    commitsIn?: { branch: string; commit: TCommit }[]
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
    removeIpfs: boolean
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

type TPushBlobData = {
    data: {
        snapshot: string
        treepath: string
        treeitem?: TTreeItem
        compressed: string
        patch: string | null
        flags: EBlobFlag
        hashes: {
            sha1: string
            sha256: string
        }
        isGoingIpfs: boolean
        isGoingOnchain: boolean
    }
    status: number
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

type TTaskCommitConfig = {
    task: string
    assigners: string[]
    reviewers: string[]
    manager: string
}

type TTaskDetails = {
    address: TAddress
    name: string
    repository: TAddress
    candidates: any[]
    config: any
    confirmed: boolean
    confirmedAt: number
}

type TTaskListItem = TTaskDetails & {
    adapter: IGoshRepositoryAdapter
    isLoadDetailsFired?: boolean
}

interface IPushCallback {
    (params: TPushProgress): void
}

interface ITBranchOperateCallback {
    (params: TBranchOperateProgress): void
}

export {
    EBlobFlag,
    ETaskBounty,
    TRepository,
    TRepositoryListItem,
    TTree,
    TTreeItem,
    TCommit,
    TBranch,
    TTag,
    TDiff,
    TUpgradeData,
    TPushBlobData,
    TPushProgress,
    TBranchCompareProgress,
    TBranchOperateProgress,
    TTaskCommitConfig,
    TTaskDetails,
    TTaskListItem,
    IPushCallback,
    ITBranchOperateCallback,
}
