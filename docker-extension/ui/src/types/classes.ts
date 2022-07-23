import { Account, AccountRunOptions, AccountType } from "@eversdk/appkit";
import { KeyPair, signerKeys, signerNone, TonClient } from "@eversdk/core";
import GoshDaoCreatorABI from "../contracts/daocreator.abi.json";
import GoshABI from "../contracts/gosh.abi.json";
import GoshDaoABI from "../contracts/goshdao.abi.json";
import GoshWalletABI from "../contracts/goshwallet.abi.json";
import GoshRepositoryABI from "../contracts/repository.abi.json";
import GoshCommitABI from "../contracts/commit.abi.json";
import GoshBlobABI from "../contracts/blob.abi.json";
import GoshSmvProposalABI from "../contracts/SMVProposal.abi.json";
import GoshSmvLockerABI from "../contracts/SMVTokenLocker.abi.json";
import GoshSmvClientABI from "../contracts/SMVClient.abi.json";
import GoshSmvTokenRootABI from "../contracts/TokenRoot.abi.json";
import {
    calculateSubtrees,
    getGoshDaoCreator,
    getRepoTree,
    getTreeFromItems,
    getTreeItemsFromPath,
    getBlobDiffPatch,
    sha1,
    sha1Tree,
    unixtimeWithTz,
    zstd,
    isMainBranch,
    loadFromIPFS,
    MAX_ONCHAIN_FILE_SIZE,
    saveToIPFS
} from "../utils/helpers";
import {
    IGoshBlob,
    TGoshBranch,
    IGoshCommit,
    IGoshRepository,
    IGoshRoot,
    IGoshDao,
    IGoshWallet,
    IGoshDaoCreator,
    TGoshCommitContent,
    IGoshSmvProposal,
    IGoshSmvLocker,
    IGoshSmvClient,
    IGoshSmvTokenRoot
} from "./types";
import { EGoshError, GoshError } from "./errors";
import { Buffer } from "buffer";


export class GoshDaoCreator implements IGoshDaoCreator {
    abi: any = GoshDaoCreatorABI;
    account: Account;
    address: string;

    constructor(client: TonClient, address: string) {
        this.address = address;
        this.account = new Account({ abi: this.abi }, { client, address });
    }

    async deployDao(name: string, rootPubkey: string): Promise<void> {
        await this.account.run('deployDao', { name, root_pubkey: rootPubkey });
    }
}
export class GoshRoot implements IGoshRoot {
    abi: any = GoshABI;
    account: Account;
    address: string;
    daoCreator: IGoshDaoCreator;

    constructor(client: TonClient, address: string) {
        this.address = address;
        this.daoCreator = getGoshDaoCreator(client);
        this.account = new Account({ abi: this.abi }, { client, address });
    }

    /**
     *  Deploy new DAO and wait until account is active
     * @param name DAO name
     * @param rootPubkey Creator's public key as `0x0000....`
     * @returns IGoshDao instance
     */
    async createDao(name: string, rootPubkey: string): Promise<IGoshDao> {
        // Get DAO address and check it's status
        const daoAddr = await this.getDaoAddr(name);
        console.debug('[Create DAO] - Address:', daoAddr);
        const dao = new GoshDao(this.account.client, daoAddr);
        const acc = await dao.account.getAccount();
        if (acc.acc_type === AccountType.active) {
            const daoRootPubkey = await dao.getRootPubkey();
            if (daoRootPubkey !== rootPubkey) throw new GoshError(EGoshError.DAO_EXISTS, { name });
            return dao;
        }

        // If DAO is not active (deployed), deploy and wait for status `active`
        await this.daoCreator.deployDao(name, rootPubkey);
        return new Promise((resolve) => {
            const interval = setInterval(async () => {
                const acc = await dao.account.getAccount();
                console.debug('[Create DAO] - Account:', acc);
                if (acc.acc_type === AccountType.active) {
                    clearInterval(interval);
                    resolve(dao);
                }
            }, 1500);
        });
    }

    async getDaoAddr(name: string): Promise<string> {
        const result = await this.account.runLocal('getAddrDao', { name });
        return result.decoded?.output.value0;
    }

    async getDaoWalletCode(pubkey: string): Promise<string> {
        const result = await this.account.runLocal('getDaoWalletCode', { pubkey });
        return result.decoded?.output.value0;
    }

    async getRepoAddr(name: string, daoName: string): Promise<string> {
        const result = await this.account.runLocal('getAddrRepository', { name, dao: daoName });
        return result.decoded?.output.value0;
    }

    async getDaoRepoCode(daoAddress: string): Promise<string> {
        const result = await this.account.runLocal('getRepoDaoCode', { dao: daoAddress });
        return result.decoded?.output.value0;
    }

    async getSmvPlatformCode(): Promise<string> {
        const result = await this.account.runLocal('getSMVPlatformCode', {});
        return result.decoded?.output.value0;
    }
}

export class GoshDao implements IGoshDao {
    abi: any = GoshDaoABI;
    account: Account;
    address: string;
    daoCreator: IGoshDaoCreator;
    meta?: IGoshDao['meta'];

    constructor(client: TonClient, address: string) {
        this.address = address;
        this.daoCreator = getGoshDaoCreator(client);
        this.account = new Account({ abi: this.abi }, { client, address });
    }

    async load(): Promise<void> {
        this.meta = {
            name: await this.getName()
        }
    }

    async deployWallet(rootPubkey: string, pubkey: string, keys: KeyPair): Promise<string> {
        if (!this.meta) await this.load();
        if (!this.meta?.name) throw new GoshError(EGoshError.META_LOAD, { type: 'dao', address: this.address });

        // Topup GoshDao, deploy and topup GoshWallet
        const walletAddr = await this.getWalletAddr(rootPubkey, pubkey);
        console.debug('[Deploy wallet] - GoshWallet addr:', walletAddr);
        const wallet = new GoshWallet(this.account.client, walletAddr);
        const acc = await wallet.account.getAccount();
        if (acc.acc_type !== AccountType.active) {
            // const daoBalance = await this.account.getBalance();
            // if (+daoBalance <= fromEvers(10000)) await this.getMoney(keys);
            await this.account.run('deployWallet', { pubkey }, { signer: signerKeys(keys) });
            await new Promise<void>((resolve) => {
                const interval = setInterval(async () => {
                    const acc = await wallet.account.getAccount();
                    console.debug('[Deploy wallet] - Account:', acc);
                    if (acc.acc_type === AccountType.active) {
                        clearInterval(interval);
                        resolve();
                    }
                }, 1500);
            });
        }

        // Check wallet SMV token balance and mint if needed
        const smvTokenBalance = await wallet.getSmvTokenBalance();
        console.debug('[Deploy wallet] - SMV token balance:', smvTokenBalance);
        if (!smvTokenBalance) {
            const rootTokenAddr = await this.getSmvRootTokenAddr();
            console.debug('[Deploy wallet] - Root token addr:', rootTokenAddr);
            await this.mint(rootTokenAddr, 100, walletAddr, 0, this.address, true, '', keys);
        }

        return walletAddr;
    }

    async getWalletAddr(rootPubkey: string, pubkey: string): Promise<string> {
        const result = await this.account.runLocal(
            'getAddrWallet',
            { pubkeyroot: rootPubkey, pubkey }
        );
        return result.decoded?.output.value0;
    }

    async getWallets(): Promise<string[]> {
        const result = await this.account.runLocal('getWallets', {});
        return result.decoded?.output.value0;
    }

    async getName(): Promise<string> {
        const result = await this.account.runLocal('getNameDao', {});
        return result.decoded?.output.value0;
    }

    async getRootPubkey(): Promise<string> {
        const result = await this.account.runLocal('getRootPubkey', {});
        return result.decoded?.output.value0;
    }

    async getSmvRootTokenAddr(): Promise<string> {
        const result = await this.account.runLocal('_rootTokenRoot', {});
        return result.decoded?.output._rootTokenRoot;
    }

    async getSmvProposalCode(): Promise<string> {
        const result = await this.account.runLocal('getProposalCode', {});
        return result.decoded?.output.value0;
    }

    async getSmvClientCode(): Promise<string> {
        const result = await this.account.runLocal('getClientCode', {});
        return result.decoded?.output.value0;
    }

    async mint(
        rootTokenAddr: string,
        amount: number,
        recipient: string,
        deployWalletValue: number,
        remainingGasTo: string,
        notify: boolean,
        payload: string,
        keys: KeyPair
    ): Promise<void> {
        await this.account.run(
            'mint',
            {
                tokenRoot: rootTokenAddr,
                amount,
                recipient,
                deployWalletValue,
                remainingGasTo,
                notify,
                payload
            },
            {
                signer: signerKeys(keys)
            }
        );
    }
}

export class GoshWallet implements IGoshWallet {
    abi: any = GoshWalletABI;
    account: Account;
    address: string;
    isDaoParticipant: boolean;

    constructor(client: TonClient, address: string, keys?: KeyPair) {
        this.address = address;
        this.isDaoParticipant = false;
        this.account = new Account(
            { abi: this.abi },
            {
                client,
                address,
                signer: keys ? signerKeys(keys) : signerNone()
            }
        );
    }

    async getDao(): Promise<IGoshDao> {
        const daoAddr = await this.getDaoAddr();
        const dao = new GoshDao(this.account.client, daoAddr);
        await dao.load();
        return dao;
    }

    async getRoot(): Promise<IGoshRoot> {
        const rootAddr = await this.getRootAddr();
        return new GoshRoot(this.account.client, rootAddr);
    }

    async getSmvLocker(): Promise<IGoshSmvLocker> {
        const addr = await this.getSmvLockerAddr();
        const locker = new GoshSmvLocker(this.account.client, addr);
        await locker.load()
        return locker;
    }

    async createCommit(
        repo: IGoshRepository,
        branch: TGoshBranch,
        pubkey: string,
        blobs: { name: string; modified: string; original: string; }[],
        message: string,
        parentBranch?: TGoshBranch
    ): Promise<void> {
        if (!repo.meta) await repo.load();
        if (!repo.meta?.name)
            throw new GoshError(EGoshError.META_LOAD, { type: 'repository', address: repo.address });
        const repoName = repo.meta.name;

        // Prepare blobs
        const _blobs = await Promise.all(
            blobs.map(async (blob) => {
                const patch = getBlobDiffPatch(blob.name, blob.modified, blob.original);
                return {
                    ...blob,
                    sha: sha1(blob.modified, 'blob'),
                    prevSha: blob.original ? sha1(blob.original, 'blob') : '',
                    patch
                }
            })
        );
        console.log('Blobs', _blobs);

        // Generate current branch full tree and get it's items (TGoshTreeItem[]).
        // Iterate over changed blobs, create TGoshTreeItem[] from blob path and push it
        // to full tree items list.
        // Store updated paths in separate variable
        const { items } = await getRepoTree(repo, branch);
        const updatedPaths: string[] = [];
        _blobs.forEach((blob) => {
            const blobPathItems = getTreeItemsFromPath(blob.name, blob.modified);
            console.debug('Blob path items:', blobPathItems);
            blobPathItems.forEach((pathItem) => {
                if (updatedPaths.findIndex((path) => path === pathItem.path) < 0) {
                    updatedPaths.push(pathItem.path);
                }

                const foundIndex = items.findIndex((item) => (
                    item.path === pathItem.path && item.name === pathItem.name
                ));
                if (foundIndex >= 0) items[foundIndex] = pathItem;
                else items.push(pathItem);
            });
        });
        console.debug('New tree items', items);
        console.debug('Updated paths', updatedPaths);

        // Build updated tree and get it's hash
        const updatedTree = getTreeFromItems(items);
        calculateSubtrees(updatedTree);
        const updatedTreeHash = sha1Tree(updatedTree['']);
        console.debug('Updated tree', updatedTree);
        console.debug('Updated tree hash', updatedTreeHash);

        // Build commit data and calculate commit name
        let parentCommitName = '';
        if (branch.commitAddr) {
            const commit = new GoshCommit(this.account.client, branch.commitAddr);
            parentCommitName = await commit.getName();
        }
        let parentBranchCommitName = '';
        if (parentBranch?.commitAddr) {
            const commit = new GoshCommit(this.account.client, parentBranch.commitAddr);
            parentBranchCommitName = await commit.getName();
        }
        const fullCommit = [
            `tree ${updatedTreeHash}`,
            parentCommitName ? `parent ${parentCommitName}` : null,
            parentBranchCommitName ? `parent ${parentBranchCommitName}` : null,
            `author ${pubkey} <${pubkey}@gosh.sh> ${unixtimeWithTz()}`,
            `committer ${pubkey} <${pubkey}@gosh.sh> ${unixtimeWithTz()}`,
            '',
            message
        ];
        const commitData = fullCommit.filter((item) => item !== null).join('\n')
        const commitName = sha1(commitData, 'commit');
        console.debug('[createCommit]: Commit data', commitData);
        console.debug('[createCommit]: Commit name', commitName);

        // Prepare blobs to deploy
        //  - Promises for tree blobs deploy;
        //  - Promises for common blobs deploy
        const blobsToDeploy: { name: string[]; fn: Function[]; } = { name: [], fn: [] };
        for (let i = 0; i < updatedPaths.length; i += 30) {
            const chunk = updatedPaths.slice(i, i + 30);
            await new Promise((resolve) => setInterval(resolve, 1500));
            await Promise.all(
                chunk.map(async (path) => {
                    const subtree = updatedTree[path];
                    const subtreeHash = sha1Tree(subtree);
                    const blobContent = subtree.map((item) => (
                        `${item.mode} ${item.type} ${item.sha}\t${item.name}`
                    )).join('\n');

                    console.debug('[createCommit] - Tree blob content uncompressed:', blobContent);
                    const compressed = await zstd.compress(this.account.client, blobContent);
                    console.debug('[createCommit] - Tree blob content compressed:', compressed);

                    let content = '';
                    let ipfsCID = '';
                    if (compressed.length > MAX_ONCHAIN_FILE_SIZE) {
                        console.debug('[createCommit] - Save blob to ipfs');
                        ipfsCID = await saveToIPFS(compressed);
                    } else {
                        content = compressed;
                    }
                    console.debug('[createCommit] - Blob content/ipfs:', content, ipfsCID);

                    blobsToDeploy.name.push(`tree ${subtreeHash}`);
                    blobsToDeploy.fn.push(() => (
                        this.deployBlob(
                            repoName,
                            branch.name,
                            commitName,
                            `tree ${subtreeHash}`,
                            content,
                            ipfsCID,
                            0,
                            ''
                        )
                    ));
                })
            );
        }

        for (let i = 0; i < _blobs.length; i += 30) {
            const chunk = _blobs.slice(i, i + 30);
            await new Promise((resolve) => setInterval(resolve, 1500));
            await Promise.all(
                chunk.map(async (blob) => {
                    // console.debug('[createCommit] - Blob patch uncompressed:', blob.name, blob.patch);
                    // const compressed = await zstd.compress(this.account.client, blob.patch);
                    // console.debug('[createCommit] - Blob patch compressed:', blob.name, compressed);
                    console.debug('[createCommit] - Blob content uncompressed:', blob.name, blob.modified);
                    const compressed = await zstd.compress(this.account.client, blob.modified);
                    console.debug('[createCommit] - Blob content compressed:', blob.name, compressed);

                    let content = '';
                    let ipfsCID = '';
                    if (compressed.length > MAX_ONCHAIN_FILE_SIZE) {
                        console.debug('[createCommit] - Save blob to ipfs');
                        ipfsCID = await saveToIPFS(compressed);
                    } else {
                        content = compressed;
                    }
                    console.debug('[createCommit] - Blob content/ipfs:', content, ipfsCID);

                    blobsToDeploy.name.push(`blob ${blob.sha}`);
                    blobsToDeploy.fn.push(() => (
                        this.deployBlob(
                            repoName,
                            branch.name,
                            commitName,
                            `blob ${blob.sha}`,
                            content,
                            ipfsCID,
                            0,
                            blob.prevSha
                        )
                    ));
                })
            );
        }
        console.debug('Blobs to deploy', blobsToDeploy);

        // Deploy commit and blobs
        const parents = [branch.commitAddr, parentBranch?.commitAddr]
            .reduce((filtered: string[], item) => {
                if (!!item) filtered.push(item);
                return filtered;
            }, []);
        console.debug('[Create commit] - Parents:', parents);
        console.debug('[Create commit] - Args:', repoName, branch.name, commitName, commitData, parents);
        await this.deployCommit(repoName, branch.name, commitName, commitData, parents);
        console.debug('[Create commit] - Commit deployed');

        // Deploy blobs
        for (let i = 0; i < blobsToDeploy.fn.length; i += 10) {
            await new Promise((resolve) => setInterval(resolve, 2000));
            const chunk = blobsToDeploy.fn.slice(i, i + 10);
            await Promise.all(chunk.map(async (fn) => await fn()));
            console.debug('[Create commit] - Blobs chunk:', i, i + 10);
        }
        console.debug('[Create commit] - Blobs deployed');

        // Set blobs for commit
        const blobAddrs: string[] = [];
        for (let i = 0; i < blobsToDeploy.name.length; i += 30) {
            const chunk = blobsToDeploy.name.slice(i, i + 30);
            await new Promise((resolve) => setInterval(resolve, 1500));
            await Promise.all(
                chunk.map(async (name) => {
                    const blobAddr = await repo.getBlobAddr(name);
                    blobAddrs.push(blobAddr);
                })
            );
        }
        console.debug('Blobs addrs:', blobAddrs);

        for (let i = 0; i < blobAddrs.length; i += 50) {
            await new Promise((resolve) => setInterval(resolve, 1500));
            const chunk = blobAddrs.slice(i, i + 50);
            await this.setBlobs(repoName, commitName, chunk);
        }
        console.debug('[Create commit] - Set blobs: OK');

        // Set repo commit if not proposal or start new proposal
        if (!isMainBranch(branch.name)) {
            await this.setCommit(repoName, branch.name, commitName, branch.commitAddr);
            await new Promise<void>((resolve) => {
                const interval = setInterval(async () => {
                    const upd = await repo.getBranch(branch.name);
                    console.debug('[Create commit] - Branches (curr/upd):', branch, upd);
                    if (upd.commitAddr !== branch.commitAddr) {
                        clearInterval(interval);
                        resolve();
                    }
                }, 1500);
            });
        } else {
            await this.startProposalForSetCommit(repoName, branch.name, commitName, branch.commitAddr);
        }
        // TODO: Remove when wasm error on high load fixed
        await new Promise((resolve) => setInterval(resolve, 2000));
    }

    async getMoney(): Promise<void> {
        await this.account.run('getMoney', {});
    }

    async getDaoAddr(): Promise<string> {
        const result = await this.account.runLocal('getAddrDao', {});
        return result.decoded?.output.value0;
    }

    async getRootAddr(): Promise<string> {
        const result = await this.account.runLocal('getAddrRootGosh', {});
        return result.decoded?.output.value0;
    }

    async getPubkey(): Promise<string> {
        const result = await this.account.runLocal('getWalletPubkey', {});
        return result.decoded?.output.value0;
    }

    async deployRepo(name: string): Promise<void> {
        // Get repo instance, check if it is not deployed
        const dao = await this.getDao();
        if (!dao.meta?.name)
            throw new GoshError(EGoshError.META_LOAD, { type: 'dao', address: dao.address });

        const root = await this.getRoot();
        const repoAddr = await root.getRepoAddr(name, dao.meta.name);
        const repo = new GoshRepository(this.account.client, repoAddr);
        const acc = await repo.account.getAccount();
        if (acc.acc_type === AccountType.active) return;

        // If repo is not deployed, deploy and wait for status `active`
        await this.run('deployRepository', { nameRepo: name });
        return new Promise((resolve) => {
            const interval = setInterval(async () => {
                const acc = await repo.account.getAccount();
                console.debug('[Deploy repo] - Account:', acc);
                if (acc.acc_type === AccountType.active) {
                    clearInterval(interval);
                    resolve();
                }
            }, 1500);
        });
    }

    async deployBranch(repo: IGoshRepository, newName: string, fromName: string): Promise<void> {
        if (!repo.meta) await repo.load();
        if (!repo.meta?.name)
            throw new GoshError(EGoshError.META_LOAD, { type: 'repository', address: repo.address });

        // Check if branch already exists
        const branch = await repo.getBranch(newName);
        if (branch.name === newName) return;

        // Deploy new branch and wait for branch is deployed and all snapshots are copied
        await this.run('deployBranch', { repoName: repo.meta.name, newName, fromName });
        return new Promise((resolve) => {
            const interval = setInterval(async () => {
                const branch = await repo.getBranch(newName);
                console.debug('[Deploy branch] - Branch:', branch);
                if (branch.name === newName) {
                    clearInterval(interval);
                    resolve();
                }
            }, 1500);
        });
    }

    async deleteBranch(repo: IGoshRepository, branchName: string): Promise<void> {
        if (!repo.meta) await repo.load();
        if (!repo.meta?.name)
            throw new GoshError(EGoshError.META_LOAD, { type: 'repository', address: repo.address });

        // Check if branch exists
        const branch = await repo.getBranch(branchName);
        if (!branch.name) return;

        // Delete branch and wait for it to be deleted
        await this.run('deleteBranch', { repoName: repo.meta.name, Name: branchName });
        return new Promise((resolve) => {
            const interval = setInterval(async () => {
                const branch = await repo.getBranch(branchName);
                console.debug('[Delete branch] - Branch:', branch);
                if (!branch.name) {
                    clearInterval(interval);
                    resolve();
                }
            }, 1500);
        });
    }

    async deployCommit(
        repoName: string,
        branchName: string,
        commitName: string,
        commitData: string,
        parents: string[]
    ): Promise<void> {
        await this.run(
            'deployCommit',
            { repoName, branchName, commitName, fullCommit: commitData, parents }
        );
    }

    async deployBlob(
        repoName: string,
        branchName: string,
        commitName: string,
        blobName: string,
        blobContent: string,
        blobIpfs: string,
        blobFlags: number,
        blobPrevSha: string
    ): Promise<void> {
        await this.run(
            'deployBlob',
            {
                repoName,
                branch: branchName,
                commit: commitName,
                blobName,
                fullBlob: blobContent,
                ipfsBlob: blobIpfs,
                flags: blobFlags,
                prevSha: blobPrevSha
            }
        );
    }

    async setCommit(
        repoName: string,
        branchName: string,
        commitName: string,
        branchCommit: string
    ): Promise<void> {
        console.debug('[Set commmit]:', repoName, branchName, commitName, `"${branchCommit}"`);
        await this.run(
            'setCommit',
            { repoName, branchName, commit: commitName, branchcommit: branchCommit }
        );
    }

    async startProposalForSetCommit(
        repoName: string,
        branchName: string,
        commitName: string,
        branchCommit: string
    ): Promise<void> {
        console.debug('[Start proposal]:', repoName, branchName, commitName, `"${branchCommit}"`);
        await this.run(
            'startProposalForSetCommit',
            { repoName, branchName, commit: commitName, branchcommit: branchCommit }
        );
    }

    async setBlobs(repoName: string, commitName: string, blobAddr: string[]): Promise<void> {
        await this.run('setBlob', { repoName, commitName, blobs: blobAddr });
    }

    async getSmvLockerAddr(): Promise<string> {
        const result = await this.account.runLocal('tip3VotingLocker', {});
        return result.decoded?.output.tip3VotingLocker;
    }

    async getSmvClientAddr(lockerAddr: string, proposalId: string): Promise<string> {
        const result = await this.account.runLocal(
            'clientAddress',
            { _tip3VotingLocker: lockerAddr, propId: proposalId }
        );
        return result.decoded?.output.value0;
    }

    async getSmvTokenBalance(): Promise<number> {
        const result = await this.account.runLocal('_tokenBalance', {});
        return +result.decoded?.output._tokenBalance;
    }

    async lockVoting(amount: number): Promise<void> {
        await this.run('lockVoting', { amount });
    }

    async unlockVoting(amount: number): Promise<void> {
        await this.run('unlockVoting', { amount });
    }

    async tryProposalResult(proposalAddr: string): Promise<void> {
        await this.run('tryProposalResult', { proposal: proposalAddr });
    }

    async voteFor(
        platformCode: string,
        clientCode: string,
        proposalAddr: string,
        choice: boolean,
        amount: number
    ): Promise<void> {
        await this.run(
            'voteFor',
            { platformCode, clientCode, proposal: proposalAddr, choice, amount }
        )
    }

    async updateHead(): Promise<void> {
        await this.run('updateHead', {});
    }

    async run(functionName: string, input: object, options?: AccountRunOptions): Promise<void> {
        // Check wallet balance and topup if needed
        // const balance = await this.account.getBalance();
        // if (+balance <= fromEvers(10000)) await this.getMoney();

        // Run contract
        await this.account.run(functionName, input, options);
    }
}

export class GoshRepository implements IGoshRepository {
    abi: any = GoshRepositoryABI;
    account: Account;
    address: string;
    meta?: IGoshRepository['meta'];

    constructor(client: TonClient, address: string) {
        this.address = address;
        this.account = new Account({ abi: this.abi }, { client, address });
    }

    async load(): Promise<void> {
        const branches = await this.getBranches();
        this.meta = {
            name: await this.getName(),
            branchCount: branches.length
        }
    }

    async getName(): Promise<string> {
        const result = await this.account.runLocal('getName', {});
        return result.decoded?.output.value0;
    }

    async getBranches(): Promise<TGoshBranch[]> {
        const result = await this.account.runLocal('getAllAddress', {});
        return result.decoded?.output.value0.map((item: any) => ({
            name: item.key,
            commitAddr: item.value
        }));
    }

    async getBranch(name: string): Promise<TGoshBranch> {
        const result = await this.account.runLocal('getAddrBranch', { name });
        const decoded = result.decoded?.output.value0;
        return {
            name: decoded.key,
            commitAddr: decoded.value
        }
    }

    async getCommitAddr(commitSha: string): Promise<string> {
        const result = await this.account.runLocal('getCommitAddr', { nameCommit: commitSha });
        return result.decoded?.output.value0;
    }

    async getBlobAddr(blobName: string): Promise<string> {
        const result = await this.account.runLocal('getBlobAddr', { nameBlob: blobName });
        return result.decoded?.output.value0;
    }
}

export class GoshCommit implements IGoshCommit {
    abi: any = GoshCommitABI;
    account: Account;
    address: string;
    meta?: IGoshCommit['meta']

    constructor(client: TonClient, address: string) {
        this.address = address;
        this.account = new Account({ abi: this.abi }, { client, address });
    }

    async load(): Promise<void> {
        const meta = await this.getCommit();
        this.meta = {
            repoAddr: meta.repo,
            branchName: meta.branch,
            sha: meta.sha,
            content: GoshCommit.parseContent(meta.content),
            parents: meta.parents
        }
    }

    async getCommit(): Promise<any> {
        const result = await this.account.runLocal('getCommit', {});
        return result.decoded?.output;
    }

    async getName(): Promise<string> {
        const result = await this.account.runLocal('getNameCommit', {});
        return result.decoded?.output.value0;
    }

    async getParents(): Promise<string[]> {
        const result = await this.account.runLocal('getParents', {});
        return result.decoded?.output.value0;
    }

    async getBlobs(): Promise<string[]> {
        const result = await this.account.runLocal('getBlobs', {});
        return result.decoded?.output.value0;
    }

    static parseContent(content: string): TGoshCommitContent {
        const splitted = content.split('\n');

        const commentIndex = splitted.findIndex((v) => v === '');
        const commentData = splitted.slice(commentIndex + 1);
        const [title, ...message] = commentData;
        const parsed: { [key: string]: string } = {
            title,
            message: message.filter((v) => v).join('\n')
        };

        const commitData = splitted.slice(0, commentIndex);
        commitData.forEach((item) => {
            ['tree', 'author', 'committer'].forEach((key) => {
                if (item.search(key) >= 0) parsed[key] = item.replace(`${key} `, '');
            });
        });
        return parsed as TGoshCommitContent;
    }
}

export class GoshBlob implements IGoshBlob {
    abi: any = GoshBlobABI;
    account: Account;
    address: string;
    meta?: IGoshBlob['meta'];

    constructor(client: TonClient, address: string) {
        this.address = address;
        this.account = new Account({ abi: this.abi }, { client, address });
    }

    async load(): Promise<void> {
        const meta = await this.getBlob();

        if (meta.ipfs) {
            const loaded = await loadFromIPFS(meta.ipfs);
            meta.content = loaded.toString();
        }
        meta.content = await zstd.decompress(this.account.client, meta.content, false);
        // TODO: check for binary and set `meta.content=decompressed`
        meta.content = Buffer.from(meta.content, 'base64').toString();

        this.meta = {
            name: meta.sha,
            content: meta.content,
            ipfs: meta.ipfs,
            flags: meta.flags,
            commitAddr: meta.commit,
            prevSha: await this.getPrevSha()
        }
    }

    async getBlob(): Promise<any> {
        const result = await this.account.runLocal('getBlob', {});
        return result.decoded?.output;
    }

    async getPrevSha(): Promise<string> {
        const result = await this.account.runLocal('getprevSha', {});
        return result.decoded?.output.value0;
    }
}

export class GoshSmvProposal implements IGoshSmvProposal {
    abi: any = GoshSmvProposalABI;
    address: string;
    account: Account;
    meta?: IGoshSmvProposal['meta'];

    constructor(client: TonClient, address: string) {
        this.address = address;
        this.account = new Account({ abi: this.abi }, { client, address });
    }

    async load(): Promise<void> {
        const id = await this.getId();
        const params = await this.getGoshSetCommitProposalParams();
        const votes = await this.getVotes();
        const time = await this.getTime();
        const isCompleted = await this.isCompleted();
        this.meta = {
            id,
            votes,
            time,
            isCompleted,
            commit: {
                kind: params.proposalKind,
                repoName: params.repoName,
                branchName: params.branchName,
                commitName: params.commit
            }
        }
    }

    async getId(): Promise<string> {
        const result = await this.account.runLocal('propId', {});
        return result.decoded?.output.propId;
    }

    async getGoshSetCommitProposalParams(): Promise<any> {
        const result = await this.account.runLocal('getGoshSetCommitProposalParams', {});
        return result.decoded?.output;
    }

    async getVotes(): Promise<{ yes: number; no: number; }> {
        const yes = await this.account.runLocal('votesYes', {});
        const no = await this.account.runLocal('votesNo', {});
        return {
            yes: +yes.decoded?.output.votesYes,
            no: +no.decoded?.output.votesNo
        }
    }

    async getTime(): Promise<{ start: Date; finish: Date; }> {
        const start = await this.account.runLocal('startTime', {});
        const finish = await this.account.runLocal('finishTime', {});
        return {
            start: new Date(+start.decoded?.output.startTime * 1000),
            finish: new Date(+finish.decoded?.output.finishTime * 1000)
        }
    }

    async isCompleted(): Promise<boolean> {
        const result = await this.account.runLocal('_isCompleted', {});
        return !!result.decoded?.output.value0;
    }

    async getLockerAddr(): Promise<string> {
        const result = await this.account.runLocal('tokenLocker', {});
        return result.decoded?.output.tokenLocker;
    }
}

export class GoshSmvLocker implements IGoshSmvLocker {
    abi: any = GoshSmvLockerABI;
    account: Account;
    address: string;
    meta?: IGoshSmvLocker['meta'];

    constructor(client: TonClient, address: string) {
        this.address = address;
        this.account = new Account({ abi: this.abi }, { client, address });
    }

    async load(): Promise<void> {
        const votes = await this.getVotes();
        const isBusy = await this.getIsBusy();
        this.meta = {
            votesLocked: votes.locked,
            votesTotal: votes.total,
            isBusy
        }
    }

    async getVotes(): Promise<{ total: number; locked: number; }> {
        const total = await this.account.runLocal('total_votes', {});
        const locked = await this.account.runLocal('votes_locked', {});
        return {
            total: +total.decoded?.output.total_votes,
            locked: +locked.decoded?.output.votes_locked
        }
    }

    async getIsBusy(): Promise<boolean> {
        const result = await this.account.runLocal('lockerBusy', {});
        return result.decoded?.output.lockerBusy;
    }
}

export class GoshSmvClient implements IGoshSmvClient {
    abi: any = GoshSmvClientABI;
    account: Account;
    address: string;

    constructor(client: TonClient, address: string) {
        this.address = address;
        this.account = new Account({ abi: this.abi }, { client, address });
    }

    async getLockedAmount(): Promise<number> {
        const result = await this.account.runLocal('_getLockedAmount', {});
        return +result.decoded?.output.value0;
    }
}

export class GoshSmvTokenRoot implements IGoshSmvTokenRoot {
    abi: any = GoshSmvTokenRootABI;
    account: Account;
    address: string;

    constructor(client: TonClient, address: string) {
        this.address = address;
        this.account = new Account({ abi: this.abi }, { client, address });
    }

    async getTotalSupply(): Promise<number> {
        const result = await this.account.runLocal('totalSupply_', {});
        return +result.decoded?.output.totalSupply_;
    }
}
