import { KeyPair } from '@eversdk/core'

export type TUserStatePersist = {
    phrase?: string
    nonce?: string
    pin?: string
}

export type TUserState = TUserStatePersist & {
    keys?: KeyPair
}

export type TGoshWalletDetails = {
    address: string
    keys?: KeyPair
    daoAddress: string
}

export type TGoshRepoDetails = {
    address: string
    name: string
    branches: TGoshBranch[]
    head: string
    tags: TGoshTagDetails[]
}

export type TGoshTagDetails = {
    commit: string
    content: string
}

export type TSmvBalanceDetails = {
    balance: number
    smvBalance: number
    smvLocked: number
    smvBusy: boolean
}

export type TGoshEventDetails = {
    address: string
    id: string
    params: any
    time: { start: Date; finish: Date }
    votes: { yes: number; no: number }
    status: { completed: boolean; accepted: boolean }
}

export type TGoshBranch = {
    name: string
    commitAddr: string
    isProtected: boolean
}

export type TGoshCommitContent = {
    tree: string
    author: string
    committer: string
    title: string
    message: string
}

export type TGoshCommit = {
    addr: string
    addrRepo: string
    branch: string
    name: string
    content: TGoshCommitContent
    parents: string[]
}

export type TGoshCommitDetails = {
    address: string
    repoAddress: string
    branch: string
    name: string
    content: TGoshCommitContent
    parents: string[]
}

export type TGoshTreeItem = {
    flags: number
    mode: '040000' | '100644' | string
    type: 'tree' | 'blob' | 'blobExecutable' | 'link'
    sha1: string
    sha256: string
    path: string
    name: string
}

export type TGoshTree = {
    [key: string]: TGoshTreeItem[]
}

export type TGoshDiff = {
    snap: string
    patch: string | null
    ipfs: string | null
    commit: string
    sha1: string
    sha256: string
}

export type TCreateCommitCallbackParams = {
    diffsPrepare?: boolean
    treePrepare?: boolean
    treeDeploy?: boolean
    commitDeploy?: boolean
    tagsDeploy?: boolean
    completed?: boolean
}

export interface ICreateCommitCallback {
    (params: TCreateCommitCallbackParams): void
}

export enum EGoshBlobFlag {
    BINARY = 1,
    COMPRESSED = 2,
    IPFS = 4,
}

export enum EEventType {
    PR = 1,
    BRANCH_LOCK = 2,
    BRANCH_UNLOCK = 3,
}
