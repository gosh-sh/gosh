import { Account } from '@eversdk/appkit';
import { ClientConfig, KeyPair } from '@eversdk/core';

export type TEverState = {
    config: ClientConfig;
};

export type TUserStatePersist = {
    phrase?: string;
    nonce?: string;
    pin?: string;
};

export type TUserState = TUserStatePersist & {
    keys?: KeyPair;
};

export type TGoshDaoDetails = {
    address: string;
    name: string;
    participants: string[];
    supply: number;
};

export type TGoshWalletDetails = {
    address: string;
    keys?: KeyPair;
    daoAddress: string;
};

export type TGoshRepoDetails = {
    address: string;
    name: string;
    branches: TGoshBranch[];
    head: string;
    tags: TGoshTagDetails[];
};

export type TGoshTagDetails = {
    commit: string;
    content: string;
};

export type TSmvBalanceDetails = {
    balance: number;
    smvBalance: number;
    smvLocked: number;
    smvBusy: boolean;
};

export type TGoshEventDetails = {
    address: string;
    id: string;
    params: any;
    time: { start: Date; finish: Date };
    votes: { yes: number; no: number };
    status: { completed: boolean; accepted: boolean };
};

export type TGoshBranch = {
    name: string;
    commitAddr: string;
};

export type TGoshCommitContent = {
    tree: string;
    author: string;
    committer: string;
    title: string;
    message: string;
};

export type TGoshCommit = {
    addr: string;
    addrRepo: string;
    branch: string;
    name: string;
    content: TGoshCommitContent;
    parents: string[];
};

export type TGoshCommitDetails = {
    address: string;
    repoAddress: string;
    branch: string;
    name: string;
    content: TGoshCommitContent;
    parents: string[];
};

export type TGoshTreeItem = {
    flags: number;
    mode: '040000' | '100644';
    type: 'tree' | 'blob';
    sha1: string;
    sha256: string;
    path: string;
    name: string;
};

export type TGoshTree = {
    [key: string]: TGoshTreeItem[];
};

export type TGoshDiff = {
    snap: string;
    patch: string | null;
    ipfs: string | null;
    commit: string;
    sha1: string;
};

export type TCreateCommitCallbackParams = {
    diffsPrepare?: boolean;
    treePrepare?: boolean;
    treeDeploy?: boolean;
    treeSet?: boolean;
    commitDeploy?: boolean;
    tagsDeploy?: boolean;
    completed?: boolean;
};

export interface ICreateCommitCallback {
    (params: TCreateCommitCallbackParams): void;
}

export enum EGoshBlobFlag {
    BINARY = 1,
    COMPRESSED = 2,
    IPFS = 4,
}

export enum EEventType {
    PR = 1,
}

interface IContract {
    abi: any;
    tvc?: string;
    account: Account;
}

export interface IGoshDaoCreator extends IContract {
    address: string;

    deployDao(name: string, rootPubkey: string): Promise<void>;
}
export interface IGoshRoot extends IContract {
    address: string;
    daoCreator: IGoshDaoCreator;

    createDao(name: string, rootPubkey: string): Promise<IGoshDao>;

    getDaoAddr(name: string): Promise<string>;
    getDaoWalletCode(pubkey: string): Promise<string>;
    getRepoAddr(name: string, daoName: string): Promise<string>;
    getDaoRepoCode(daoAddress: string): Promise<string>;
    getSmvPlatformCode(): Promise<string>;
    getTreeAddr(repoAddr: string, treeName: string): Promise<string>;
}

export interface IGoshDao extends IContract {
    address: string;
    daoCreator: IGoshDaoCreator;
    meta?: {
        name: string;
    };

    load(): Promise<void>;
    getDetails(): Promise<TGoshDaoDetails>;
    deployWallet(pubkey: string, keys: KeyPair): Promise<string>;
    getWalletAddr(pubkey: string, index: number): Promise<string>;
    getWallets(): Promise<string[]>;
    getName(): Promise<string>;
    getRootPubkey(): Promise<string>;
    getSmvRootTokenAddr(): Promise<string>;
    getSmvProposalCode(): Promise<string>;
    getSmvClientCode(): Promise<string>;
    mint(
        rootTokenAddr: string,
        amount: number,
        recipient: string,
        deployWalletValue: number,
        remainingGasTo: string,
        notify: boolean,
        payload: string,
        keys: KeyPair
    ): Promise<void>;
}

export interface IGoshWallet extends IContract {
    address: string;
    isDaoParticipant: boolean;

    getDao(): Promise<IGoshDao>;
    getRoot(): Promise<IGoshRoot>;
    getSmvLocker(): Promise<IGoshSmvLocker>;
    createCommit(
        repo: IGoshRepository,
        branch: TGoshBranch,
        pubkey: string,
        blobs: {
            name: string;
            modified: string | Buffer;
            original?: string | Buffer;
            isIpfs?: boolean;
        }[],
        message: string,
        tags?: string,
        parent2?: TGoshBranch,
        callback?: ICreateCommitCallback
    ): Promise<void>;

    getDaoAddr(): Promise<string>;
    getRootAddr(): Promise<string>;
    getPubkey(): Promise<string>;
    deployRepo(name: string): Promise<void>;
    deployBranch(
        repo: IGoshRepository,
        newName: string,
        fromName: string,
        fromCommit: string
    ): Promise<void>;
    deleteBranch(repo: IGoshRepository, branchName: string): Promise<void>;
    deployCommit(
        repo: IGoshRepository,
        branch: TGoshBranch,
        commitName: string,
        commitContent: string,
        parentAddrs: string[],
        treeAddr: string,
        diffs: TGoshDiff[]
    ): Promise<void>;
    deployTree(repo: IGoshRepository, items: TGoshTreeItem[]): Promise<string>;
    deployTag(repo: IGoshRepository, commitName: string, content: string): Promise<void>;
    deployNewSnapshot(
        repoAddr: string,
        branchName: string,
        commitName: string,
        filename: string,
        data: string,
        ipfs: string | null
    ): Promise<string>;
    deleteSnapshot(addr: string): Promise<void>;
    getSnapshotCode(branch: string, repoAddr: string): Promise<string>;
    getSnapshotAddr(
        repoAddr: string,
        branchName: string,
        filename: string
    ): Promise<string>;
    setTree(repoName: string, commitName: string, treeAddr: string): Promise<void>;
    setCommit(
        repoName: string,
        branchName: string,
        commitName: string,
        filesCount: number
    ): Promise<void>;
    startProposalForSetCommit(
        repoName: string,
        branchName: string,
        commitName: string,
        filesCount: number
    ): Promise<void>;
    getSmvLockerAddr(): Promise<string>;
    getSmvTokenBalance(): Promise<number>;
    getSmvClientAddr(lockerAddr: string, proposalId: string): Promise<string>;
    lockVoting(amount: number): Promise<void>;
    unlockVoting(amount: number): Promise<void>;
    voteFor(
        platformCode: string,
        clientCode: string,
        proposalAddr: string,
        choice: boolean,
        amount: number
    ): Promise<void>;
    tryProposalResult(proposalAddr: string): Promise<void>;
    updateHead(): Promise<void>;
    getTreeAddr(repoAddr: string, treeName: string): Promise<string>;
    getDiffAddr(
        repoName: string,
        commitName: string,
        index1: number,
        index2: number
    ): Promise<string>;
    setHead(repoName: string, branch: string): Promise<void>;
    addProtectedBranch(repoName: string, branchName: string): Promise<void>;
    deleteProtectedBranch(repoName: string, branchName: string): Promise<void>;
}

export interface IGoshRepository extends IContract {
    address: string;
    meta?: {
        name: string;
        branchCount: number;
        tags: {
            content: string;
            commit: string;
        }[];
    };

    load(): Promise<void>;
    getGoshRoot(): Promise<IGoshRoot>;
    getName(): Promise<string>;
    getBranches(): Promise<TGoshBranch[]>;
    getBranch(name: string): Promise<TGoshBranch>;
    getHead(): Promise<string>;
    getCommitAddr(commitSha: string): Promise<string>;
    getBlobAddr(blobName: string): Promise<string>;
    getTagCode(): Promise<string>;
    getTags(): Promise<{ content: string; commit: string }[]>;
    getGoshAddr(): Promise<string>;
    getSnapshotCode(branch: string): Promise<string>;
    getSnapshotAddr(branch: string, filename: string): Promise<string>;
}

export interface IGoshCommit extends IContract {
    address: string;
    meta?: {
        repoAddr: string;
        branchName: string;
        sha: string;
        content: TGoshCommitContent;
        parents: string[];
    };

    load(): Promise<void>;
    getDetails(): Promise<TGoshCommitDetails>;
    getCommit(): Promise<any>;
    getName(): Promise<string>;
    getParents(): Promise<string[]>;
    getBlobs(): Promise<string[]>;
    getTree(): Promise<string>;
    getDiffAddr(index1: number, index2: number): Promise<string>;
}

export interface IGoshDiff extends IContract {
    address: string;

    getNextAddr(): Promise<string>;
    getDiffs(): Promise<TGoshDiff[]>;
}

export interface IGoshSnapshot extends IContract {
    address: string;

    getName(): Promise<string>;
    getSnapshot(
        commitName: string,
        treeItem: TGoshTreeItem
    ): Promise<{ content: string | Buffer; patched: string; isIpfs: boolean }>;
    getRepoAddr(): Promise<string>;
}

export interface IGoshTree extends IContract {
    address: string;

    getTree(): Promise<{ tree: TGoshTreeItem[]; ipfs: string }>;
    getSha(): Promise<any>;
}

export interface IGoshTag extends IContract {
    address: string;
    meta?: {
        content: string;
    };

    load(): Promise<void>;
    getCommit(): Promise<string>;
    getContent(): Promise<string>;
}

export interface IGoshSmvProposal extends IContract {
    address: string;
    meta?: {
        id: string;
        votes: { yes: number; no: number };
        time: { start: Date; finish: Date };
        isCompleted: boolean | null;
        commit: {
            kind: string;
            repoName: string;
            branchName: string;
            commitName: string;
        };
    };

    load(): Promise<void>;
    getDetails(): Promise<TGoshEventDetails>;
    getId(): Promise<string>;
    getVotes(): Promise<{ yes: number; no: number }>;
    getTime(): Promise<{ start: Date; finish: Date }>;
    getGoshSetCommitProposalParams(): Promise<any>;
    getLockerAddr(): Promise<string>;
    isCompleted(): Promise<boolean | null>;
}

export interface IGoshSmvLocker extends IContract {
    address: string;
    meta?: {
        votesTotal: number;
        votesLocked: number;
        isBusy: boolean;
    };

    load(): Promise<void>;
    getVotes(): Promise<{ total: number; locked: number }>;
    getIsBusy(): Promise<boolean>;
}

export interface IGoshSmvClient extends IContract {
    address: string;

    getLockedAmount(): Promise<number>;
}

export interface IGoshSmvTokenRoot extends IContract {
    address: string;

    getTotalSupply(): Promise<number>;
}
