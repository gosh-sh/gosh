import { AccountRunOptions, AccountType } from '@eversdk/appkit'
import { KeyPair, ResultOfProcessMessage, TonClient } from '@eversdk/core'
import { Buffer } from 'buffer'
import { AppConfig } from '../../appconfig'
import { EGoshError, GoshError } from '../../errors'
import {
    calculateSubtrees,
    getBlobDiffPatch,
    getPaginatedAccounts,
    getRepoTree,
    getTreeFromItems,
    getTreeItemsFromPath,
    MAX_ONCHAIN_DIFF_SIZE,
    MAX_ONCHAIN_FILE_SIZE,
    saveToIPFS,
    sha1,
    sha1Tree,
    sha256,
    splitByChunk,
    unixtimeWithTz,
    ZERO_COMMIT,
    zstd,
} from '../../helpers'
import {
    EGoshBlobFlag,
    ICreateCommitCallback,
    TGoshBranch,
    TGoshDiff,
    TGoshTreeItem,
} from '../../types'
import { sleep } from '../../utils'
import { BaseContract } from './base'
import { GoshCommit } from './goshcommit'
import { GoshDao } from './goshdao'
import { GoshRepository } from './goshrepository'
import { GoshSmvLocker } from './goshsmvlocker'
import { GoshSnapshot } from './goshsnapshot'
import { GoshTree } from './goshtree'
import {
    IGosh,
    IGoshDao,
    IGoshProfile,
    IGoshRepository,
    IGoshSmvLocker,
    IGoshWallet,
} from './interfaces'

class GoshWallet extends BaseContract implements IGoshWallet {
    static key: string = 'goshwallet'
    profile?: IGoshProfile

    constructor(
        client: TonClient,
        address: string,
        version: string,
        optional?: { keys?: KeyPair; profile?: IGoshProfile },
    ) {
        super(client, GoshWallet.key, address, { version, keys: optional?.keys })
        if (optional?.profile) this.profile = optional.profile
    }

    async getDao(): Promise<IGoshDao> {
        // TODO: Implement dao cache by version
        const address = await this.getDaoAddr()
        return new GoshDao(this.account.client, address)
    }

    async getGosh(): Promise<IGosh> {
        // TODO: Implement gosh cache by version
        return AppConfig.goshroot.getGosh(this.version)
    }

    async getAccess(): Promise<string | null> {
        const result = await this.account.runLocal('getAccess', {})
        return result.decoded?.output.value0
    }

    async deployDaoWallet(profileAddr: string): Promise<IGoshWallet> {
        const dao = await this.getDao()
        const address = await dao.getWalletAddr(profileAddr, 0)
        const wallet = new GoshWallet(this.account.client, address, dao.version)
        if (await wallet.isDeployed()) return wallet

        // Deploy wallet
        await this.run('deployWalletDao', { pubaddr: profileAddr })
        while (true) {
            if (await wallet.isDeployed()) break
            await sleep(5000)
        }
        return wallet
    }

    async deleteDaoWallet(profileAddr: string): Promise<void> {
        await this.run('deleteWalletDao', { pubaddr: profileAddr })
    }

    async deployRepo(
        name: string,
        prev?: { addr: string; version: string },
    ): Promise<void> {
        // Check if repo is already deployed
        const gosh = await this.getGosh()
        const dao = await this.getDao()
        const daoName = await dao.getName()
        const repoAddr = await gosh.getRepoAddr(name, daoName)
        const repo = new GoshRepository(this.account.client, repoAddr, this.version)
        if (await repo.isDeployed()) return

        // Deploy repo
        console.debug('wallet', this.account.signer, this.address)
        await this.run('deployRepository', {
            nameRepo: name.toLowerCase(),
            previous: prev || null,
        })
        while (true) {
            if (await repo.isDeployed()) break
            await sleep(5000)
        }
    }

    async getSmvLocker(): Promise<IGoshSmvLocker> {
        const addr = await this.getSmvLockerAddr()
        const locker = new GoshSmvLocker(this.account.client, addr, this.version)
        await locker.load()
        return locker
    }

    async createCommit(
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
        parentBranch?: TGoshBranch,
        callback?: ICreateCommitCallback,
    ): Promise<void> {
        if (!repo.meta) await repo.load()
        if (!repo.meta?.name)
            throw new GoshError(EGoshError.META_LOAD, {
                type: 'repository',
                address: repo.address,
            })
        const gosh = await this.getGosh()

        // Generate current branch full tree and get it's items (TGoshTreeItem[]).
        // Iterate over changed blobs, create TGoshTreeItem[] from blob path and push it
        // to full tree items list.
        // Store updated paths in separate variable
        const { items } = await getRepoTree(repo, branch.commitAddr)
        const updatedPaths: string[] = []
        const processedBlobs: any[] = []
        for (const chunk of splitByChunk(blobs)) {
            await Promise.all(
                chunk.map(async (blob) => {
                    const { name, modified, original, treeItem, isIpfs = false } = blob

                    // Deploy empty snapshot
                    const snap = await this.deployNewSnapshot(
                        repo.address,
                        branch.name,
                        '',
                        name,
                        '',
                        null,
                    )

                    // Generate patch or upload to ipfs
                    let flags = 0
                    let patch: string = ''
                    let ipfs = null
                    if (
                        !Buffer.isBuffer(modified) &&
                        !Buffer.isBuffer(original) &&
                        !isIpfs
                    ) {
                        patch = getBlobDiffPatch(name, modified, original || '')
                        patch = await zstd.compress(this.account.client, patch)
                        patch = Buffer.from(patch, 'base64').toString('hex')

                        if (
                            Buffer.from(patch, 'hex').byteLength >
                                MAX_ONCHAIN_DIFF_SIZE ||
                            Buffer.from(modified).byteLength > MAX_ONCHAIN_FILE_SIZE
                        ) {
                            const compressed = await zstd.compress(
                                this.account.client,
                                modified,
                            )
                            ipfs = await saveToIPFS(compressed)
                            flags |= EGoshBlobFlag.IPFS
                        }

                        flags |= EGoshBlobFlag.COMPRESSED
                    } else {
                        flags |= EGoshBlobFlag.IPFS | EGoshBlobFlag.COMPRESSED

                        let content = modified
                        if (Buffer.isBuffer(content)) flags |= EGoshBlobFlag.BINARY
                        content = await zstd.compress(this.account.client, content)
                        ipfs = await saveToIPFS(content)
                    }

                    const hashes = {
                        sha1: sha1(modified, treeItem?.type || 'blob', 'sha1'),
                        sha256: ipfs
                            ? sha256(modified, true)
                            : await gosh.getTvmHash(modified),
                    }

                    processedBlobs.push({
                        ...blob,
                        created: false,
                        diff: {
                            snap,
                            patch: ipfs ? null : patch,
                            ipfs,
                            commit: '',
                            sha1: hashes.sha1,
                            sha256: hashes.sha256,
                        },
                    })

                    // Update tree
                    const blobPathItems = await getTreeItemsFromPath(
                        blob.name,
                        hashes,
                        flags,
                        treeItem,
                    )
                    blobPathItems.forEach((pathItem) => {
                        const pathIndex = updatedPaths.findIndex(
                            (path) => path === pathItem.path,
                        )
                        if (pathIndex < 0) updatedPaths.push(pathItem.path)

                        const itemIndex = items.findIndex(
                            (item) =>
                                item.path === pathItem.path &&
                                item.name === pathItem.name,
                        )
                        if (itemIndex >= 0) items[itemIndex] = pathItem
                        else items.push(pathItem)
                    })
                }),
            )
            await sleep(200)
        }
        console.debug('New tree items', items)
        console.debug('Updated paths', updatedPaths)
        console.debug('Processed blobs', processedBlobs)

        // Build updated tree and updated hashes
        const updatedTree = getTreeFromItems(items)
        calculateSubtrees(updatedTree)
        const updatedTreeRootSha = sha1Tree(updatedTree[''], 'sha1')
        const updatedTreeRootAddr = await repo.getTreeAddr(updatedTreeRootSha)
        !!callback && callback({ diffsPrepare: true, treePrepare: true })
        console.debug('Updated tree', updatedTree)

        // Prepare commit
        const futureCommit = await this.prepareCommit(
            branch,
            updatedTreeRootSha,
            pubkey,
            message,
            parentBranch,
        )
        console.debug('Future commit', futureCommit)

        // Deploy trees, commit, tags in parallel
        await Promise.all([
            (async () => {
                for (const chunk of splitByChunk(updatedPaths)) {
                    await Promise.all(
                        chunk.map(async (path) => {
                            const subtree = updatedTree[path]
                            const addr = await this.deployTree(repo, subtree)
                            console.debug('Subtree addr', addr)
                        }),
                    )
                    await sleep(200)
                }
                !!callback && callback({ treeDeploy: true })
            })(),
            (async () => {
                await this.deployCommit(
                    repo,
                    branch,
                    futureCommit.name,
                    futureCommit.content,
                    futureCommit.parents,
                    updatedTreeRootAddr,
                    false,
                    processedBlobs.map(({ diff }) => diff),
                )
                !!callback && callback({ commitDeploy: true })
            })(),
            (async () => {
                const tagsList = tags ? tags.split(' ') : []
                await Promise.all(
                    tagsList.map(async (tag) => {
                        await this.deployTag(repo, futureCommit.name, tag)
                    }),
                )
                !!callback && callback({ tagsDeploy: true })
            })(),
        ])

        const isBranchProtected = await repo.isBranchProtected(branch.name)
        if (!isBranchProtected) {
            await this.setCommit(
                repo.meta.name,
                branch.name,
                futureCommit.name,
                processedBlobs.length,
            )

            while (true) {
                const upd = await repo.getBranch(branch.name)
                console.debug('Branches (curr/upd)', branch, upd)
                if (upd.commitAddr !== branch.commitAddr) break
                await sleep(5000)
            }
        } else {
            await this.startProposalForSetCommit(
                repo.meta.name,
                branch.name,
                futureCommit.name,
                processedBlobs.length,
            )
        }
        !!callback && callback({ completed: true })
    }

    async getDaoAddr(): Promise<string> {
        const result = await this.account.runLocal('getAddrDao', {})
        return result.decoded?.output.value0
    }

    async getRootAddr(): Promise<string> {
        const result = await this.account.runLocal('getAddrRootGosh', {})
        return result.decoded?.output.value0
    }

    async getPubkey(): Promise<string> {
        const result = await this.account.runLocal('getWalletPubkey', {})
        return result.decoded?.output.value0
    }

    async deployBranch(
        repo: IGoshRepository,
        newName: string,
        fromName: string,
        fromCommit: string,
    ): Promise<void> {
        if (!repo.meta) await repo.load()
        if (!repo.meta?.name)
            throw new GoshError(EGoshError.META_LOAD, {
                type: 'repository',
                address: repo.address,
            })

        // Check if branch already exists
        const branch = await repo.getBranch(newName)
        if (branch.name === newName) return

        // Get all snapshots from branch `from` and deploy to branch `to`
        const snapCode = await this.getSnapshotCode(fromName, repo.address)
        const snapCodeHash = await this.account.client.boc.get_boc_hash({ boc: snapCode })
        let next: string | undefined
        const snaps = []
        while (true) {
            const accounts = await getPaginatedAccounts({
                filters: [`code_hash: {eq:"${snapCodeHash.hash}"}`],
                limit: 50,
                lastId: next,
            })
            const items = await Promise.all(
                accounts.results.map(async ({ id }) => {
                    return new GoshSnapshot(this.account.client, id, this.version)
                }),
            )
            snaps.push(...items)
            next = accounts.lastId

            if (accounts.completed) break
            await sleep(200)
        }
        console.debug('Snaps', snaps)

        const commitAddr = await repo.getCommitAddr(fromCommit)
        const tree = await getRepoTree(repo, commitAddr)

        // Get only those snapshots which exist in tree
        let snapsExist = await Promise.all(
            snaps.map(async (snap) => {
                let name = await snap.getName()
                name = name.split('/').slice(1).join('/')

                const treeItem = tree.items.find((item) => {
                    const path = `${item.path ? `${item.path}/` : ''}${item.name}`
                    return path === name
                })
                if (treeItem) return { snap, name, treeItem }
            }),
        )
        snapsExist = snapsExist.filter((item) => !!item)

        // Deploy snapshots (split by chunks)
        for (const chunk of splitByChunk(snapsExist)) {
            await Promise.all(
                chunk.map(async (item) => {
                    if (!item) return
                    const { snap, name, treeItem } = item
                    const { content, isIpfs } = await snap.getSnapshot(
                        fromCommit,
                        treeItem,
                    )

                    let ipfs = null
                    let snapdata = ''
                    const compressed = await zstd.compress(this.account.client, content)
                    if (
                        isIpfs ||
                        Buffer.isBuffer(content) ||
                        Buffer.from(content).byteLength >= MAX_ONCHAIN_FILE_SIZE
                    ) {
                        ipfs = await saveToIPFS(compressed)
                    } else {
                        snapdata = Buffer.from(compressed, 'base64').toString('hex')
                    }
                    await this.deployNewSnapshot(
                        repo.address,
                        newName,
                        fromCommit,
                        name,
                        snapdata,
                        ipfs,
                    )
                }),
            )
            await sleep(200)
        }

        // Deploy new branch
        console.debug('Deploy branch', {
            repoName: repo.meta.name,
            newName,
            fromCommit,
        })
        await this.run('deployBranch', {
            repoName: repo.meta.name,
            newName,
            fromCommit,
        })

        while (true) {
            const branch = await repo.getBranch(newName)
            console.debug('Branch', branch)
            if (branch.name === newName) break
            await sleep(5000)
        }
    }

    async deleteBranch(repo: IGoshRepository, branchName: string): Promise<void> {
        if (!repo.meta) await repo.load()
        if (!repo.meta?.name)
            throw new GoshError(EGoshError.META_LOAD, {
                type: 'repository',
                address: repo.address,
            })
        if (['main', 'master'].indexOf(branchName) >= 0)
            throw new Error(`Can not delete branch '${branchName}' `)

        // Check if branch exists
        const branch = await repo.getBranch(branchName)
        if (!branch.name) return

        // Get all snapshots from branch and delete
        const snapCode = await this.getSnapshotCode(branchName, repo.address)
        const snapCodeHash = await this.account.client.boc.get_boc_hash({ boc: snapCode })
        let next: string | undefined
        const snaps = []
        while (true) {
            const accounts = await getPaginatedAccounts({
                filters: [`code_hash: {eq:"${snapCodeHash.hash}"}`],
                limit: 50,
                lastId: next,
            })
            snaps.push(...accounts.results.map(({ id }) => id))
            next = accounts.lastId

            if (accounts.completed) break
            await sleep(200)
        }
        console.debug('Snaps', snaps)

        // Delete snapshots (split by chunks)
        for (const chunk of splitByChunk(snaps)) {
            await Promise.all(
                chunk.map(async (address) => {
                    console.debug('Delete snapshot:', address)
                    await this.deleteSnapshot(address)
                }),
            )
            await sleep(200)
        }

        // Delete branch and wait for it to be deleted
        console.debug('Delete branch', {
            repoName: repo.meta.name,
            Name: branchName,
        })
        await this.run('deleteBranch', {
            repoName: repo.meta.name,
            Name: branchName,
        })
        while (true) {
            const branch = await repo.getBranch(branchName)
            console.debug('Branch', branch)
            if (!branch.name) break
            await sleep(5000)
        }
    }

    async deployCommit(
        repo: IGoshRepository,
        branch: TGoshBranch,
        commitName: string,
        commitContent: string,
        parentAddrs: string[],
        treeAddr: string,
        upgrade: boolean,
        diffs: TGoshDiff[],
    ): Promise<void> {
        if (!repo.meta) await repo.load()
        if (!repo.meta?.name)
            throw new GoshError(EGoshError.META_LOAD, {
                type: 'repository',
                address: repo.address,
            })

        const repoName = repo.meta.name
        console.debug('Commit addr', await repo.getCommitAddr(commitName))

        // Deploy diffs (split by chunks)
        const chunkSize = 10
        const chunks = splitByChunk(diffs, chunkSize)
        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i]

            await Promise.all(
                chunk.map(async (diff, index) => {
                    diff.commit = commitName
                    await this.run('deployDiff', {
                        repoName,
                        branchName: branch.name,
                        commitName,
                        diffs: [diff],
                        index1: i * chunkSize + index,
                        index2: 0,
                        last: true,
                    })
                }),
            )
            await sleep(200)
        }

        // Deploy commit
        await this.run('deployCommit', {
            repoName,
            branchName: branch.name,
            commitName,
            fullCommit: commitContent,
            parents: parentAddrs,
            tree: treeAddr,
            upgrade,
        })
    }

    async deployTree(repo: IGoshRepository, items: TGoshTreeItem[]): Promise<string> {
        if (!repo.meta) throw new GoshError(EGoshError.NO_REPO)
        const gosh = await this.getGosh()

        const sha = sha1Tree(items, 'sha1')
        if (!sha) {
            const details = { items }
            throw new Error(
                `[Deploy blob] - Blob sha is not calculated (${JSON.stringify(details)})`,
            )
        }

        // Check if not deployed
        const addr = await repo.getTreeAddr(sha)
        console.debug('Tree addr', addr)
        const blob = new GoshTree(this.account.client, addr, this.version)
        const blobAcc = await blob.account.getAccount()
        if (blobAcc.acc_type === AccountType.active) {
            return addr
        }

        // Deploy tree and get address
        const datatree: any = {}
        for (const { flags, mode, type, name, sha1, sha256 } of items) {
            const key = await gosh.getTvmHash(`${type}:${name}`)
            datatree[key] = {
                flags: flags.toString(),
                mode,
                typeObj: type,
                name,
                sha1,
                sha256,
            }
        }
        console.debug('Deploy tree', {
            repoName: repo.meta?.name,
            shaTree: sha,
            datatree,
            ipfs: null,
        })
        await this.run('deployTree', {
            repoName: repo.meta?.name,
            shaTree: sha,
            datatree,
            ipfs: null,
        })

        return addr
    }

    async deployTag(
        repo: IGoshRepository,
        commitName: string,
        content: string,
    ): Promise<void> {
        const commitAddr = await repo.getCommitAddr(commitName)
        console.debug('Deploy tag', {
            repoName: repo.meta?.name,
            nametag: `tag ${sha1(content, 'tag', 'sha1')}`,
            nameCommit: commitName,
            content,
            commit: commitAddr,
        })
        await this.run('deployTag', {
            repoName: repo.meta?.name,
            nametag: `tag ${sha1(content, 'tag', 'sha1')}`,
            nameCommit: commitName,
            content,
            commit: commitAddr,
        })
    }

    async deployNewSnapshot(
        repoAddr: string,
        branchName: string,
        commitName: string,
        filename: string,
        data: string,
        ipfs: string | null,
    ): Promise<string> {
        const addr = await this.getSnapshotAddr(repoAddr, branchName, filename)
        const snapshot = new GoshSnapshot(this.account.client, addr, this.version)

        let isDeployed = false
        try {
            const snapshotAcc = await snapshot.account.getAccount()
            isDeployed = snapshotAcc.acc_type === AccountType.active
        } catch {
            console.debug('Snapshot does not exist')
        }

        if (!isDeployed) {
            console.debug('Deploy snapshot', {
                branch: branchName,
                commit: commitName,
                repo: repoAddr,
                name: filename,
                snapshotdata: data,
                snapshotipfs: ipfs,
            })
            await this.run('deployNewSnapshot', {
                branch: branchName,
                commit: commitName,
                repo: repoAddr,
                name: filename,
                snapshotdata: data,
                snapshotipfs: ipfs,
            })
        }

        return addr
    }

    async deleteSnapshot(addr: string): Promise<void> {
        await this.run('deleteSnapshot', { snap: addr })
    }

    async getSnapshotCode(branch: string, repoAddr: string): Promise<string> {
        const result = await this.account.runLocal('getSnapshotCode', {
            branch,
            repo: repoAddr,
        })
        return result.decoded?.output.value0
    }

    async getSnapshotAddr(
        repoAddr: string,
        branchName: string,
        filename: string,
    ): Promise<string> {
        const result = await this.account.runLocal('getSnapshotAddr', {
            branch: branchName,
            repo: repoAddr,
            name: filename,
        })
        return result.decoded?.output.value0
    }

    async setCommit(
        repoName: string,
        branchName: string,
        commitName: string,
        filesCount: number,
    ): Promise<void> {
        console.debug('Set commmit', {
            repoName,
            branchName,
            commit: commitName,
            numberChangedFiles: filesCount,
        })
        await this.run('setCommit', {
            repoName,
            branchName,
            commit: commitName,
            numberChangedFiles: filesCount,
        })
    }

    async startProposalForSetCommit(
        repoName: string,
        branchName: string,
        commitName: string,
        filesCount: number,
    ): Promise<void> {
        console.debug('Start PR proposal', {
            repoName,
            branchName,
            commit: commitName,
            numberChangedFiles: filesCount,
        })
        await this.run('startProposalForSetCommit', {
            repoName,
            branchName,
            commit: commitName,
            numberChangedFiles: filesCount,
        })
    }

    async startProposalForAddProtectedBranch(
        repoName: string,
        branchName: string,
    ): Promise<void> {
        console.debug('Start add branch proposal', { repoName, branchName })
        await this.run('startProposalForAddProtectedBranch', {
            repoName,
            branchName,
        })
    }

    async startProposalForDeleteProtectedBranch(
        repoName: string,
        branchName: string,
    ): Promise<void> {
        console.debug('Start delete branch proposal', { repoName, branchName })
        await this.run('startProposalForDeleteProtectedBranch', {
            repoName,
            branchName,
        })
    }

    async getDiffAddr(
        repoName: string,
        commitName: string,
        index1: number,
        index2: number,
    ): Promise<string> {
        const result = await this.account.runLocal('getDiffAddr', {
            reponame: repoName,
            commitName,
            index1,
            index2,
        })
        return result.decoded?.output.value0
    }

    async getSmvLockerAddr(): Promise<string> {
        const result = await this.account.runLocal('tip3VotingLocker', {})
        return result.decoded?.output.tip3VotingLocker
    }

    async getSmvClientAddr(lockerAddr: string, proposalId: string): Promise<string> {
        const result = await this.account.runLocal('clientAddress', {
            _tip3VotingLocker: lockerAddr,
            propId: proposalId,
        })
        return result.decoded?.output.value0
    }

    async getSmvTokenBalance(): Promise<number> {
        const result = await this.account.runLocal('_tokenBalance', {})
        return +result.decoded?.output._tokenBalance
    }

    async lockVoting(amount: number): Promise<void> {
        await this.run('lockVoting', { amount })
    }

    async unlockVoting(amount: number): Promise<void> {
        await this.run('unlockVoting', { amount })
    }

    async tryProposalResult(proposalAddr: string): Promise<void> {
        await this.run('tryProposalResult', { proposal: proposalAddr })
    }

    async voteFor(
        platformCode: string,
        clientCode: string,
        proposalAddr: string,
        choice: boolean,
        amount: number,
    ): Promise<void> {
        await this.run('voteFor', {
            platformCode,
            clientCode,
            proposal: proposalAddr,
            choice,
            amount,
        })
    }

    /** For smv */
    async updateHead(): Promise<void> {
        await this.run('updateHead', {})
    }

    async setHead(repoName: string, branch: string): Promise<void> {
        await this.run('setHEAD', { repoName, branchName: branch })
    }

    async deployContent(
        repoName: string,
        commitName: string,
        label: string,
        content: string,
    ): Promise<void> {
        await this.run('deployContent', {
            repoName,
            commit: commitName,
            label,
            content,
        })
    }

    async getContentAdress(
        repoName: string,
        commitName: string,
        label: string,
    ): Promise<string> {
        const result = await this.account.runLocal('getContentAdress', {
            repoName,
            commit: commitName,
            label,
        })
        return result.decoded?.output.value0
    }

    private async prepareCommit(
        branch: TGoshBranch,
        treeRootSha: string,
        authorPubkey: string,
        message: string,
        parentBranch?: TGoshBranch,
    ): Promise<{ name: string; content: string; parents: string[] }> {
        // Build commit data and calculate commit name
        let parentCommitName = ''
        if (branch.commitAddr) {
            const commit = new GoshCommit(
                this.account.client,
                branch.commitAddr,
                this.version,
            )
            const name = await commit.getName()
            if (name !== ZERO_COMMIT) parentCommitName = name
        }

        let parentBranchCommitName = ''
        if (parentBranch?.commitAddr) {
            const commit = new GoshCommit(
                this.account.client,
                parentBranch.commitAddr,
                this.version,
            )
            const name = await commit.getName()
            if (name !== ZERO_COMMIT) parentBranchCommitName = name
        }

        const fullCommit = [
            `tree ${treeRootSha}`,
            parentCommitName ? `parent ${parentCommitName}` : null,
            parentBranchCommitName ? `parent ${parentBranchCommitName}` : null,
            `author ${authorPubkey} <${authorPubkey}@gosh.sh> ${unixtimeWithTz()}`,
            `committer ${authorPubkey} <${authorPubkey}@gosh.sh> ${unixtimeWithTz()}`,
            '',
            message,
        ]

        const parents = [branch.commitAddr, parentBranch?.commitAddr].reduce(
            (filtered: string[], item) => {
                if (!!item) filtered.push(item)
                return filtered
            },
            [],
        )

        const commitData = fullCommit.filter((item) => item !== null).join('\n')
        const commitName = sha1(commitData, 'commit', 'sha1')

        return { name: commitName, content: commitData, parents }
    }

    async run(
        functionName: string,
        input: object,
        options?: AccountRunOptions,
        writeLog?: boolean,
    ): Promise<ResultOfProcessMessage> {
        if (!this.profile) throw new GoshError(EGoshError.PROFILE_UNDEFINED)
        if (this.account.signer.type !== 'Keys') {
            throw new GoshError(EGoshError.WALLET_NO_SIGNER)
        }

        // Check wallet access
        const pubkey = `0x${this.account.signer.keys.public}`
        const access = await this.getAccess()
        if (access !== pubkey) {
            await this.profile.turnOn(this.address, pubkey)
        }

        return super.run(functionName, input, options, writeLog)
    }
}

export { GoshWallet }
