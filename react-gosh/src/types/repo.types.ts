import { IGoshRepositoryAdapter } from '../gosh/interfaces'
import { TAddress, TEventCreateParams } from './types'

enum EBlobFlag {
    BINARY = 1,
    COMPRESSED = 2,
    IPFS = 4,
}

type TRepository = {
    address: TAddress
    name: string
    version: string
    branches: any[]
    head: string
    commitsIn: { branch: string; commit: TCommit }[]
    description?: string
    tags?: string[]
}

type TRepositoryListItem = Omit<TRepository, 'branches' | 'head' | 'commitsIn'> & {
    adapter: IGoshRepositoryAdapter
    branches?: any[]
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
    managers: string[]
}

type TRepositoryCreateParams = TEventCreateParams & {
    name: string
    description?: string
    prev?: { addr: TAddress; version: string }
    alone?: boolean
    cell?: boolean
}

type TRepositoryCreateResult = IGoshRepositoryAdapter | string

type TRepositoryUpdateDescriptionParams = TEventCreateParams & {
    description: string
}

type TRepositoryChangeBranchProtectionParams = TEventCreateParams & {
    name: string
}

type TRepositoryTagCreateParams = TEventCreateParams & {
    tags: string[]
}

type TRepositoryTagDeleteParams = TEventCreateParams & {
    tags: string[]
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
    TPushBlobData,
    TPushProgress,
    TBranchCompareProgress,
    TBranchOperateProgress,
    TTaskCommitConfig,
    TRepositoryCreateParams,
    TRepositoryCreateResult,
    TRepositoryUpdateDescriptionParams,
    TRepositoryChangeBranchProtectionParams,
    TRepositoryTagCreateParams,
    TRepositoryTagDeleteParams,
    IPushCallback,
    ITBranchOperateCallback,
}
