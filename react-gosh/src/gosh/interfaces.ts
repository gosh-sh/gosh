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
    TProfileDetails,
    TSmvDetails,
    TSmvEvent,
    TSmvEventMinimal,
    TValidationResult,
} from '../types'
import {
    IPushCallback,
    ITBranchOperateCallback,
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

    getSmv(): Promise<IGoshSmvAdapter>

    deployRepository(
        name: string,
        prev?: { addr: TAddress; version: string } | undefined,
    ): Promise<IGoshRepositoryAdapter>

    createMember(username: string[]): Promise<void>
    deleteMember(username: string[]): Promise<void>

    upgrade(version: string, description?: string): Promise<void>
}

interface IGoshRepositoryAdapter {
    auth?: any

    isDeployed(): Promise<boolean>

    getAddress(): TAddress
    getName(): Promise<string>
    getHead(): Promise<string>
    getVersion(): string
    getDetails(): Promise<TRepository>
    getTree(
        commit: string | TCommit,
        search?: string,
    ): Promise<{ tree: TTree; items: TTreeItem[] }>
    getBlob(options: {
        commit?: string
        fullpath?: string
        address?: TAddress
    }): Promise<{
        onchain: { commit: string; content: string }
        content: string | Buffer
        ipfs: boolean
    }>
    getCommit(options: { name?: string; address?: TAddress }): Promise<TCommit>
    getCommitBlob(
        treepath: string,
        branch: string,
        commit: string | TCommit,
    ): Promise<{ previous: string | Buffer; current: string | Buffer }>
    getCommitBlobs(branch: string, commit: string | TCommit): Promise<string[]>
    getPullRequestBlob(
        item: { treepath: string; index: number },
        commit: string | TCommit,
    ): Promise<{ previous: string | Buffer; current: string | Buffer }>
    getPullRequestBlobs(
        commit: string | TCommit,
    ): Promise<{ treepath: string; index: number }[]>
    getBranch(name: string): Promise<TBranch>
    getBranches(): Promise<TBranch[]>
    getTags(): Promise<TTag[]>
    getUpgrade(commit: string): Promise<TUpgradeData>
    getContentSignature(
        repository: string,
        commit: string,
        label: string,
    ): Promise<string>

    createBranch(
        name: string,
        from: string,
        callback?: ITBranchOperateCallback,
    ): Promise<void>
    deleteBranch(name: string, callback?: ITBranchOperateCallback): Promise<void>
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

interface IGoshSmvAdapter {
    getTotalSupply(): Promise<number>
    getDetails(): Promise<TSmvDetails>
    getClientsCount(): Promise<number>
    getEventCodeHash(): Promise<string>
    getEvent(
        address: TAddress,
        isDetailed?: boolean,
    ): Promise<TSmvEventMinimal | TSmvEvent>
    getWalletBalance(wallet: IGoshWallet): Promise<number>

    validateProposalStart(): Promise<void>

    transferToSmv(amount: number): Promise<void>
    transferToWallet(amount: number): Promise<void>
    releaseAll(): Promise<void>

    vote(event: TAddress, choice: boolean, amount: number): Promise<void>
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
}

interface IGoshSmvProposal extends IContract {
    address: TAddress
}

interface IGoshSmvLocker extends IContract {
    address: TAddress
}

interface IGoshSmvClient extends IContract {
    address: TAddress
}

interface IGoshSmvTokenRoot extends IContract {
    address: TAddress
}

export {
    IGoshAdapter,
    IGoshDaoAdapter,
    IGoshRepositoryAdapter,
    IGoshSmvAdapter,
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
