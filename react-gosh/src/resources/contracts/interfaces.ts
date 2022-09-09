import { Account, AccountRunOptions } from '@eversdk/appkit'
import { KeyPair, ResultOfProcessMessage } from '@eversdk/core'
import {
    ICreateCommitCallback,
    TDaoDetails,
    TGoshBranch,
    TGoshCommitContent,
    TGoshCommitDetails,
    TGoshDiff,
    TGoshEventDetails,
    TGoshTreeItem,
} from '../../types'

interface IContract {
    address: string
    account: Account
    version: string

    run(
        functionName: string,
        input: object,
        options?: AccountRunOptions,
        writeLog?: boolean,
    ): Promise<ResultOfProcessMessage>
}

interface IGoshRoot extends IContract {
    address: string

    getGosh(version: string): Promise<IGosh>
    getGoshAddr(version: string): Promise<string>
    getVersions(): Promise<any>
}

interface IGosh extends IContract {
    address: string

    deployProfile(username: string, pubkey: string): Promise<IGoshProfile>
    getDaoAddr(name: string): Promise<string>
    getDaoWalletCode(profileAddr: string): Promise<string>
    getRepoAddr(name: string, daoName: string): Promise<string>
    getDaoRepoCode(daoAddr: string): Promise<string>
    getSmvPlatformCode(): Promise<string>
    getContentAddr(
        daoName: string,
        repoName: string,
        commitHash: string,
        label: string,
    ): Promise<string>
    getTvmHash(data: string | Buffer): Promise<string>
    getProfileAddr(username: string): Promise<string>
}

interface IGoshProfile extends IContract {
    address: string

    setGosh(goshAddr: string): Promise<void>
    deployDao(name: string, prevAddr?: string): Promise<IGoshDao>
    deployWallet(daoAddr: string, profileAddr: string): Promise<IGoshWallet>
    turnOn(walletAddr: string, pubkey: string): Promise<void>
    isPubkeyCorrect(pubkey: string): Promise<boolean>
}

interface IGoshDao extends IContract {
    address: string

    getDetails(): Promise<TDaoDetails>
    getWalletAddr(profileAddr: string, index: number): Promise<string>
    getWallets(): Promise<string[]>
    getName(): Promise<string>
    getSmvRootTokenAddr(): Promise<string>
    getSmvProposalCode(): Promise<string>
    getSmvClientCode(): Promise<string>
    mint(amount: number, recipient: string, daoOwnerKeys: KeyPair): Promise<void>
}

interface IGoshWallet extends IContract {
    address: string
    isDaoParticipant: boolean

    getDao(): Promise<IGoshDao>
    getGosh(version: string): Promise<IGosh>
    getSmvLocker(): Promise<IGoshSmvLocker>
    createCommit(
        repo: IGoshRepository,
        branch: TGoshBranch,
        pubkey: string,
        blobs: {
            name: string
            modified: string | Buffer
            original?: string | Buffer
            isIpfs?: boolean
            treeItem?: TGoshTreeItem
        }[],
        message: string,
        tags?: string,
        parent2?: TGoshBranch,
        callback?: ICreateCommitCallback,
    ): Promise<void>

    getDaoAddr(): Promise<string>
    getRootAddr(): Promise<string>
    getPubkey(): Promise<string>
    deployRepo(name: string, prevAddr?: string): Promise<void>
    deployBranch(
        repo: IGoshRepository,
        newName: string,
        fromName: string,
        fromCommit: string,
    ): Promise<void>
    deleteBranch(repo: IGoshRepository, branchName: string): Promise<void>
    deployCommit(
        repo: IGoshRepository,
        branch: TGoshBranch,
        commitName: string,
        commitContent: string,
        parentAddrs: string[],
        treeAddr: string,
        upgrade: boolean,
        diffs: TGoshDiff[],
    ): Promise<void>
    deployTree(repo: IGoshRepository, items: TGoshTreeItem[]): Promise<string>
    deployTag(repo: IGoshRepository, commitName: string, content: string): Promise<void>
    deployNewSnapshot(
        repoAddr: string,
        branchName: string,
        commitName: string,
        filename: string,
        data: string,
        ipfs: string | null,
    ): Promise<string>
    deleteSnapshot(addr: string): Promise<void>
    getSnapshotCode(branch: string, repoAddr: string): Promise<string>
    getSnapshotAddr(
        repoAddr: string,
        branchName: string,
        filename: string,
    ): Promise<string>
    setCommit(
        repoName: string,
        branchName: string,
        commitName: string,
        filesCount: number,
    ): Promise<void>
    startProposalForSetCommit(
        repoName: string,
        branchName: string,
        commitName: string,
        filesCount: number,
    ): Promise<void>
    startProposalForAddProtectedBranch(
        repoName: string,
        branchName: string,
    ): Promise<void>
    startProposalForDeleteProtectedBranch(
        repoName: string,
        branchName: string,
    ): Promise<void>
    getSmvLockerAddr(): Promise<string>
    getSmvTokenBalance(): Promise<number>
    getSmvClientAddr(lockerAddr: string, proposalId: string): Promise<string>
    lockVoting(amount: number): Promise<void>
    unlockVoting(amount: number): Promise<void>
    voteFor(
        platformCode: string,
        clientCode: string,
        proposalAddr: string,
        choice: boolean,
        amount: number,
    ): Promise<void>
    tryProposalResult(proposalAddr: string): Promise<void>
    updateHead(): Promise<void>
    getDiffAddr(
        repoName: string,
        commitName: string,
        index1: number,
        index2: number,
    ): Promise<string>
    setHead(repoName: string, branch: string): Promise<void>
    deployContent(
        repoName: string,
        commitName: string,
        label: string,
        content: string,
    ): Promise<void>
    getContentAdress(repoName: string, commitName: string, label: string): Promise<string>
}

interface IGoshRepository extends IContract {
    address: string
    meta?: {
        name: string
        branchCount: number
        tags: {
            content: string
            commit: string
        }[]
    }

    load(): Promise<void>
    getGosh(version: string): Promise<IGosh>
    getName(): Promise<string>
    getBranches(): Promise<TGoshBranch[]>
    getBranch(name: string): Promise<TGoshBranch>
    getHead(): Promise<string>
    getCommitAddr(commitSha: string): Promise<string>
    getBlobAddr(blobName: string): Promise<string>
    getTagCode(): Promise<string>
    getTags(): Promise<{ content: string; commit: string }[]>
    getGoshAddr(): Promise<string>
    getSnapshotCode(branch: string): Promise<string>
    getSnapshotAddr(branch: string, filename: string): Promise<string>
    getTreeAddr(treeName: string): Promise<string>
    getDiffAddr(commitName: string, index1: number, index2: number): Promise<string>
    isBranchProtected(branch: string): Promise<boolean>
}

interface IGoshCommit extends IContract {
    address: string
    meta?: {
        repoAddr: string
        branchName: string
        sha: string
        content: TGoshCommitContent
        parents: string[]
    }

    load(): Promise<void>
    getDetails(): Promise<TGoshCommitDetails>
    getCommit(): Promise<any>
    getName(): Promise<string>
    getParents(): Promise<string[]>
    getBlobs(): Promise<string[]>
    getTree(): Promise<string>
    getDiffAddr(index1: number, index2: number): Promise<string>
}

interface IGoshDiff extends IContract {
    address: string

    getNextAddr(): Promise<string>
    getDiffs(): Promise<TGoshDiff[]>
}

interface IGoshSnapshot extends IContract {
    address: string

    getName(): Promise<string>
    getSnapshot(
        commitName: string,
        treeItem: TGoshTreeItem,
    ): Promise<{ content: string | Buffer; patched: string; isIpfs: boolean }>
    getRepoAddr(): Promise<string>
}

interface IGoshTree extends IContract {
    address: string

    getTree(): Promise<{ tree: TGoshTreeItem[]; ipfs: string }>
    getSha(): Promise<any>
}

interface IGoshTag extends IContract {
    address: string
    meta?: {
        content: string
    }

    load(): Promise<void>
    getCommit(): Promise<string>
    getContent(): Promise<string>
}

interface IGoshContentSignature extends IContract {
    address: string

    getContent(): Promise<string>
}

interface IGoshSmvProposal extends IContract {
    address: string
    meta?: {
        id: string
        votes: { yes: number; no: number }
        time: { start: Date; finish: Date }
        isCompleted: boolean | null
        commit: {
            kind: string
            repoName: string
            branchName: string
            commitName: string
        }
    }

    load(): Promise<void>
    getDetails(): Promise<TGoshEventDetails>
    getId(): Promise<string>
    getVotes(): Promise<{ yes: number; no: number }>
    getTime(): Promise<{ start: Date; finish: Date }>
    getGoshSetCommitProposalParams(): Promise<any>
    getGoshAddProtectedBranchProposalParams(): Promise<any>
    getGoshDeleteProtectedBranchProposalParams(): Promise<any>
    getLockerAddr(): Promise<string>
    isCompleted(): Promise<boolean | null>
}

interface IGoshSmvLocker extends IContract {
    address: string
    meta?: {
        votesTotal: number
        votesLocked: number
        isBusy: boolean
    }

    load(): Promise<void>
    getVotes(): Promise<{ total: number; locked: number }>
    getIsBusy(): Promise<boolean>
}

interface IGoshSmvClient extends IContract {
    address: string

    getLockedAmount(): Promise<number>
}

interface IGoshSmvTokenRoot extends IContract {
    address: string

    getTotalSupply(): Promise<number>
}

export {
    IContract,
    IGoshRoot,
    IGosh,
    IGoshProfile,
    IGoshDao,
    IGoshWallet,
    IGoshRepository,
    IGoshCommit,
    IGoshDiff,
    IGoshSnapshot,
    IGoshTree,
    IGoshTag,
    IGoshContentSignature,
    IGoshSmvProposal,
    IGoshSmvLocker,
    IGoshSmvClient,
    IGoshSmvTokenRoot,
}
