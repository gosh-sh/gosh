import { Account, AccountRunOptions, AccountType } from '@eversdk/appkit';
import { KeyPair, signerKeys, signerNone, TonClient } from '@eversdk/core';
import GoshDaoCreatorABI from '../contracts/daocreator.abi.json';
import GoshABI from '../contracts/gosh.abi.json';
import GoshDaoABI from '../contracts/goshdao.abi.json';
import GoshWalletABI from '../contracts/goshwallet.abi.json';
import GoshRepositoryABI from '../contracts/repository.abi.json';
import GoshCommitABI from '../contracts/commit.abi.json';
import GoshDiffABI from '../contracts/diff.abi.json';
import GoshTreeABI from '../contracts/tree.abi.json';
import GoshSnapshotABI from '../contracts/snapshot.abi.json';
import GoshTagABI from '../contracts/tag.abi.json';
import GoshSmvProposalABI from '../contracts/SMVProposal.abi.json';
import GoshSmvLockerABI from '../contracts/SMVTokenLocker.abi.json';
import GoshSmvClientABI from '../contracts/SMVClient.abi.json';
import GoshSmvTokenRootABI from '../contracts/TokenRoot.abi.json';
import {
    calculateSubtrees,
    getGoshDaoCreator,
    getRepoTree,
    getTreeFromItems,
    getTreeItemsFromPath,
    sha1,
    sha1Tree,
    unixtimeWithTz,
    zstd,
    isMainBranch,
    loadFromIPFS,
    MAX_ONCHAIN_DIFF_SIZE,
    saveToIPFS,
    ZERO_COMMIT,
    getBlobDiffPatch,
} from '../helpers';
import {
    IGoshTree,
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
    IGoshSmvTokenRoot,
    ICreateCommitCallback,
    EGoshBlobFlag,
    TGoshTreeItem,
    IGoshTag,
    IGoshSnapshot,
    TGoshDiff,
    IGoshDiff,
} from './types';
import { EGoshError, GoshError } from './errors';
import { Buffer } from 'buffer';

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
            if (daoRootPubkey !== rootPubkey)
                throw new GoshError(EGoshError.DAO_EXISTS, { name });
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
        const result = await this.account.runLocal('getDaoWalletCode', {
            pubkey,
        });
        return result.decoded?.output.value0;
    }

    async getRepoAddr(name: string, daoName: string): Promise<string> {
        const result = await this.account.runLocal('getAddrRepository', {
            name,
            dao: daoName,
        });
        return result.decoded?.output.value0;
    }

    async getDaoRepoCode(daoAddress: string): Promise<string> {
        const result = await this.account.runLocal('getRepoDaoCode', {
            dao: daoAddress,
        });
        return result.decoded?.output.value0;
    }

    async getTreeAddr(repoAddr: string, treeName: string): Promise<string> {
        const result = await this.account.runLocal('getTreeAddr', {
            repo: repoAddr,
            treeName,
        });
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
            name: await this.getName(),
        };
    }

    async deployWallet(pubkey: string, keys: KeyPair): Promise<string> {
        if (!this.meta) await this.load();
        if (!this.meta?.name)
            throw new GoshError(EGoshError.META_LOAD, {
                type: 'dao',
                address: this.address,
            });

        // Topup GoshDao, deploy and topup GoshWallet
        const walletAddr = await this.getWalletAddr(pubkey, 0);
        console.debug('[Deploy wallet] - GoshWallet addr:', walletAddr);
        const wallet = new GoshWallet(this.account.client, walletAddr);
        const acc = await wallet.account.getAccount();
        if (acc.acc_type !== AccountType.active) {
            // const daoBalance = await this.account.getBalance();
            // if (+daoBalance <= fromEvers(10000)) await this.getMoney(keys);
            await this.account.run(
                'deployWallet',
                { pubkey },
                { signer: signerKeys(keys) }
            );
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
            await this.mint(
                rootTokenAddr,
                100,
                walletAddr,
                0,
                this.address,
                true,
                '',
                keys
            );
        }

        return walletAddr;
    }

    async getWalletAddr(pubkey: string, index: number): Promise<string> {
        const result = await this.account.runLocal('getAddrWallet', {
            pubkey,
            index,
        });
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
                payload,
            },
            {
                signer: signerKeys(keys),
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
                signer: keys ? signerKeys(keys) : signerNone(),
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
        await locker.load();
        return locker;
    }

    async createCommit(
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
        parentBranch?: TGoshBranch,
        callback?: ICreateCommitCallback
    ): Promise<void> {
        if (!repo.meta) await repo.load();
        if (!repo.meta?.name)
            throw new GoshError(EGoshError.META_LOAD, {
                type: 'repository',
                address: repo.address,
            });

        // Generate diff patches for blobs and deploy snapshots if needed
        // Generate current branch full tree and get it's items (TGoshTreeItem[]).
        // Iterate over changed blobs, create TGoshTreeItem[] from blob path and push it
        // to full tree items list.
        // Store updated paths in separate variable
        const { items } = await getRepoTree(repo, branch.commitAddr);
        const updatedPaths: string[] = [];
        const diffs: TGoshDiff[] = [];
        for (const blob of blobs) {
            const { name, modified, original, isIpfs = false } = blob;

            const addr = await this.deployNewSnapshot(repo.address, branch.name, name);
            console.debug('Snapshot addr:', addr);

            let flags = 0;
            let patch: string = '';
            let ipfs = null;
            if (!Buffer.isBuffer(modified) && !Buffer.isBuffer(original) && !isIpfs) {
                patch = getBlobDiffPatch(name, modified, original || '');
                patch = await zstd.compress(this.account.client, patch);
                patch = Buffer.from(patch, 'base64').toString('hex');

                if (Buffer.from(patch, 'hex').byteLength > MAX_ONCHAIN_DIFF_SIZE) {
                    const compressed = await zstd.compress(this.account.client, modified);
                    ipfs = await saveToIPFS(compressed);
                    flags |= EGoshBlobFlag.IPFS;
                }

                flags |= EGoshBlobFlag.COMPRESSED;
            } else {
                flags |= EGoshBlobFlag.IPFS | EGoshBlobFlag.COMPRESSED;

                let content = modified;
                if (Buffer.isBuffer(content)) {
                    content = content.toString('base64');
                    flags |= EGoshBlobFlag.BINARY;
                }
                content = await zstd.compress(this.account.client, content);
                ipfs = await saveToIPFS(content);
            }
            diffs.push({
                snapshotAddr: addr,
                patch: ipfs ? '' : patch,
                ipfs,
            });

            const blobPathItems = getTreeItemsFromPath(blob.name, blob.modified, flags);
            blobPathItems.forEach((pathItem) => {
                const pathIndex = updatedPaths.findIndex(
                    (path) => path === pathItem.path
                );
                if (pathIndex < 0) updatedPaths.push(pathItem.path);

                const itemIndex = items.findIndex(
                    (item) => item.path === pathItem.path && item.name === pathItem.name
                );
                if (itemIndex >= 0) items[itemIndex] = pathItem;
                else items.push(pathItem);
            });
        }
        console.debug('[Create commit] - New tree items:', items);
        console.debug('[Create commit] - Updated paths:', updatedPaths);

        // Build updated tree and updated hashes
        const updatedTree = getTreeFromItems(items);
        calculateSubtrees(updatedTree);
        const updatedTreeRootSha = sha1Tree(updatedTree['']);
        !!callback && callback({ diffsPrepare: true, treePrepare: true });
        console.debug('[Create commit] - Updated tree:', updatedTree);

        // Prepare commit
        const futureCommit = await this.prepareCommit(
            branch,
            updatedTreeRootSha,
            pubkey,
            message,
            parentBranch
        );
        console.debug('Future commit:', futureCommit);

        // Deploy tree blobs
        const treeRootAddr = await this.deployTree(repo, updatedTree['']);
        console.debug('Root tree addr:', treeRootAddr);
        for (let i = 0; i < updatedPaths.length; i++) {
            const path = updatedPaths[i];
            const subtree = updatedTree[path];
            const addr = await this.deployTree(repo, subtree);
            console.debug('Subtree addr:', addr);
        }
        !!callback && callback({ treeDeploy: true });

        // Deploy commit
        await this.deployCommit(
            repo,
            branch,
            futureCommit.name,
            futureCommit.content,
            futureCommit.parents,
            treeRootAddr,
            diffs
        );
        !!callback && callback({ commitDeploy: true });
        console.debug('[Create commit] - Commit name:', futureCommit.name);

        // Deploy tags
        const tagsList = tags ? tags.split(' ') : [];
        for (let i = 0; i < tagsList.length; i++) {
            console.debug('[Create commit] - Deploy tag:', i, tagsList[i]);
            await this.deployTag(repo, futureCommit.name, tagsList[i]);
        }
        !!callback && callback({ tagsDeploy: true });

        // Set tree
        await this.setTree(repo.meta.name, futureCommit.name, treeRootAddr);
        !!callback && callback({ treeSet: true });

        // Set repo commit if not proposal or start new proposal
        if (!isMainBranch(branch.name)) {
            await this.setCommit(
                repo.meta.name,
                branch.name,
                futureCommit.name,
                branch.commitAddr
            );
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
            await this.startProposalForSetCommit(
                repo.meta.name,
                branch.name,
                futureCommit.name,
                branch.commitAddr
            );
        }
        !!callback && callback({ completed: true });
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
            throw new GoshError(EGoshError.META_LOAD, {
                type: 'dao',
                address: dao.address,
            });

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

    async deployBranch(
        repo: IGoshRepository,
        newName: string,
        fromName: string
    ): Promise<void> {
        if (!repo.meta) await repo.load();
        if (!repo.meta?.name)
            throw new GoshError(EGoshError.META_LOAD, {
                type: 'repository',
                address: repo.address,
            });

        // Check if branch already exists
        const branch = await repo.getBranch(newName);
        if (branch.name === newName) return;

        // Deploy new branch
        await this.run('deployBranch', {
            repoName: repo.meta.name,
            newName,
            fromName,
        });

        // Get all snapshots from branch `from` and deploy to branch `to`
        const snapCode = await this.getSnapshotCode(fromName, repo.address);
        const snaps = await this.account.client.net.query_collection({
            collection: 'accounts',
            filter: { code: { eq: snapCode } },
            result: 'id',
        });
        console.debug('Snaps', snaps);
        await Promise.all(
            snaps.result.map(async (item) => {
                const snap = new GoshSnapshot(this.account.client, item.id);
                const name = await snap.getName();
                await this.deployNewBranchSnapshot(
                    newName,
                    fromName,
                    name.replace(`${fromName}/`, ''),
                    repo.address
                );
                console.debug(
                    'Deploy branch snapshot',
                    newName,
                    fromName,
                    name.replace(`${fromName}/`, '')
                );
            })
        );

        return new Promise((resolve) => {
            const interval = setInterval(async () => {
                const branch = await repo.getBranch(newName);
                console.debug('[Deploy branch] - Branch:', branch);
                if (branch.name === newName && branch.deployed === branch.need) {
                    clearInterval(interval);
                    resolve();
                }
            }, 1500);
        });
    }

    async deleteBranch(repo: IGoshRepository, branchName: string): Promise<void> {
        if (!repo.meta) await repo.load();
        if (!repo.meta?.name)
            throw new GoshError(EGoshError.META_LOAD, {
                type: 'repository',
                address: repo.address,
            });

        // Check if branch exists
        const branch = await repo.getBranch(branchName);
        if (!branch.name) return;

        // Get all snapshots from branch and delete
        const snapCode = await this.getSnapshotCode(branchName, repo.address);
        const snaps = await this.account.client.net.query_collection({
            collection: 'accounts',
            filter: { code: { eq: snapCode } },
            result: 'id',
        });
        console.debug('Snaps:', snaps);
        await Promise.all(
            snaps.result.map(async ({ id }) => {
                console.debug('Delete snapshot:', id);
                await this.deleteSnapshot(id);
            })
        );

        // Delete branch and wait for it to be deleted
        await this.run('deleteBranch', {
            repoName: repo.meta.name,
            Name: branchName,
        });
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
        repo: IGoshRepository,
        branch: TGoshBranch,
        commitName: string,
        commitContent: string,
        parentAddrs: string[],
        treeAddr: string,
        diffs: TGoshDiff[]
    ): Promise<void> {
        if (!repo.meta) await repo.load();
        if (!repo.meta?.name)
            throw new GoshError(EGoshError.META_LOAD, {
                type: 'repository',
                address: repo.address,
            });

        // Split diffs by chunks of diffs
        const chunked: any[] = [
            {
                addr: await this.getDiffAddr(repo.meta.name, commitName, 0),
                index: 0,
                items: [],
            },
        ];
        for (const { snapshotAddr, patch, ipfs } of diffs) {
            const chunk = chunked[chunked.length - 1];
            const item = { snap: snapshotAddr, patch, ipfs, commit: commitName };

            const chunkLen = Buffer.from(JSON.stringify(chunk.items)).byteLength;
            const itemLen = Buffer.from(JSON.stringify(item)).byteLength;
            if (chunkLen + itemLen < MAX_ONCHAIN_DIFF_SIZE) chunk.items.push(item);
            else {
                const index = chunked.length;
                const addr = await this.getDiffAddr(repo.meta.name, commitName, index);
                chunked.push({
                    addr,
                    index,
                    items: [item],
                });
            }
        }
        console.debug('Deploy commit diffs:', chunked);

        // Deploy diffs
        const repoName = repo.meta.name;
        await Promise.all(
            chunked.map(async (chunk) => {
                const last = chunk.index === chunked.length - 1;
                console.debug('Deploy diff', {
                    repoName,
                    branchName: branch.name,
                    branchcommit: branch.commitAddr,
                    commitName,
                    fullCommit: commitContent,
                    diffs: chunk.items,
                    index: chunk.index,
                    last,
                });
                await this.run('deployDiff', {
                    repoName,
                    branchName: branch.name,
                    branchcommit: branch.commitAddr,
                    commitName,
                    fullCommit: commitContent,
                    diffs: chunk.items,
                    index: chunk.index,
                    last,
                });
            })
        );

        // Deploy commit
        console.debug('Deploy commit', {
            repoName,
            branchName: branch.name,
            commitName,
            fullCommit: commitContent,
            parents: parentAddrs,
            diff: chunked[0].addr,
            tree: treeAddr,
        });
        await this.run('deployCommit', {
            repoName,
            branchName: branch.name,
            commitName,
            fullCommit: commitContent,
            parents: parentAddrs,
            diff: chunked[0].addr,
            tree: treeAddr,
        });
    }

    async deployTree(repo: IGoshRepository, items: TGoshTreeItem[]): Promise<string> {
        if (!repo.meta) throw new GoshError(EGoshError.NO_REPO);

        // Calculate tree sha and prepare content
        // const content = items
        //     .map(
        //         (item) =>
        //             `${item.flags} ${item.mode} ${item.type} ${item.sha}\t${item.name}`
        //     )
        //     .join('\n');

        const sha = sha1Tree(items);
        // const prepared = await zstd.compress(this.account.client, content);
        if (!sha) {
            const details = { items };
            throw new Error(
                `[Deploy blob] - Blob sha is not calculated (${JSON.stringify(details)})`
            );
        }

        // Blob name and check if not deployed
        const name = sha;
        // const name = `tree ${sha}`;
        const addr = await this.getTreeAddr(repo.address, name);
        const blob = new GoshTree(this.account.client, addr);
        const blobAcc = await blob.account.getAccount();
        if (blobAcc.acc_type === AccountType.active) {
            return addr;
        }

        // Upload to ipfs (if needed) and generate flags
        // let ipfs = '';
        // let flags = 0 | EGoshBlobFlag.COMPRESSED;
        // if (prepared.length > MAX_ONCHAIN_FILE_SIZE) {
        //     console.debug('[Deploy tree] - Save blob to ipfs');
        //     ipfs = await saveToIPFS(prepared);
        //     flags |= EGoshBlobFlag.IPFS;
        // }

        // Deploy tree and get address
        console.debug('Deploy tree\n', {
            repoName: repo.meta?.name,
            shaTree: name,
            datatree: items.map(({ flags, mode, type, name, sha }) => ({
                flags: flags.toString(),
                mode,
                typeObj: type,
                name,
                sha1: sha,
            })),
            ipfs: null,
        });
        await this.run('deployTree', {
            repoName: repo.meta?.name,
            shaTree: name,
            datatree: items.map(({ flags, mode, type, name, sha }) => ({
                flags: flags.toString(),
                mode,
                typeObj: type,
                name,
                sha1: sha,
            })),
            ipfs: null,
        });
        // await this.run('deployTree', {
        //     repoName: repo.meta?.name,
        //     treeName: name,
        //     fullTree: !ipfs ? prepared : '',
        //     ipfsTree: ipfs,
        //     flags,
        //     prevSha: '',
        // });
        return addr;
    }

    async deployTag(
        repo: IGoshRepository,
        commitName: string,
        content: string
    ): Promise<void> {
        const commitAddr = await repo.getCommitAddr(commitName);
        await this.run('deployTag', {
            repoName: repo.meta?.name,
            nametag: `tag ${sha1(content, 'tag')}`,
            nameCommit: commitName,
            content,
            commit: commitAddr,
        });
    }

    async deployNewBranchSnapshot(
        branch: string,
        fromBranch: string,
        name: string,
        repoAddr: string
    ): Promise<void> {
        await this.run('deployNewBranchSnapshot', {
            branch,
            oldbranch: fromBranch,
            name,
            repo: repoAddr,
        });
    }

    async deployNewSnapshot(
        repoAddr: string,
        branchName: string,
        filename: string
    ): Promise<string> {
        const addr = await this.getSnapshotAddr(repoAddr, branchName, filename);
        const snapshot = new GoshSnapshot(this.account.client, addr);

        let isDeployed = false;
        try {
            const snapshotAcc = await snapshot.account.getAccount();
            isDeployed = snapshotAcc.acc_type === AccountType.active;
        } catch {
            console.debug('Snapshot does not exist');
        }

        if (!isDeployed) {
            await this.run('deployNewSnapshot', {
                branch: branchName,
                repo: repoAddr,
                name: filename,
            });
        }

        return addr;
    }

    async deleteSnapshot(addr: string): Promise<void> {
        await this.run('deleteSnapshot', { snap: addr });
    }

    async getSnapshotCode(branch: string, repoAddr: string): Promise<string> {
        const result = await this.account.runLocal('getSnapshotCode', {
            branch,
            repo: repoAddr,
        });
        return result.decoded?.output.value0;
    }

    async getSnapshotAddr(
        repoAddr: string,
        branchName: string,
        filename: string
    ): Promise<string> {
        const result = await this.account.runLocal('getSnapshotAddr', {
            branch: branchName,
            repo: repoAddr,
            name: filename,
        });
        return result.decoded?.output.value0;
    }

    async setTree(repoName: string, commitName: string, treeAddr: string): Promise<void> {
        await this.run('setTree', { repoName, commitName, tree: treeAddr });
    }

    async setCommit(
        repoName: string,
        branchName: string,
        commitName: string,
        branchCommit: string
    ): Promise<void> {
        console.debug(
            '[Set commmit]:',
            repoName,
            branchName,
            commitName,
            `"${branchCommit}"`
        );
        await this.run('setCommit', {
            repoName,
            branchName,
            commit: commitName,
            branchcommit: branchCommit,
        });
    }

    async startProposalForSetCommit(
        repoName: string,
        branchName: string,
        commitName: string,
        branchCommit: string
    ): Promise<void> {
        console.debug(
            '[Start proposal]:',
            repoName,
            branchName,
            commitName,
            `"${branchCommit}"`
        );
        await this.run('startProposalForSetCommit', {
            repoName,
            branchName,
            commit: commitName,
            branchcommit: branchCommit,
        });
    }

    async getTreeAddr(repoAddr: string, treeName: string): Promise<string> {
        const result = await this.account.runLocal('getTreeAddr', {
            commit: '',
            repo: repoAddr,
            treeName,
        });
        return result.decoded?.output.value0;
    }

    async getDiffAddr(
        repoName: string,
        commitName: string,
        index: number
    ): Promise<string> {
        const result = await this.account.runLocal('getDiffAddr', {
            reponame: repoName,
            commitName,
            index,
        });
        return result.decoded?.output.value0;
    }

    async getSmvLockerAddr(): Promise<string> {
        const result = await this.account.runLocal('tip3VotingLocker', {});
        return result.decoded?.output.tip3VotingLocker;
    }

    async getSmvClientAddr(lockerAddr: string, proposalId: string): Promise<string> {
        const result = await this.account.runLocal('clientAddress', {
            _tip3VotingLocker: lockerAddr,
            propId: proposalId,
        });
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
        await this.run('voteFor', {
            platformCode,
            clientCode,
            proposal: proposalAddr,
            choice,
            amount,
        });
    }

    async updateHead(): Promise<void> {
        await this.run('updateHead', {});
    }

    async run(
        functionName: string,
        input: object,
        options?: AccountRunOptions
    ): Promise<void> {
        // Check wallet balance and topup if needed
        // const balance = await this.account.getBalance();
        // if (+balance <= fromEvers(10000)) await this.getMoney();

        // Run contract
        await this.account.run(functionName, input, options);
    }

    private async prepareCommit(
        branch: TGoshBranch,
        treeRootSha: string,
        authorPubkey: string,
        message: string,
        parentBranch?: TGoshBranch
    ): Promise<{ name: string; content: string; parents: string[] }> {
        // Build commit data and calculate commit name
        let parentCommitName = '';
        if (branch.commitAddr) {
            const commit = new GoshCommit(this.account.client, branch.commitAddr);
            const name = await commit.getName();
            if (name !== ZERO_COMMIT) parentCommitName = name;
        }

        let parentBranchCommitName = '';
        if (parentBranch?.commitAddr) {
            const commit = new GoshCommit(this.account.client, parentBranch.commitAddr);
            const name = await commit.getName();
            if (name !== ZERO_COMMIT) parentBranchCommitName = name;
        }

        const fullCommit = [
            `tree ${treeRootSha}`,
            parentCommitName ? `parent ${parentCommitName}` : null,
            parentBranchCommitName ? `parent ${parentBranchCommitName}` : null,
            `author ${authorPubkey} <${authorPubkey}@gosh.sh> ${unixtimeWithTz()}`,
            `committer ${authorPubkey} <${authorPubkey}@gosh.sh> ${unixtimeWithTz()}`,
            '',
            message,
        ];

        const parents = [branch.commitAddr, parentBranch?.commitAddr].reduce(
            (filtered: string[], item) => {
                if (!!item) filtered.push(item);
                return filtered;
            },
            []
        );

        const commitData = fullCommit.filter((item) => item !== null).join('\n');
        const commitName = sha1(commitData, 'commit');

        return { name: commitName, content: commitData, parents };
    }

    private async prepareBlobContent(
        content: string | Buffer
    ): Promise<{ sha: string; prepared: string }> {
        const contentSha = sha1(content, 'blob');
        let prepared = Buffer.isBuffer(content) ? content.toString('base64') : content;
        prepared = await zstd.compress(this.account.client, prepared);
        return { sha: contentSha, prepared };
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
        const tags = await this.getTags();

        this.meta = {
            name: await this.getName(),
            branchCount: branches.length,
            tags,
        };
    }

    async getGoshRoot(): Promise<IGoshRoot> {
        const addr = await this.getGoshAddr();
        return new GoshRoot(this.account.client, addr);
    }

    async getName(): Promise<string> {
        const result = await this.account.runLocal('getName', {});
        return result.decoded?.output.value0;
    }

    async getBranches(): Promise<TGoshBranch[]> {
        const result = await this.account.runLocal('getAllAddress', {});
        return result.decoded?.output.value0.map((item: any) => ({
            name: item.key,
            commitAddr: item.value,
            deployed: +item.deployed,
            need: +item.need,
        }));
    }

    async getBranch(name: string): Promise<TGoshBranch> {
        const result = await this.account.runLocal('getAddrBranch', { name });
        const decoded = result.decoded?.output.value0;
        return {
            name: decoded.key,
            commitAddr: decoded.value,
            deployed: +decoded.deployed,
            need: +decoded.need,
        };
    }

    async getCommitAddr(commitSha: string): Promise<string> {
        const result = await this.account.runLocal('getCommitAddr', {
            nameCommit: commitSha,
        });
        return result.decoded?.output.value0;
    }

    async getBlobAddr(blobName: string): Promise<string> {
        const result = await this.account.runLocal('getBlobAddr', {
            nameBlob: blobName,
        });
        return result.decoded?.output.value0;
    }

    async getTagCode(): Promise<string> {
        const result = await this.account.runLocal('getTagCode', {});
        return result.decoded?.output.value0;
    }

    async getTags(): Promise<{ content: string; commit: string }[]> {
        const tagCode = await this.getTagCode();
        const tagCodeHash = await this.account.client.boc.get_boc_hash({
            boc: tagCode,
        });

        const result = await this.account.client.net.query_collection({
            collection: 'accounts',
            filter: {
                code_hash: { eq: tagCodeHash.hash },
            },
            result: 'id',
        });

        const tags = await Promise.all(
            result.result.map(async (item) => {
                const tag = new GoshTag(this.account.client, item.id);
                await tag.load();
                return tag.meta;
            })
        );
        return tags.reduce((t: any, item) => {
            if (item) t.push(item);
            return t;
        }, []);
    }

    async getGoshAddr(): Promise<string> {
        const result = await this.account.runLocal('getGoshAdress', {});
        return result.decoded?.output.value0;
    }

    async getSnapshotCode(branch: string): Promise<string> {
        const result = await this.account.runLocal('getSnapCode', { branch });
        return result.decoded?.output.value0;
    }

    async getSnapshotAddr(branch: string, filename: string): Promise<string> {
        const result = await this.account.runLocal('getSnapshotAddr', {
            branch,
            name: filename,
        });
        return result.decoded?.output.value0;
    }
}

export class GoshCommit implements IGoshCommit {
    abi: any = GoshCommitABI;
    account: Account;
    address: string;
    meta?: IGoshCommit['meta'];

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
            parents: meta.parents,
        };
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

    async getTree(): Promise<string> {
        const result = await this.account.runLocal('gettree', {});
        return result.decoded?.output.value0;
    }

    async getNextAddr(): Promise<string> {
        const result = await this.account.runLocal('getNextAdress', {});
        return result.decoded?.output.value0;
    }

    static parseContent(content: string): TGoshCommitContent {
        const splitted = content.split('\n');

        const commentIndex = splitted.findIndex((v) => v === '');
        const commentData = splitted.slice(commentIndex + 1);
        const [title, ...message] = commentData;
        const parsed: { [key: string]: string } = {
            title,
            message: message.filter((v) => v).join('\n'),
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

export class GoshDiff implements IGoshDiff {
    abi: any = GoshDiffABI;
    account: Account;
    address: string;

    constructor(client: TonClient, address: string) {
        this.address = address;
        this.account = new Account({ abi: this.abi }, { client, address });
    }

    async getNextAddr(): Promise<string> {
        const result = await this.account.runLocal('getNextAdress', {});
        return result.decoded?.output.value0;
    }
}

export class GoshSnapshot implements IGoshSnapshot {
    abi: any = GoshSnapshotABI;
    account: Account;
    address: string;

    constructor(client: TonClient, address: string) {
        this.address = address;
        this.account = new Account({ abi: this.abi }, { client, address });
    }

    async getName(): Promise<string> {
        const result = await this.account.runLocal('getName', {});
        return result.decoded?.output.value0;
    }

    async getSnapshot(
        commitName: string,
        treeItem: TGoshTreeItem
    ): Promise<{ content: string | Buffer; patched: string; isIpfs: boolean }> {
        // Read snapshot data
        let patched = '';
        let ipfs = null;
        const result = await this.account.runLocal('getSnapshot', {});
        const { value0, value1, value2, value4, value5 } = result.decoded?.output;

        if (value0 === commitName) {
            patched = value1;
            ipfs = value2;
        } else {
            patched = value4;
            ipfs = value5;
        }

        // Always read patch (may be needed for commit history)
        let patchedRaw = Buffer.from(patched, 'hex').toString('base64');
        patchedRaw = await zstd.decompress(this.account.client, patchedRaw, true);

        // Prepare content for whole app usage
        let content: Buffer | string;
        if (ipfs) {
            content = await loadFromIPFS(ipfs);
            content = content.toString();
        } else {
            content = Buffer.from(patched, 'hex').toString('base64');
        }

        // Apply flags
        const { flags } = treeItem;
        if ((flags & EGoshBlobFlag.COMPRESSED) === EGoshBlobFlag.COMPRESSED) {
            content = await zstd.decompress(this.account.client, content, false);
            content = Buffer.from(content, 'base64');
        }
        if ((flags & EGoshBlobFlag.BINARY) !== EGoshBlobFlag.BINARY) {
            content = content.toString();
        }

        return { content, patched: patchedRaw, isIpfs: !!ipfs };
    }

    async getRepoAddr(): Promise<string> {
        const result = await this.account.runLocal('getBranchAdress', {});
        return result.decoded?.output.value0;
    }
}

export class GoshTree implements IGoshTree {
    abi: any = GoshTreeABI;
    account: Account;
    address: string;

    constructor(client: TonClient, address: string) {
        this.address = address;
        this.account = new Account({ abi: this.abi }, { client, address });
    }

    async getTree(): Promise<TGoshTreeItem[]> {
        const result = await this.account.runLocal('gettree', {});
        return Object.values(result.decoded?.output.value0).map((item: any) => ({
            flags: +item.flags,
            mode: item.mode,
            type: item.typeObj,
            sha: item.sha1,
            path: '',
            name: item.name,
        }));
    }

    async getSha(): Promise<any> {
        const result = await this.account.runLocal('getsha', {});
        return result.decoded?.output;
    }
}

export class GoshTag implements IGoshTag {
    abi: any = GoshTagABI;
    account: Account;
    address: string;
    meta?: IGoshTag['meta'];

    constructor(client: TonClient, address: string) {
        this.address = address;
        this.account = new Account({ abi: this.abi }, { client, address });
    }

    async load(): Promise<void> {
        this.meta = {
            content: await this.getContent(),
        };
    }

    async getContent(): Promise<string> {
        const result = await this.account.runLocal('getContent', {});
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
                commitName: params.commit,
            },
        };
    }

    async getId(): Promise<string> {
        const result = await this.account.runLocal('propId', {});
        return result.decoded?.output.propId;
    }

    async getGoshSetCommitProposalParams(): Promise<any> {
        const result = await this.account.runLocal('getGoshSetCommitProposalParams', {});
        return result.decoded?.output;
    }

    async getVotes(): Promise<{ yes: number; no: number }> {
        const yes = await this.account.runLocal('votesYes', {});
        const no = await this.account.runLocal('votesNo', {});
        return {
            yes: +yes.decoded?.output.votesYes,
            no: +no.decoded?.output.votesNo,
        };
    }

    async getTime(): Promise<{ start: Date; finish: Date }> {
        const start = await this.account.runLocal('startTime', {});
        const finish = await this.account.runLocal('finishTime', {});
        return {
            start: new Date(+start.decoded?.output.startTime * 1000),
            finish: new Date(+finish.decoded?.output.finishTime * 1000),
        };
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
            isBusy,
        };
    }

    async getVotes(): Promise<{ total: number; locked: number }> {
        const total = await this.account.runLocal('total_votes', {});
        const locked = await this.account.runLocal('votes_locked', {});
        return {
            total: +total.decoded?.output.total_votes,
            locked: +locked.decoded?.output.votes_locked,
        };
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
