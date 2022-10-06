import { Account, AccountRunLocalOptions, AccountRunOptions } from '@eversdk/appkit'
import {
    DecodedMessageBody,
    KeyPair,
    ResultOfProcessMessage,
    TonClient,
} from '@eversdk/core'
import {
    ICreateCommitCallback,
    TDaoDetails,
    TGoshBranch,
    TGoshCommitContent,
    TGoshCommitDetails,
    TGoshDiff,
    TGoshEventDetails,
    TGoshTreeItem,
    TProfileDetails,
    TValidationResult,
} from '../types'

interface IGoshAdapter {
    client: TonClient
    goshroot: IGoshRoot
    gosh: IGosh

    setAuth(username: string, keys: KeyPair, dao: IGoshDao): Promise<void>
    resetAuth(): Promise<void>

    getProfile(username: string): Promise<IGoshProfile>
    deployProfile(username: string, pubkey: string): Promise<IGoshProfile>

    getDao(options: { name?: string; address?: string }): Promise<IGoshDao>
    getDaoWalletCodeHash(): Promise<string>
    isAuthDaoOwner(): Promise<boolean>
    isAuthDaoMember(): Promise<boolean>

    getRepository(options: { name?: string; address?: string }): Promise<IGoshRepository>
    getRepositoryCodeHash(dao: string): Promise<string>
    deployRepository(
        name: string,
        prev?: { addr: string; version: string },
    ): Promise<IGoshRepository>

    getBlob(repository: string, branch: string, path: string): Promise<string | Buffer>

    getTvmHash(data: string | Buffer): Promise<string>

    isValidDaoName(name: string): TValidationResult

    // TODO: May be remove from this interface
    getSmvPlatformCode(): Promise<string>
}

interface IContract {
    address: string
    account: Account
    version: string

    isDeployed(): Promise<boolean>
    getMessages(
        variables: {
            msgType: string[]
            node?: string[]
            cursor?: string
            limit?: number
        },
        decode?: boolean,
        all?: boolean,
        messages?: any[],
    ): Promise<any[]>
    run(
        functionName: string,
        input: object,
        options?: AccountRunOptions,
        writeLog?: boolean,
    ): Promise<ResultOfProcessMessage>
    runLocal(
        functionName: string,
        input: object,
        options?: AccountRunLocalOptions,
        writeLog?: boolean,
    ): Promise<any>
    decodeMessageBody(body: string, type: number): Promise<DecodedMessageBody | null>
}

interface IGoshRoot extends IContract {
    address: string

    getGoshAddr(version: string): Promise<string>
    getVersions(): Promise<any>
}

interface IGoshProfile extends IContract {
    address: string

    getName(): Promise<string>
    getDetails(): Promise<TProfileDetails>
    getProfileDao(name: string): Promise<IGoshProfileDao>
    getDaos(): Promise<IGoshDao[]>
    getOwners(): Promise<string[]>
    isOwnerPubkey(pubkey: string): Promise<boolean>

    deployDao(
        gosh: IGoshAdapter,
        name: string,
        members: string[],
        prev?: string,
    ): Promise<IGoshDao>

    turnOn(wallet: string, pubkey: string, keys: KeyPair): Promise<void>
}

interface IGoshProfileDao extends IContract {
    address: string
}

interface IGosh extends IContract {
    address: string
}

interface IGoshDao extends IContract {
    address: string

    getName(): Promise<string>
    getDetails(): Promise<TDaoDetails>
    getWalletAddr(profile: string, index: number): Promise<string>

    /** Old interface methods */
    getWallets(): Promise<string[]>
    getProfiles(): Promise<{ profile: string; wallet: string }[]>
    getSmvRootTokenAddr(): Promise<string>
    getSmvProposalCode(): Promise<string>
    getSmvClientCode(): Promise<string>
    getOwner(): Promise<string>
    getOwnerWallet(keys?: KeyPair): Promise<IGoshWallet>
    isMember(profileAddr: string): Promise<boolean>
    mint(amount: number, recipient: string, daoOwnerKeys: KeyPair): Promise<void>
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

    /** Old interface methods */
    load(): Promise<void>
    getGosh(version: string): Promise<any>
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

interface IGoshWallet extends IContract {
    address: string
    profile?: IGoshProfile

    /** Old interface */
    getDao(): Promise<IGoshDao>
    getGosh(version: string): Promise<IGoshAdapter>
    getAccess(): Promise<string | null>
    deployDaoWallet(profileAddr: string): Promise<IGoshWallet>
    deleteDaoWallet(profileAddr: string): Promise<void>

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
        commitsCount: number,
    ): Promise<void>
    startProposalForSetCommit(
        repoName: string,
        branchName: string,
        commitName: string,
        filesCount: number,
        commitsCount: number,
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
/*         platformCode: string,
        clientCode: string,
 */        proposalAddr: string,
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

interface IGoshCommit extends IContract {
    /** Old interface */
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

    /** Old interface */
    getNextAddr(): Promise<string>
    getDiffs(): Promise<TGoshDiff[]>
}

interface IGoshSnapshot extends IContract {
    address: string

    /** Old interface */
    getName(): Promise<string>
    getSnapshot(
        commitName: string,
        treeItem: TGoshTreeItem,
    ): Promise<{ content: string | Buffer; patched: string; isIpfs: boolean }>
    getRepoAddr(): Promise<string>
}

interface IGoshTree extends IContract {
    address: string

    /** Old interface */
    getTree(): Promise<{ tree: TGoshTreeItem[]; ipfs: string }>
    getSha(): Promise<any>
}

interface IGoshTag extends IContract {
    address: string
    meta?: {
        content: string
    }

    /** Old interface */
    load(): Promise<void>
    getCommit(): Promise<string>
    getContent(): Promise<string>
}

interface IGoshContentSignature extends IContract {
    address: string

    /** Old interface */
    getContent(): Promise<string>
}

interface IGoshSmvProposal extends IContract {
    /** Old interface */
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
    getDetails(walletAddress?: string): Promise<TGoshEventDetails>
    getId(): Promise<string>
    getVotes(): Promise<{ yes: number; no: number }>
    getTime(): Promise<{ start: Date; finish: Date }>
    getTotalSupply(): Promise<number>
    getClientAddress(walletAddress?: string): Promise<string>
    getYourVotes(walletAddress?: string): Promise<number>
    getPlatformId(): Promise<number>
    getGoshSetCommitProposalParams(): Promise<any>
    getGoshAddProtectedBranchProposalParams(): Promise<any>
    getGoshDeleteProtectedBranchProposalParams(): Promise<any>
    getLockerAddr(): Promise<string>
    isCompleted(): Promise<boolean | null>
}

interface IGoshSmvLocker extends IContract {
    /** Old interface */
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
    /** Old interface */
    address: string

    getLockedAmount(): Promise<number>
}

interface IGoshSmvTokenRoot extends IContract {
    /** Old interface */
    address: string

    getTotalSupply(): Promise<number>
}

export {
    IGoshAdapter,
    IContract,
    IGoshRoot,
    IGoshProfile,
    IGoshProfileDao,
    IGosh,
    IGoshDao,
    IGoshRepository,
    IGoshWallet,
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
