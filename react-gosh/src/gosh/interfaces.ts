import { Account, AccountRunLocalOptions, AccountRunOptions } from '@eversdk/appkit'
import { DecodedMessageBody, KeyPair, ResultOfProcessMessage } from '@eversdk/core'
import { IGoshRoot, IGoshWallet } from '../resources'
import { TDaoDetails, TProfileDetails } from '../types'

interface IGoshAdapter {
    goshroot: IGoshRoot

    getProfile(username: string, options: { keys?: KeyPair }): Promise<IGoshProfile>
    deployProfile(username: string, pubkey: string): Promise<IGoshProfile>

    getProfileDao(username: string, name: string): Promise<IGoshProfileDao>

    getDao(name: string): Promise<IGoshDao>
    deployDao(
        name: string,
        profiles: string[],
        creator: { username: string; keys: KeyPair },
        prev?: string,
    ): Promise<IGoshDao>

    getTvmHash(data: string | Buffer): Promise<string>
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

interface IGosh extends IContract {
    address: string

    // getDaoAddr(name: string): Promise<string>
    // getDaoWalletCode(profileAddr: string): Promise<string>
    // getRepoAddr(name: string, daoName: string): Promise<string>
    // getDaoRepoCode(daoAddr: string): Promise<string>
    // getSmvPlatformCode(): Promise<string>
    // getContentAddr(
    //     daoName: string,
    //     repoName: string,
    //     commitHash: string,
    //     label: string,
    // ): Promise<string>
    // getProfileAddr(username: string): Promise<string>
}

interface IGoshProfile extends IContract {
    address: string

    getName(): Promise<string>
    getDetails(): Promise<TProfileDetails>
    isOwner(pubkey: string): Promise<boolean>

    /** Old interface methods */
    setGoshAddr(addr: string): Promise<void>
    turnOn(walletAddr: string, pubkey: string): Promise<void>
    getCurrentGoshAddr(): Promise<string>
}

interface IGoshProfileDao extends IContract {
    address: string
}

interface IGoshDao extends IContract {
    address: string

    getDetails(): Promise<TDaoDetails>
    getWalletAddr(profileAddr: string, index: number): Promise<string>
    getWallets(): Promise<string[]>
    getProfiles(): Promise<{ profile: string; wallet: string }[]>
    getName(): Promise<string>
    getSmvRootTokenAddr(): Promise<string>
    getSmvProposalCode(): Promise<string>
    getSmvClientCode(): Promise<string>
    getOwner(): Promise<string>
    getOwnerWallet(keys?: KeyPair): Promise<IGoshWallet>
    isMember(profileAddr: string): Promise<boolean>
    mint(amount: number, recipient: string, daoOwnerKeys: KeyPair): Promise<void>
}

export { IGoshAdapter, IContract, IGosh, IGoshProfile, IGoshProfileDao, IGoshDao }
