import { Account, AccountRunOptions, AccountType } from '@eversdk/appkit'
import {
    KeyPair,
    ResultOfProcessMessage,
    signerKeys,
    signerNone,
    TonClient,
} from '@eversdk/core'
import GoshRootABI from './contracts/0.1.200/root.abi.json'
import GoshABI from './contracts/0.1.200/gosh.abi.json'
import GoshProfileABI from './contracts/0.1.200/profile.abi.json'
import GoshDaoABI from './contracts/0.1.200/goshdao.abi.json'
import GoshWalletABI from './contracts/0.1.200/goshwallet.abi.json'
import GoshRepositoryABI from './contracts/0.1.200/repository.abi.json'
import GoshCommitABI from './contracts/0.1.200/commit.abi.json'
import GoshDiffABI from './contracts/0.1.200/diff.abi.json'
import GoshTreeABI from './contracts/0.1.200/tree.abi.json'
import GoshSnapshotABI from './contracts/0.1.200/snapshot.abi.json'
import GoshTagABI from './contracts/0.1.200/tag.abi.json'
import GoshContentSignatureABI from './contracts/0.1.200/content-signature.abi.json'
import GoshSmvProposalABI from './contracts/0.1.200/SMVProposal.abi.json'
import GoshSmvLockerABI from './contracts/0.1.200/SMVTokenLocker.abi.json'
import GoshSmvClientABI from './contracts/0.1.200/SMVClient.abi.json'
import GoshSmvTokenRootABI from './contracts/0.1.200/TokenRoot.abi.json'
import {
    calculateSubtrees,
    getRepoTree,
    getTreeFromItems,
    getTreeItemsFromPath,
    sha1,
    sha1Tree,
    unixtimeWithTz,
    zstd,
    loadFromIPFS,
    MAX_ONCHAIN_DIFF_SIZE,
    saveToIPFS,
    ZERO_COMMIT,
    getBlobDiffPatch,
    MAX_ONCHAIN_FILE_SIZE,
    getPaginatedAccounts,
    splitByChunk,
    sha256,
} from './helpers'
import {
    IGoshTree,
    TGoshBranch,
    IGoshCommit,
    IGoshRepository,
    IGosh,
    IGoshDao,
    IGoshWallet,
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
    TGoshTagDetails,
    TGoshRepoDetails,
    TGoshEventDetails,
    TGoshCommitDetails,
    IGoshContentSignature,
    IContract,
    IGoshRoot,
    IGoshProfile,
} from './types/types'
import { EGoshError, GoshError } from './errors'
import { Buffer } from 'buffer'
import { sleep } from './utils'
import { TDaoDetails } from './types/dao.types'
import { AppConfig } from './appconfig'

export class BaseContract implements IContract {
    abi: any
    tvc?: string
    account: any

    async run(
        functionName: string,
        input: object,
        options?: AccountRunOptions,
        writeLog: boolean = true,
    ): Promise<ResultOfProcessMessage> {
        if (writeLog) console.debug('[Run]', { functionName, input, options })
        const result = await this.account.run(functionName, input, options)
        if (writeLog) console.debug('[Run result]', { functionName, result })
        return result
    }
}

export class GoshRoot extends BaseContract implements IGoshRoot {
    abi: any = GoshRootABI
    account: Account
    address: string

    constructor(client: TonClient, address: string) {
        super()
        this.address = address
        this.account = new Account({ abi: this.abi }, { client, address })
    }

    async getGosh(version: string): Promise<IGosh> {
        const result = await this.account.runLocal('getGoshAddr', { version })
        const address = result.decoded?.output.value0
        return new Gosh(this.account.client, address)
    }

    async getVersions(): Promise<any> {
        const result = await this.account.runLocal('getVersions', {})
        return result.decoded?.output.value0
    }
}

export class Gosh extends BaseContract implements IGosh {
    abi: any = GoshABI
    account: Account
    address: string

    constructor(client: TonClient, address: string) {
        super()
        this.address = address
        this.account = new Account({ abi: this.abi }, { client, address })
    }

    async deployProfile(pubkey: string): Promise<IGoshProfile> {
        // Get profile address and check it's status
        const profileAddr = await this.getProfileAddr(pubkey)
        const profile = new GoshProfile(this.account.client, profileAddr)
        const acc = await profile.account.getAccount()
        if (acc.acc_type === AccountType.active) return profile

        // If profile is not active (deployed), deploy and wait for status `active`
        await this.run('deployProfile', { pubkey })
        while (true) {
            const acc = await profile.account.getAccount()
            console.debug('[Create profile]: Wait for account', acc)
            if (acc.acc_type === AccountType.active) break
            await sleep(5000)
        }
        return profile
    }

    async getDaoAddr(name: string): Promise<string> {
        const result = await this.account.runLocal('getAddrDao', { name })
        return result.decoded?.output.value0
    }

    async getDaoWalletCode(profileAddr: string): Promise<string> {
        const result = await this.account.runLocal('getDaoWalletCode', {
            pubaddr: profileAddr,
        })
        return result.decoded?.output.value0
    }

    async getRepoAddr(name: string, daoName: string): Promise<string> {
        const result = await this.account.runLocal('getAddrRepository', {
            name,
            dao: daoName,
        })
        return result.decoded?.output.value0
    }

    async getDaoRepoCode(daoAddr: string): Promise<string> {
        const result = await this.account.runLocal('getRepoDaoCode', {
            dao: daoAddr,
        })
        return result.decoded?.output.value0
    }

    async getSmvPlatformCode(): Promise<string> {
        const result = await this.account.runLocal('getSMVPlatformCode', {})
        return result.decoded?.output.value0
    }

    async getContentAddr(
        daoName: string,
        repoName: string,
        commitHash: string,
        label: string,
    ): Promise<string> {
        const result = await this.account.runLocal('getContentAdress', {
            daoName,
            repoName,
            commit: commitHash,
            label,
        })
        return result.decoded?.output.value0
    }

    async getTvmHash(data: string | Buffer): Promise<string> {
        const state = Buffer.isBuffer(data)
            ? data.toString('hex')
            : Buffer.from(data).toString('hex')
        const result = await this.account.runLocal('getHash', {
            state,
        })
        return result.decoded?.output.value0
    }

    async getProfileAddr(pubkey: string): Promise<string> {
        const result = await this.account.runLocal('getProfileAddr', { pubkey })
        return result.decoded?.output.value0
    }
}

export class GoshProfile extends BaseContract implements IGoshProfile {
    abi: any = GoshProfileABI
    account: Account
    address: string

    constructor(client: TonClient, address: string, keys?: KeyPair) {
        super()
        this.address = address
        this.account = new Account(
            { abi: this.abi },
            { client, address, signer: keys ? signerKeys(keys) : signerNone() },
        )
    }

    async setGosh(goshAddr: string): Promise<void> {
        await this.run('setNewGoshRoot', { goshroot: goshAddr })
    }

    async deployDao(name: string, prevAddr?: string): Promise<IGoshDao> {
        // Get DAO address and check it's status
        const gosh = await AppConfig.goshroot.getGosh(AppConfig.goshversion)
        const daoAddr = await gosh.getDaoAddr(name)
        const dao = new GoshDao(this.account.client, daoAddr)
        const acc = await dao.account.getAccount()
        if (acc.acc_type === AccountType.active) {
            // TODO: Check DAO ownership and dao
            // const daoRootPubkey = await dao.getRootPubkey()
            // if (daoRootPubkey !== ownerPubkey) {
            //     throw new GoshError(EGoshError.DAO_EXISTS, { name })
            // }
            return dao
        }

        // If DAO is not active (deployed), deploy and wait for status `active`
        await this.run('deployDao', { name, previous: prevAddr || null })
        while (true) {
            const acc = await dao.account.getAccount()
            console.debug('[Create DAO]: Wait for account', acc)
            if (acc.acc_type === AccountType.active) break
            await sleep(5000)
        }
        return dao
    }

    async deployWallet(daoAddr: string, profileAddr: string): Promise<IGoshWallet> {
        const dao = new GoshDao(this.account.client, daoAddr)
        const address = await dao.getWalletAddr(profileAddr, 0)
        const wallet = new GoshWallet(this.account.client, address)
        const acc = await wallet.account.getAccount()
        if (acc.acc_type !== AccountType.active) {
            await this.run('deployWallet', { dao: daoAddr, pubaddr: profileAddr })
            while (true) {
                const acc = await wallet.account.getAccount()
                console.debug('[Deploy wallet]: Wait for account', acc)
                if (acc.acc_type === AccountType.active) break
                await sleep(5000)
            }
        }
        return wallet
    }

    async turnOn(walletAddr: string, pubkey: string): Promise<void> {
        await this.run('turnOn', { wallet: walletAddr, pubkey })
    }
}

export class GoshDao extends BaseContract implements IGoshDao {
    abi: any = GoshDaoABI
    account: Account
    address: string

    constructor(client: TonClient, address: string) {
        super()
        this.address = address
        this.account = new Account({ abi: this.abi }, { client, address })
    }

    async getDetails(): Promise<TDaoDetails> {
        const smvTokenRootAddr = await this.getSmvRootTokenAddr()
        const smvTokenRoot = new GoshSmvTokenRoot(this.account.client, smvTokenRootAddr)
        // TODO: Get DAO owner pubkey
        return {
            address: this.address,
            name: await this.getName(),
            members: await this.getWallets(),
            supply: await smvTokenRoot.getTotalSupply(),
            ownerPubkey: '',
        }
    }

    async getWalletAddr(profileAddr: string, index: number): Promise<string> {
        const result = await this.account.runLocal('getAddrWallet', {
            pubaddr: profileAddr,
            index,
        })
        return result.decoded?.output.value0
    }

    async getWallets(): Promise<string[]> {
        const result = await this.account.runLocal('getWallets', {})
        return result.decoded?.output.value0
    }

    async getName(): Promise<string> {
        const result = await this.account.runLocal('getNameDao', {})
        return result.decoded?.output.value0
    }

    async getSmvRootTokenAddr(): Promise<string> {
        const result = await this.account.runLocal('_rootTokenRoot', {})
        return result.decoded?.output._rootTokenRoot
    }

    async getSmvProposalCode(): Promise<string> {
        const result = await this.account.runLocal('getProposalCode', {})
        return result.decoded?.output.value0
    }

    async getSmvClientCode(): Promise<string> {
        const result = await this.account.runLocal('getClientCode', {})
        return result.decoded?.output.value0
    }

    async mint(amount: number, recipient: string, daoOwnerKeys: KeyPair): Promise<void> {
        const tokenRoot = await this.getSmvRootTokenAddr()
        await this.run(
            'mint',
            {
                tokenRoot,
                amount,
                recipient,
                deployWalletValue: 0,
                remainingGasTo: this.address,
                notify: true,
                payload: '',
            },
            {
                signer: signerKeys(daoOwnerKeys),
            },
        )
    }
}

export class GoshWallet extends BaseContract implements IGoshWallet {
    abi: any = GoshWalletABI
    account: Account
    address: string
    isDaoParticipant: boolean

    constructor(client: TonClient, address: string, keys?: KeyPair) {
        super()
        this.address = address
        this.isDaoParticipant = false
        this.account = new Account(
            { abi: this.abi },
            {
                client,
                address,
                signer: keys ? signerKeys(keys) : signerNone(),
            },
        )
    }

    async getDao(): Promise<IGoshDao> {
        const daoAddr = await this.getDaoAddr()
        return new GoshDao(this.account.client, daoAddr)
    }

    async getGosh(version: string): Promise<IGosh> {
        return AppConfig.goshroot.getGosh(version)
    }

    async getSmvLocker(): Promise<IGoshSmvLocker> {
        const addr = await this.getSmvLockerAddr()
        const locker = new GoshSmvLocker(this.account.client, addr)
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
        const gosh = await this.getGosh(AppConfig.goshversion)

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

    async deployRepo(name: string, prevAddr?: string): Promise<void> {
        // Get repo instance, check if it is not deployed
        const dao = await this.getDao()
        const daoName = await dao.getName()

        const gosh = await this.getGosh(AppConfig.goshversion)
        const repoAddr = await gosh.getRepoAddr(name, daoName)
        const repo = new GoshRepository(this.account.client, repoAddr)
        const acc = await repo.account.getAccount()
        if (acc.acc_type === AccountType.active) return

        // If repo is not deployed, deploy and wait for status `active`
        await this.run('deployRepository', { nameRepo: name, previous: prevAddr || null })
        return new Promise((resolve) => {
            const interval = setInterval(async () => {
                const acc = await repo.account.getAccount()
                console.debug('[Deploy repo] - Account:', acc)
                if (acc.acc_type === AccountType.active) {
                    clearInterval(interval)
                    resolve()
                }
            }, 1500)
        })
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
                    return new GoshSnapshot(this.account.client, id)
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

        const gosh = await this.getGosh(AppConfig.goshversion)

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
        const blob = new GoshTree(this.account.client, addr)
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
        const snapshot = new GoshSnapshot(this.account.client, addr)

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
            const commit = new GoshCommit(this.account.client, branch.commitAddr)
            const name = await commit.getName()
            if (name !== ZERO_COMMIT) parentCommitName = name
        }

        let parentBranchCommitName = ''
        if (parentBranch?.commitAddr) {
            const commit = new GoshCommit(this.account.client, parentBranch.commitAddr)
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
}

export class GoshRepository extends BaseContract implements IGoshRepository {
    abi: any = GoshRepositoryABI
    account: Account
    address: string
    meta?: IGoshRepository['meta']

    constructor(client: TonClient, address: string) {
        super()
        this.address = address
        this.account = new Account({ abi: this.abi }, { client, address })
    }

    async load(): Promise<void> {
        const branches = await this.getBranches()
        const tags = await this.getTags()

        this.meta = {
            name: await this.getName(),
            branchCount: branches.length,
            tags,
        }
    }

    async getDetails(): Promise<TGoshRepoDetails> {
        return {
            address: this.address,
            name: await this.getName(),
            branches: await this.getBranches(),
            head: await this.getHead(),
            tags: await this.getTags(),
        }
    }

    async getGosh(): Promise<IGosh> {
        const addr = await this.getGoshAddr()
        return new Gosh(this.account.client, addr)
    }

    async getName(): Promise<string> {
        const result = await this.account.runLocal('getName', {})
        return result.decoded?.output.value0
    }

    async getBranches(): Promise<TGoshBranch[]> {
        const result = await this.account.runLocal('getAllAddress', {})
        const items = result.decoded?.output.value0
        return await Promise.all(
            items.map(async (item: any) => {
                return {
                    name: item.key,
                    commitAddr: item.value,
                    isProtected: await this.isBranchProtected(item.key),
                }
            }),
        )
    }

    async getBranch(name: string): Promise<TGoshBranch> {
        const result = await this.account.runLocal('getAddrBranch', { name })
        const decoded = result.decoded?.output.value0
        return {
            name: decoded.key,
            commitAddr: decoded.value,
            isProtected: await this.isBranchProtected(name),
        }
    }

    async getHead(): Promise<string> {
        const result = await this.account.runLocal('getHEAD', {})
        return result.decoded?.output.value0
    }

    async getCommitAddr(commitSha: string): Promise<string> {
        const result = await this.account.runLocal('getCommitAddr', {
            nameCommit: commitSha,
        })
        return result.decoded?.output.value0
    }

    async getBlobAddr(blobName: string): Promise<string> {
        const result = await this.account.runLocal('getBlobAddr', {
            nameBlob: blobName,
        })
        return result.decoded?.output.value0
    }

    async getTagCode(): Promise<string> {
        const result = await this.account.runLocal('getTagCode', {})
        return result.decoded?.output.value0
    }

    async getTags(): Promise<{ content: string; commit: string }[]> {
        // Get repo tag code and all tag accounts addresses
        const code = await this.getTagCode()
        const codeHash = await this.account.client.boc.get_boc_hash({ boc: code })
        const accounts: string[] = []
        let next: string | undefined
        while (true) {
            const { results, lastId, completed } = await getPaginatedAccounts({
                filters: [`code_hash: {eq:"${codeHash.hash}"}`],
                limit: 50,
                lastId: next,
            })
            accounts.push(...results.map((item) => item.id))
            next = lastId
            if (completed) break
        }

        // Read each tag account details
        return await Promise.all(
            accounts.map(async (address) => {
                const tag = new GoshTag(this.account.client, address)
                return await tag.getDetails()
            }),
        )
    }

    async getGoshAddr(): Promise<string> {
        const result = await this.account.runLocal('getGoshAdress', {})
        return result.decoded?.output.value0
    }

    async getSnapshotCode(branch: string): Promise<string> {
        const result = await this.account.runLocal('getSnapCode', { branch })
        return result.decoded?.output.value0
    }

    async getSnapshotAddr(branch: string, filename: string): Promise<string> {
        const result = await this.account.runLocal('getSnapshotAddr', {
            branch,
            name: filename,
        })
        return result.decoded?.output.value0
    }

    async getTreeAddr(treeName: string): Promise<string> {
        const result = await this.account.runLocal('getTreeAddr', {
            treeName,
        })
        return result.decoded?.output.value0
    }

    async getDiffAddr(
        commitName: string,
        index1: number,
        index2: number,
    ): Promise<string> {
        const result = await this.account.runLocal('getDiffAddr', {
            commitName,
            index1,
            index2,
        })
        return result.decoded?.output.value0
    }

    async isBranchProtected(branch: string): Promise<boolean> {
        const result = await this.account.runLocal('isBranchProtected', {
            branch,
        })
        return result.decoded?.output.value0
    }
}

export class GoshCommit extends BaseContract implements IGoshCommit {
    abi: any = GoshCommitABI
    account: Account
    address: string
    meta?: IGoshCommit['meta']

    constructor(client: TonClient, address: string) {
        super()
        this.address = address
        this.account = new Account({ abi: this.abi }, { client, address })
    }

    async load(): Promise<void> {
        const meta = await this.getCommit()
        this.meta = {
            repoAddr: meta.repo,
            branchName: meta.branch,
            sha: meta.sha,
            content: GoshCommit.parseContent(meta.content),
            parents: meta.parents,
        }
    }

    async getDetails(): Promise<TGoshCommitDetails> {
        const meta = await this.getCommit()
        const commitData = {
            address: this.address,
            repoAddress: meta.repo,
            branch: meta.branch,
            name: meta.sha,
            content: meta.content,
            parents: meta.parents,
        }

        return {
            ...commitData,
            content: GoshCommit.parseContent(commitData.content),
        }
    }

    async getCommit(): Promise<any> {
        const result = await this.account.runLocal('getCommit', {})
        return result.decoded?.output
    }

    async getName(): Promise<string> {
        const result = await this.account.runLocal('getNameCommit', {})
        return result.decoded?.output.value0
    }

    async getParents(): Promise<string[]> {
        const result = await this.account.runLocal('getParents', {})
        return result.decoded?.output.value0
    }

    async getBlobs(): Promise<string[]> {
        const result = await this.account.runLocal('getBlobs', {})
        return result.decoded?.output.value0
    }

    async getTree(): Promise<string> {
        const result = await this.account.runLocal('gettree', {})
        return result.decoded?.output.value0
    }

    async getDiffAddr(index1: number, index2: number): Promise<string> {
        const result = await this.account.runLocal('getDiffAdress', {
            index1,
            index2,
        })
        return result.decoded?.output.value0
    }

    static parseContent(content: string): TGoshCommitContent {
        const splitted = content.split('\n')

        const commentIndex = splitted.findIndex((v) => v === '')
        const commentData = splitted.slice(commentIndex + 1)
        const [title, ...message] = commentData
        const parsed: { [key: string]: string } = {
            title,
            message: message.filter((v) => v).join('\n'),
        }

        const commitData = splitted.slice(0, commentIndex)
        commitData.forEach((item) => {
            ;['tree', 'author', 'committer'].forEach((key) => {
                if (item.search(key) >= 0) parsed[key] = item.replace(`${key} `, '')
            })
        })
        return parsed as TGoshCommitContent
    }
}

export class GoshDiff extends BaseContract implements IGoshDiff {
    abi: any = GoshDiffABI
    account: Account
    address: string

    constructor(client: TonClient, address: string) {
        super()
        this.address = address
        this.account = new Account({ abi: this.abi }, { client, address })
    }

    async getNextAddr(): Promise<string> {
        const result = await this.account.runLocal('getNextAdress', {})
        return result.decoded?.output.value0
    }

    async getDiffs(): Promise<TGoshDiff[]> {
        const result = await this.account.runLocal('getdiffs', {})
        return result.decoded?.output.value0
    }
}

export class GoshSnapshot extends BaseContract implements IGoshSnapshot {
    abi: any = GoshSnapshotABI
    account: Account
    address: string

    constructor(client: TonClient, address: string) {
        super()
        this.address = address
        this.account = new Account({ abi: this.abi }, { client, address })
    }

    async getName(): Promise<string> {
        const result = await this.account.runLocal('getName', {})
        return result.decoded?.output.value0
    }

    async getSnapshot(
        commitName: string,
        treeItem: TGoshTreeItem,
    ): Promise<{ content: string | Buffer; patched: string; isIpfs: boolean }> {
        // Read snapshot data
        let patched = ''
        let ipfs = null
        const result = await this.account.runLocal('getSnapshot', {})
        const { value0, value1, value2, value4, value5 } = result.decoded?.output

        if (value0 === commitName) {
            patched = value1
            ipfs = value2
        } else {
            patched = value4
            ipfs = value5
        }

        if (!patched && !ipfs) return { content: '', patched: '', isIpfs: false }

        // Always read patch (may be needed for commit history)
        let patchedRaw = ''
        if (patched) {
            patchedRaw = Buffer.from(patched, 'hex').toString('base64')
            patchedRaw = await zstd.decompress(this.account.client, patchedRaw, true)
        }

        // Prepare content for whole app usage
        let content: Buffer | string
        if (ipfs) {
            content = await loadFromIPFS(ipfs)
            content = content.toString()
        } else {
            content = Buffer.from(patched, 'hex').toString('base64')
        }

        // Apply flags
        const { flags } = treeItem
        if ((flags & EGoshBlobFlag.COMPRESSED) === EGoshBlobFlag.COMPRESSED) {
            content = await zstd.decompress(this.account.client, content, false)
            content = Buffer.from(content, 'base64')
        }
        if ((flags & EGoshBlobFlag.BINARY) !== EGoshBlobFlag.BINARY) {
            content = content.toString()
        }

        return { content, patched: patchedRaw, isIpfs: !!ipfs }
    }

    async getRepoAddr(): Promise<string> {
        const result = await this.account.runLocal('getBranchAdress', {})
        return result.decoded?.output.value0
    }
}

export class GoshTree extends BaseContract implements IGoshTree {
    abi: any = GoshTreeABI
    account: Account
    address: string

    constructor(client: TonClient, address: string) {
        super()
        this.address = address
        this.account = new Account({ abi: this.abi }, { client, address })
    }

    async getTree(): Promise<{ tree: TGoshTreeItem[]; ipfs: string }> {
        const result = await this.account.runLocal('gettree', {})
        const tree = Object.values(result.decoded?.output.value0).map((item: any) => ({
            flags: +item.flags,
            mode: item.mode,
            type: item.typeObj,
            sha1: item.sha1,
            sha256: item.sha256,
            path: '',
            name: item.name,
        }))
        return { tree, ipfs: result.decoded?.output.value1 }
    }

    async getSha(): Promise<any> {
        const result = await this.account.runLocal('getsha', {})
        return result.decoded?.output
    }
}

export class GoshTag extends BaseContract implements IGoshTag {
    abi: any = GoshTagABI
    account: Account
    address: string
    meta?: IGoshTag['meta']

    constructor(client: TonClient, address: string) {
        super()
        this.address = address
        this.account = new Account({ abi: this.abi }, { client, address })
    }

    async load(): Promise<void> {
        this.meta = {
            content: await this.getContent(),
        }
    }

    async getDetails(): Promise<TGoshTagDetails> {
        return {
            commit: await this.getCommit(),
            content: await this.getContent(),
        }
    }

    async getCommit(): Promise<string> {
        const result = await this.account.runLocal('getCommit', {})
        return result.decoded?.output.value0
    }

    async getContent(): Promise<string> {
        const result = await this.account.runLocal('getContent', {})
        return result.decoded?.output.value0
    }
}

export class GoshContentSignature extends BaseContract implements IGoshContentSignature {
    abi: any = GoshContentSignatureABI
    account: Account
    address: string

    constructor(client: TonClient, address: string) {
        super()
        this.address = address
        this.account = new Account({ abi: this.abi }, { client, address })
    }

    async getContent(): Promise<string> {
        const result = await this.account.runLocal('getContent', {})
        return result.decoded?.output.value0
    }
}

export class GoshSmvProposal extends BaseContract implements IGoshSmvProposal {
    abi: any = GoshSmvProposalABI
    address: string
    account: Account
    meta?: IGoshSmvProposal['meta']

    constructor(client: TonClient, address: string) {
        super()
        this.address = address
        this.account = new Account({ abi: this.abi }, { client, address })
    }

    async load(): Promise<void> {
        const id = await this.getId()
        const params = await this.getGoshSetCommitProposalParams()
        const votes = await this.getVotes()
        const time = await this.getTime()
        const isCompleted = await this.isCompleted()
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
        }
    }

    async getDetails(): Promise<TGoshEventDetails> {
        const isCompleted = await this.isCompleted()

        return {
            address: this.address,
            id: await this.getId(),
            params: await this.getParams(),
            time: await this.getTime(),
            votes: await this.getVotes(),
            status: {
                completed: isCompleted !== null,
                accepted: !!isCompleted,
            },
        }
    }

    async getParams(): Promise<any> {
        try {
            return await this.getGoshSetCommitProposalParams()
        } catch {}
        try {
            return await this.getGoshAddProtectedBranchProposalParams()
        } catch {}
        try {
            return await this.getGoshDeleteProtectedBranchProposalParams()
        } catch {}
        return null
    }

    async getId(): Promise<string> {
        const result = await this.account.runLocal('propId', {})
        return result.decoded?.output.propId
    }

    async getGoshSetCommitProposalParams(): Promise<any> {
        const result = await this.account.runLocal('getGoshSetCommitProposalParams', {})
        const decoded = result.decoded?.output
        return {
            ...decoded,
            proposalKind: parseInt(decoded.proposalKind),
        }
    }

    async getGoshAddProtectedBranchProposalParams(): Promise<any> {
        const result = await this.account.runLocal(
            'getGoshAddProtectedBranchProposalParams',
            {},
        )
        const decoded = result.decoded?.output
        return {
            ...decoded,
            proposalKind: parseInt(decoded.proposalKind),
        }
    }

    async getGoshDeleteProtectedBranchProposalParams(): Promise<any> {
        const result = await this.account.runLocal(
            'getGoshDeleteProtectedBranchProposalParams',
            {},
        )
        const decoded = result.decoded?.output
        return {
            ...decoded,
            proposalKind: parseInt(decoded.proposalKind),
        }
    }

    async getVotes(): Promise<{ yes: number; no: number }> {
        const yes = await this.account.runLocal('votesYes', {})
        const no = await this.account.runLocal('votesNo', {})
        return {
            yes: +yes.decoded?.output.votesYes,
            no: +no.decoded?.output.votesNo,
        }
    }

    async getTime(): Promise<{ start: Date; finish: Date }> {
        const start = await this.account.runLocal('startTime', {})
        const finish = await this.account.runLocal('finishTime', {})
        return {
            start: new Date(+start.decoded?.output.startTime * 1000),
            finish: new Date(+finish.decoded?.output.finishTime * 1000),
        }
    }

    async isCompleted(): Promise<boolean | null> {
        const result = await this.account.runLocal('_isCompleted', {})
        return result.decoded?.output.value0
    }

    async getLockerAddr(): Promise<string> {
        const result = await this.account.runLocal('tokenLocker', {})
        return result.decoded?.output.tokenLocker
    }
}

export class GoshSmvLocker extends BaseContract implements IGoshSmvLocker {
    abi: any = GoshSmvLockerABI
    account: Account
    address: string
    meta?: IGoshSmvLocker['meta']

    constructor(client: TonClient, address: string) {
        super()
        this.address = address
        this.account = new Account({ abi: this.abi }, { client, address })
    }

    async load(): Promise<void> {
        const votes = await this.getVotes()
        const isBusy = await this.getIsBusy()
        this.meta = {
            votesLocked: votes.locked,
            votesTotal: votes.total,
            isBusy,
        }
    }

    async getDetails(): Promise<any> {
        return {
            address: this.address,
            tokens: await this.getVotes(),
            isBusy: await this.getIsBusy(),
        }
    }

    async getVotes(): Promise<{ total: number; locked: number }> {
        const total = await this.account.runLocal('total_votes', {})
        const locked = await this.account.runLocal('votes_locked', {})
        return {
            total: +total.decoded?.output.total_votes,
            locked: +locked.decoded?.output.votes_locked,
        }
    }

    async getIsBusy(): Promise<boolean> {
        const result = await this.account.runLocal('lockerBusy', {})
        return result.decoded?.output.lockerBusy
    }
}

export class GoshSmvClient extends BaseContract implements IGoshSmvClient {
    abi: any = GoshSmvClientABI
    account: Account
    address: string

    constructor(client: TonClient, address: string) {
        super()
        this.address = address
        this.account = new Account({ abi: this.abi }, { client, address })
    }

    async getLockedAmount(): Promise<number> {
        const result = await this.account.runLocal('_getLockedAmount', {})
        return +result.decoded?.output.value0
    }
}

export class GoshSmvTokenRoot extends BaseContract implements IGoshSmvTokenRoot {
    abi: any = GoshSmvTokenRootABI
    account: Account
    address: string

    constructor(client: TonClient, address: string) {
        super()
        this.address = address
        this.account = new Account({ abi: this.abi }, { client, address })
    }

    async getTotalSupply(): Promise<number> {
        const result = await this.account.runLocal('totalSupply_', {})
        return +result.decoded?.output.totalSupply_
    }
}
