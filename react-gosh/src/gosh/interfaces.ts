import { Account, AccountRunLocalOptions, AccountRunOptions } from '@eversdk/appkit'
import {
    DecodedMessageBody,
    KeyPair,
    ResultOfProcessMessage,
    TonClient,
} from '@eversdk/core'
import {
    TAddress,
    TDao,
    TGoshEventDetails,
    TProfileDetails,
    TValidationResult,
} from '../types'
import {
    IPushCallback,
    TBranch,
    TCommit,
    TRepository,
    TTag,
    TTree,
    TTreeItem,
    TUpgradeData,
} from '../types/repo.types'

interface IGoshAdapter {
    client: TonClient
    goshroot: IGoshRoot
    gosh: IGosh

    isValidDaoName(name: string): TValidationResult
    isValidProfile(username: string[]): Promise<TAddress[]>

    setAuth(username: string, keys: KeyPair): Promise<void>
    resetAuth(): Promise<void>

    getProfile(options: { username?: string; address?: TAddress }): Promise<IGoshProfile>
    getDao(options: {
        name?: string
        address?: TAddress
        useAuth?: boolean
    }): Promise<IGoshDaoAdapter>
    /**
     * Does not support repository authentication.
     * Good for use to get read-only repository.
     * If repository authentication needed, use `getRepository` from DAO adapter
     */
    getRepository(options: {
        path?: string
        address?: TAddress
    }): Promise<IGoshRepositoryAdapter>
    getRepositoryCodeHash(dao: TAddress): Promise<string>
    getTvmHash(data: string | Buffer): Promise<string>

    deployProfile(username: string, pubkey: string): Promise<IGoshProfile>
}

interface IGoshDaoAdapter {
    isDeployed(): Promise<boolean>

    setAuth(username: string, keys: KeyPair): Promise<void>

    getAddress(): TAddress
    getName(): Promise<string>
    getVersion(): string
    getDetails(): Promise<TDao>
    getRemoteConfig(): Promise<object>
    getRepository(options: {
        name?: string
        address?: TAddress
    }): Promise<IGoshRepositoryAdapter>
    getMemberWallet(options: {
        profile?: string
        address?: TAddress
        index?: number
    }): Promise<IGoshWallet>

    getSmvPlatformCode(): Promise<string>
    getSmvProposalCodeHash(): Promise<string>
    getSmvClientCode(): Promise<string>

    deployRepository(
        name: string,
        prev?: { addr: TAddress; version: string } | undefined,
    ): Promise<IGoshRepositoryAdapter>

    createMember(username: string[]): Promise<void>
    deleteMember(username: string[]): Promise<void>

    upgrade(version: string, description?: string): Promise<void>

    // TODO: Remove from interface and make private after useWallet hook removal
    _isAuthMember(): Promise<boolean>
    _getOwner(): Promise<string>
    _getWallet(index: number, keys?: KeyPair): Promise<IGoshWallet>
}

interface IGoshRepositoryAdapter {
    auth?: any

    isDeployed(): Promise<boolean>

    getAddress(): TAddress
    getName(): Promise<string>
    getHead(): Promise<string>
    getVersion(): string
    getDetails(): Promise<TRepository>
    getTree(commit: string, search?: string): Promise<{ tree: TTree; items: TTreeItem[] }>
    getBlob(options: { fullpath?: string; address?: TAddress }): Promise<{
        onchain: { commit: string; content: string }
        content: string | Buffer
        ipfs: boolean
    }>
    getCommit(options: { name?: string; address?: TAddress }): Promise<TCommit>
    getCommitBlob(
        treepath: string,
        commit: string,
    ): Promise<{ previous: string | Buffer; current: string | Buffer }>
    getCommitBlobs(name: string): Promise<string[]>
    getPullRequestBlob(
        item: { treepath: string; index: number },
        commit: string,
    ): Promise<{ previous: string | Buffer; current: string | Buffer }>
    getPullRequestBlobs(commit: string): Promise<{ treepath: string; index: number }[]>
    getBranch(name: string): Promise<TBranch>
    getBranches(): Promise<TBranch[]>
    getTags(): Promise<TTag[]>
    getUpgrade(commit: string): Promise<TUpgradeData>
    getContentSignature(
        repository: string,
        commit: string,
        label: string,
    ): Promise<string>

    deployBranch(name: string, from: string): Promise<void>
    deleteBranch(name: string): Promise<void>
    lockBranch(name: string): Promise<void>
    unlockBranch(name: string): Promise<void>

    setHead(branch: string): Promise<void>
    push(
        branch: string,
        blobs: {
            treepath: string
            original: string | Buffer
            modified: string | Buffer
        }[],
        message: string,
        isPullRequest: boolean,
        tags?: string,
        branchParent?: string,
        callback?: IPushCallback,
    ): Promise<void>
    pushUpgrade(data: TUpgradeData): Promise<void>

    deployContentSignature(
        repository: string,
        commit: string,
        label: string,
        content: string,
    ): Promise<void>
}

interface IContract {
    address: TAddress
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
    ): Promise<{ cursor?: string; messages: any[] }>
    run(
        functionName: string,
        input: object,
        options?: AccountRunOptions,
        settings?: { logging?: boolean; retries?: number },
    ): Promise<ResultOfProcessMessage>
    runLocal(
        functionName: string,
        input: object,
        options?: AccountRunLocalOptions,
        settings?: { logging?: boolean; retries?: number },
    ): Promise<any>
    decodeMessageBody(body: string, type: number): Promise<DecodedMessageBody | null>
}

interface IGoshRoot extends IContract {
    address: TAddress
}

interface IGoshProfile extends IContract {
    address: TAddress

    isOwnerPubkey(pubkey: string): Promise<boolean>

    getName(): Promise<string>
    getDetails(): Promise<TProfileDetails>
    getProfileDao(name: string): Promise<IGoshProfileDao>
    getDaos(): Promise<IGoshDaoAdapter[]>
    getOwners(): Promise<string[]>
    getGoshAddress(): Promise<TAddress>

    deployDao(
        gosh: IGoshAdapter,
        name: string,
        members: TAddress[],
        prev?: TAddress,
    ): Promise<IGoshDaoAdapter>

    setGoshAddress(address: TAddress): Promise<void>
    turnOn(wallet: TAddress, pubkey: string, keys: KeyPair): Promise<void>
}

interface IGoshProfileDao extends IContract {
    address: TAddress
}

interface IGosh extends IContract {
    address: TAddress
}

interface IGoshDao extends IContract {
    address: TAddress
}

interface IGoshRepository extends IContract {
    address: TAddress

    getName(): Promise<string>
}

interface IGoshWallet extends IContract {
    address: TAddress
    profile?: IGoshProfile

    /** Old interface */
    getAccess(): Promise<string | null>

    getSmvLocker(): Promise<IGoshSmvLocker>
    getSmvLockerAddr(): Promise<string>
    getSmvTokenBalance(): Promise<number>
    getSmvClientAddr(lockerAddr: string, proposalId: string): Promise<string>
    lockVoting(amount: number): Promise<void>
    unlockVoting(amount: number): Promise<void>
    voteFor(proposalAddr: string, choice: boolean, amount: number): Promise<void>
    tryProposalResult(proposalAddr: string): Promise<void>
    updateHead(): Promise<void>
}

interface IGoshCommit extends IContract {
    address: TAddress
}

interface IGoshDiff extends IContract {
    address: TAddress
}

interface IGoshSnapshot extends IContract {
    address: TAddress

    getName(): Promise<string>
}

interface IGoshTree extends IContract {
    address: TAddress
}

interface IGoshTag extends IContract {
    address: TAddress
}

interface IGoshContentSignature extends IContract {
    address: TAddress

    /** Old interface */
    getContent(): Promise<string>
}

interface IGoshSmvProposal extends IContract {
    /** Old interface */
    address: TAddress
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
    getDetails(n: number, walletAddress?: string): Promise<TGoshEventDetails>
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
    address: TAddress

    validateProposalStart(): Promise<void>

    /** Old interface */
    getDetails(): Promise<any>
    getVotes(): Promise<{ total: number; locked: number }>
    getIsBusy(): Promise<boolean>
    getNumClients(): Promise<number>
}

interface IGoshSmvClient extends IContract {
    /** Old interface */
    address: TAddress

    getLockedAmount(): Promise<number>
}

interface IGoshSmvTokenRoot extends IContract {
    /** Old interface */
    address: TAddress

    getTotalSupply(): Promise<number>
}

export {
    IGoshAdapter,
    IGoshDaoAdapter,
    IGoshRepositoryAdapter,
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
