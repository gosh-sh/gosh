import { Account } from "@eversdk/appkit";
import { ClientConfig, KeyPair } from "@eversdk/core";


export type TEverState = {
    config: ClientConfig;
}

export type TUserState = {
    phrase?: string;
    keys?: KeyPair;
}

export type TAccountData = {
    address: string;
    balance: number;
    acc_type: number;
    acc_type_name: string;
    code?: string;
    data?: string;
}

export type TGoshBranch = {
    name: string;
    commitAddr: string;
    snapshot: string[];
}

export type TGoshCommitContent = {
    author: string;
    committer: string;
    title: string;
    message: string;
}

export type TGoshTreeItem = {
    mode: '040000' | '100644';
    type: 'tree' | 'blob';
    sha: string;
    path: string;
    name: string;
}

export type TGoshTree = {
    [key: string]: TGoshTreeItem[]
}

interface IContract {
    abi: any;
    tvc?: string;
    account: Account;
}

export interface IGoshDaoCreator extends IContract {
    address: string;

    deployDao(name: string, rootPubkey: string): Promise<void>;
    sendMoneyDao(name: string, value: number): Promise<void>;
    sendMoney(rootPubkey: string, pubkey: string, daoAddr: string, value: number): Promise<void>;
}
export interface IGoshRoot extends IContract {
    address: string;
    daoCreator: IGoshDaoCreator;

    deployDao(name: string, rootPubkey: string): Promise<string>;
    getDaoAddr(name: string): Promise<string>;
    getDaoWalletCode(pubkey: string): Promise<string>;
    getRepoAddr(name: string, daoName: string): Promise<string>;
    getDaoRepoCode(daoAddress: string): Promise<string>;
}

export interface IGoshDao extends IContract {
    address: string;
    daoCreator: IGoshDaoCreator;
    meta?: {
        name: string;
    };

    load(): Promise<void>;
    deployWallet(rootPubkey: string, pubkey: string): Promise<string>;
    getWalletAddr(rootPubkey: string, pubkey: string): Promise<string>;
    getName(): Promise<string>;
    getRootPubkey(): Promise<string>;
}

export interface IGoshWallet extends IContract {
    address: string;

    getDaoAddr(): Promise<string>;
    deployRepo(name: string): Promise<void>;
    createBranch(
        repoName: string,
        newName: string,
        fromName: string,
        filesCount: number
    ): Promise<void>;
    deleteBranch(repoName: string, branchName: string): Promise<void>;
    createCommit(
        repoName: string,
        branch: TGoshBranch,
        pubkey: string,
        blobs: { name: string; modified: string; original: string; }[],
        message: string,
        parent2?: TGoshBranch
    ): Promise<void>;
    deployCommit(
        repoName: string,
        branchName: string,
        commitName: string,
        commitData: string,
        parent1: string,
        parent2: string
    ): Promise<void>;
    deployBlob(
        repoName: string,
        commitName: string,
        blobName: string,
        blobContent: string,
        blobPrevSha: string
    ): Promise<void>;
    deployDiff(
        repoName: string,
        branchName: string,
        filePath: string,
        diff: string
    ): Promise<void>;
}

export interface IGoshRepository extends IContract {
    address: string;
    meta?: {
        name: string;
        branchCount: number;
    }

    load(): Promise<void>;
    getName(): Promise<string>;
    getBranches(): Promise<TGoshBranch[]>;
    getBranch(name: string): Promise<TGoshBranch>;
    getSnapshotAddr(branchName: string, filePath: string): Promise<string>;
    getCommitAddr(branchName: string, commitSha: string): Promise<string>;
}

export interface IGoshCommit extends IContract {
    address: string;
    meta?: {
        repoAddr: string;
        branchName: string;
        sha: string;
        content: TGoshCommitContent;
        parent1Addr: string;
        parent2Addr: string;
    }

    load(): Promise<void>;
    getCommit(): Promise<any>;
    getName(): Promise<string>;
    getParent(): Promise<string[]>;
    getBlobs(): Promise<string[]>;
    getBlobAddr(blobSha: string): Promise<string>;
}

export interface IGoshBlob extends IContract {
    address: string;
    meta?: {
        name: string;
        content: string;
        commitAddr: string;
        prevSha: string;
    }

    load(): Promise<void>;
    getBlob(): Promise<any>;
    getPrevSha(): Promise<string>;
}

export interface IGoshSnapshot extends IContract {
    address: string;
    meta?: {
        name: string;
        content: string;
    };

    load(): Promise<void>;
    getName(): Promise<string>;
    getSnapshot(): Promise<string>;
}
