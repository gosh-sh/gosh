import { Account, AccountRunLocalOptions, AccountRunOptions } from '@eversdk/appkit'
import {
    DecodedMessageBody,
    KeyPair,
    ResultOfProcessMessage,
    TonClient,
} from '@eversdk/core'
import { IGoshWallet } from '../resources'
import { TDaoDetails, TGoshBranch, TProfileDetails, TValidationResult } from '../types'

interface IGoshAdapter {
    client: TonClient
    goshroot: IGoshRoot
    gosh: IGosh

    auth(username: string, keys: KeyPair[]): Promise<void>
    authReset(): Promise<void>

    getProfile(username: string): Promise<IGoshProfile>
    deployProfile(username: string, pubkey: string): Promise<IGoshProfile>

    getDao(options: { name?: string; address?: string }): Promise<IGoshDao>

    getRepo(options: {
        name?: string
        daoName?: string
        address?: string
    }): Promise<IGoshRepository>
    getRepoCodeHash(dao: string): Promise<string>

    getWalletCodeHash(): Promise<string>

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
    isOwnerPubkey(pubkey: string): Promise<boolean>

    deployDao(
        gosh: IGoshAdapter,
        name: string,
        members: string[],
        prev?: string,
    ): Promise<IGoshDao>
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

    /** Old interface methods */
    getWalletAddr(profileAddr: string, index: number): Promise<string>
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

export {
    IGoshAdapter,
    IContract,
    IGoshRoot,
    IGoshProfile,
    IGoshProfileDao,
    IGosh,
    IGoshDao,
    IGoshRepository,
}
