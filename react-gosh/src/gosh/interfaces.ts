import { Account, AccountRunLocalOptions, AccountRunOptions } from '@eversdk/appkit'
import {
    DecodedMessageBody,
    KeyPair,
    ResultOfProcessMessage,
    TonClient,
} from '@eversdk/core'
import { TDao, TGoshEventDetails, TProfileDetails, TValidationResult } from '../types'
import {
    IPushCallback,
    TBranch,
    TCommit,
    TRepository,
    TTag,
    TTree,
    TTreeItem,
} from '../types/repo.types'

interface IGoshAdapter {
    client: TonClient
    goshroot: IGoshRoot
    gosh: IGosh

    isValidDaoName(name: string): TValidationResult

    setAuth(username: string, keys: KeyPair): Promise<void>
    resetAuth(): Promise<void>

    getProfile(options: { username?: string; address?: string }): Promise<IGoshProfile>
    getDao(options: {
        name?: string
        address?: string
        useAuth?: boolean
    }): Promise<IGoshDaoAdapter>
    /**
     * Does not support repository authentication.
     * Good for use to get read-only repository.
     * If repository authentication needed, use `getRepository` from DAO adapter
     */
    getRepository(options: {
        path?: string
        address?: string
    }): Promise<IGoshRepositoryAdapter>
    getRepositoryCodeHash(dao: string): Promise<string>
    getTvmHash(data: string | Buffer): Promise<string>

    deployProfile(username: string, pubkey: string): Promise<IGoshProfile>
}

interface IGoshDaoAdapter {
    isDeployed(): Promise<boolean>

    setAuth(username: string, keys: KeyPair): Promise<void>

    getAddress(): string
    getName(): Promise<string>
    getVersion(): string
    getDetails(): Promise<TDao>
    getRepository(options: {
        name?: string
        address?: string
    }): Promise<IGoshRepositoryAdapter>
    getMemberWallet(options: {
        profile?: string
        address?: string
        index?: number
    }): Promise<IGoshWallet>

    getSmvPlatformCode(): Promise<string>
    getSmvProposalCodeHash(): Promise<string>
    getSmvClientCode(): Promise<string>

    deployRepository(
        name: string,
        prev?: { addr: string; version: string } | undefined,
    ): Promise<IGoshRepositoryAdapter>

    createMember(username: string[]): Promise<void>
    deleteMember(username: string[]): Promise<void>

    // TODO: Remove from interface and make private after useWallet hook removal
    _isAuthMember(): Promise<boolean>
    _getOwner(): Promise<string>
    _getWallet(index: number, keys?: KeyPair): Promise<IGoshWallet>
}

interface IGoshRepositoryAdapter {
    auth?: any

    isDeployed(): Promise<boolean>

    getAddress(): string
    getName(): Promise<string>
    getHead(): Promise<string>
    getVersion(): string
    getDetails(): Promise<TRepository>
    getTree(commit: string, search?: string): Promise<{ tree: TTree; items: TTreeItem[] }>
    getBlob(options: { fullpath?: string; address?: string }): Promise<string | Buffer>
    getCommit(options: { name?: string; address?: string }): Promise<TCommit>
    getCommitBlob(
        treepath: string,
        commit: string,
    ): Promise<{ previous: string | Buffer; current: string | Buffer }>
    getCommitBlobs(name: string): Promise<string[]>
    getBranch(name: string): Promise<TBranch>
    getBranches(): Promise<TBranch[]>
    getTags(): Promise<TTag[]>

    deployBranch(name: string, from: string): Promise<void>
    deleteBranch(name: string): Promise<void>
    lockBranch(name: string): Promise<void>
    unlockBranch(name: string): Promise<void>

    setHead(branch: string): Promise<void>
    push(
        branch: string,
        blobs: {
            treePath: string
            original: string | Buffer
            modified: string | Buffer
        }[],
        message: string,
        tags?: string,
        branchParent?: string,
        callback?: IPushCallback,
    ): Promise<void>
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
    ): Promise<{ cursor?: string; messages: any[] }>
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

    isOwnerPubkey(pubkey: string): Promise<boolean>

    getName(): Promise<string>
    getDetails(): Promise<TProfileDetails>
    getProfileDao(name: string): Promise<IGoshProfileDao>
    getDaos(): Promise<IGoshDaoAdapter[]>
    getOwners(): Promise<string[]>
    getGoshAddress(): Promise<string>

    deployDao(
        gosh: IGoshAdapter,
        name: string,
        members: string[],
        prev?: string,
    ): Promise<IGoshDaoAdapter>

    setGoshAddress(address: string): Promise<void>
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
}

interface IGoshRepository extends IContract {
    address: string

    getName(): Promise<string>
}

interface IGoshWallet extends IContract {
    address: string
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
    deployContent(
        repoName: string,
        commitName: string,
        label: string,
        content: string,
    ): Promise<void>
    getContentAdress(repoName: string, commitName: string, label: string): Promise<string>
}

interface IGoshCommit extends IContract {
    address: string
}

interface IGoshDiff extends IContract {
    address: string
}

interface IGoshSnapshot extends IContract {
    address: string

    getName(): Promise<string>
}

interface IGoshTree extends IContract {
    address: string
}

interface IGoshTag extends IContract {
    address: string
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
    getDetails(n:number, walletAddress?: string): Promise<TGoshEventDetails>
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

    getDetails(): Promise<any>
    getVotes(): Promise<{ total: number; locked: number }>
    getIsBusy(): Promise<boolean>
    getNumClients(): Promise<number>
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
