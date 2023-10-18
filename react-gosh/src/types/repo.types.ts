import { IGoshRepositoryAdapter, IGoshWallet } from '../gosh/interfaces'
import { TUserParam } from './dao.types'
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
    gitsha?: string
    tvmshatree?: string
    tvmshafile?: string
    commit?: string
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
    parents: { address: TAddress; version: string; name: string }[]
    version: string
    initupgrade: boolean
    correct: boolean
    time?: number
    treeaddr: string
}

type TBranch = {
    name: string
    commit: TCommit
    isProtected: boolean
}

type TCommitTag = {
    repository: string
    name: string
    content: string
    commit: {
        address: TAddress
        name: string
    }
}

type TDiff = {
    snap: string
    snapname?: string
    patch: string | null
    ipfs: string | null
    commit: string
    sha1: string
    sha256: string
    removeIpfs: boolean
}

type TPushProgress = {
    isUpgrade?: boolean
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
        address: string
        treepath: string
        content: string | Buffer
    }[]
}

type TPushBlobData = {
    data: {
        commitname?: string
        snapshot: string
        treepath: string
        treeitem?: TTreeItem
        compressed: string
        content?: string | Buffer
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
    assigners: string[] | TUserParam[]
    reviewers: string[] | TUserParam[]
    managers: string[] | TUserParam[]
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
    repository: string
    description: string
    cell?: boolean
}

type TRepositoryUpdateDescriptionResult = Promise<void | string>

type TRepositoryChangeBranchProtectionParams = TEventCreateParams & {
    repository: string
    branch: string
    cell?: boolean
}

type TRepositoryChangeBranchProtectionResult = Promise<void | string | null>

type TRepositoryTagCreateParams = TEventCreateParams & {
    repository: string
    tags: string[]
    cell?: boolean
}

type TRepositoryTagCreateResult = Promise<void | string>

type TRepositoryTagDeleteParams = TEventCreateParams & {
    repository: string
    tags: string[]
    cell?: boolean
}

type TRepositoryTagDeleteResult = Promise<void | string>

type TRepositoryCreateCommitTagParams = {
    repository: string
    commit: string
    tag: string
    wallet?: IGoshWallet
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
    TCommitTag,
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
    TRepositoryUpdateDescriptionResult,
    TRepositoryChangeBranchProtectionParams,
    TRepositoryChangeBranchProtectionResult,
    TRepositoryTagCreateParams,
    TRepositoryTagCreateResult,
    TRepositoryTagDeleteParams,
    TRepositoryTagDeleteResult,
    TRepositoryCreateCommitTagParams,
    IPushCallback,
    ITBranchOperateCallback,
}
