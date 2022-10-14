import { KeyPair, TonClient } from '@eversdk/core'
import { Buffer } from 'buffer'
import isUtf8 from 'isutf8'
import { EGoshError, GoshError } from '../../errors'
import { EGoshBlobFlag, TAddress, TDao, TValidationResult } from '../../types'
import { sleep, whileFinite } from '../../utils'
import {
    IGoshAdapter,
    IGoshRepositoryAdapter,
    IGoshRoot,
    IGoshProfile,
    IGosh,
    IGoshDao,
    IGoshRepository,
    IGoshWallet,
    IGoshCommit,
    IGoshSnapshot,
    IGoshTree,
    IGoshDiff,
    IGoshDaoAdapter,
} from '../interfaces'
import { Gosh } from './gosh'
import { GoshDao } from './goshdao'
import { GoshProfile } from '../goshprofile'
import { GoshRepository } from './goshrepository'
import { GoshWallet } from './goshwallet'
import { GoshSnapshot } from './goshsnapshot'
import {
    getAllAccounts,
    getPaginatedAccounts,
    getTreeItemFullPath,
    retry,
    sha1,
    sha1Tree,
    sha256,
    splitByChunk,
    splitByPath,
    unixtimeWithTz,
    zstd,
    goshipfs,
} from '../../helpers'
import { GoshCommit } from './goshcommit'
import { GoshTree } from './goshtree'
import {
    IPushCallback,
    TBranch,
    TCommit,
    TRepository,
    TTag,
    TTree,
    TTreeItem,
    TUpgradeData,
} from '../../types/repo.types'
import { GoshTag } from './goshtag'
import * as Diff from 'diff'
import { GoshDiff } from './goshdiff'
import { MAX_ONCHAIN_FILE_SIZE, ZERO_COMMIT } from '../../constants'
import { GoshSmvTokenRoot } from './goshsmvtokenroot'
import { validateUsername } from '../../validators'

class GoshAdapter_0_11_0 implements IGoshAdapter {
    private static instance: GoshAdapter_0_11_0
    private auth?: { username: string; keys: KeyPair }

    static version: string = '0.11.0'

    client: TonClient
    goshroot: IGoshRoot
    gosh: IGosh

    private constructor(goshroot: IGoshRoot, goshaddr: string) {
        this.goshroot = goshroot
        this.client = goshroot.account.client
        this.gosh = new Gosh(this.client, goshaddr)
    }

    static getInstance(goshroot: IGoshRoot, goshaddr: string): GoshAdapter_0_11_0 {
        if (!GoshAdapter_0_11_0.instance) {
            GoshAdapter_0_11_0.instance = new GoshAdapter_0_11_0(goshroot, goshaddr)
        }
        return GoshAdapter_0_11_0.instance
    }

    isValidDaoName(name: string): TValidationResult {
        const matches = name.match(/^[\w-]+$/g)
        if (!matches || matches[0] !== name) {
            return { valid: false, reason: 'Name has incorrect symbols' }
        }
        if (name.length > 64) {
            return { valid: false, reason: 'Name is too long (>64)' }
        }
        return { valid: true }
    }

    async setAuth(username: string, keys: KeyPair): Promise<void> {
        this.auth = { username, keys }
    }

    async resetAuth(): Promise<void> {
        this.auth = undefined
    }

    async getProfile(options: {
        username?: string
        address?: TAddress
    }): Promise<IGoshProfile> {
        const { username, address } = options
        if (address) return new GoshProfile(this.client, address)

        if (!username) throw new GoshError(EGoshError.USER_NAME_UNDEFINED)
        const { value0 } = await this.gosh.runLocal('getProfileAddr', {
            name: username.toLowerCase(),
        })
        return new GoshProfile(this.client, value0)
    }

    async getDao(options: {
        name?: string
        address?: TAddress
        useAuth?: boolean
    }): Promise<IGoshDaoAdapter> {
        const { name, address, useAuth = true } = options

        let adapter: IGoshDaoAdapter
        if (address) adapter = new GoshDaoAdapter(this, address)
        else if (!name) throw new GoshError('DAO name is undefined')
        else {
            const { value0 } = await this.gosh.runLocal('getAddrDao', {
                name: name.toLowerCase(),
            })
            adapter = new GoshDaoAdapter(this, value0)
        }

        if (useAuth && this.auth && (await adapter.isDeployed())) {
            await adapter.setAuth(this.auth.username, this.auth.keys)
        }
        return adapter
    }

    async getRepository(options: {
        path?: string | undefined
        address?: TAddress | undefined
    }): Promise<IGoshRepositoryAdapter> {
        const { path, address } = options
        if (address) return new GoshRepositoryAdapter(this, address)

        if (!path) throw new GoshError('Repository path is undefined')
        const [dao, name] = path.split('/')
        const { value0 } = await this.gosh.runLocal('getAddrRepository', { dao, name })
        return new GoshRepositoryAdapter(this, value0)
    }

    async getRepositoryCodeHash(dao: TAddress): Promise<string> {
        const { value0 } = await this.gosh.runLocal('getRepoDaoCode', {
            dao,
        })
        const { hash } = await this.client.boc.get_boc_hash({
            boc: value0,
        })
        return hash
    }

    async getTvmHash(data: string | Buffer): Promise<string> {
        const state = Buffer.isBuffer(data)
            ? data.toString('hex')
            : Buffer.from(data).toString('hex')
        const { value0 } = await this.gosh.runLocal('getHash', {
            state,
        })
        return value0
    }

    async deployProfile(username: string, pubkey: string): Promise<IGoshProfile> {
        // Get profile and check it's status
        const profile = await this.getProfile({ username })
        if (await profile.isDeployed()) return profile

        // Deploy profile
        if (!pubkey.startsWith('0x')) pubkey = `0x${pubkey}`
        await this.gosh.run('deployProfile', { name: username.toLowerCase(), pubkey })
        const wait = await whileFinite(async () => await profile.isDeployed())
        if (!wait) throw new GoshError('Deploy profile timeout reached')
        return profile
    }
}

class GoshDaoAdapter implements IGoshDaoAdapter {
    private client: TonClient
    private gosh: IGoshAdapter
    private dao: IGoshDao
    private profile?: IGoshProfile
    private wallet?: IGoshWallet

    constructor(gosh: IGoshAdapter, address: string) {
        this.client = gosh.client
        this.gosh = gosh
        this.dao = new GoshDao(gosh.client, address)
    }

    async isDeployed(): Promise<boolean> {
        return await this.dao.isDeployed()
    }

    async setAuth(username: string, keys: KeyPair): Promise<void> {
        this.profile = await this.gosh.getProfile({ username })
        this.wallet = await this._getWallet(0, keys)

        const { value0: pubkey } = await this.wallet.runLocal('getAccess', {})
        console.debug('DaoAdapterAuth', pubkey)
        if (!pubkey) {
            await this.profile.turnOn(this.wallet.address, keys.public, keys)
        }
    }

    getAddress(): TAddress {
        return this.dao.address
    }

    async getName(): Promise<string> {
        const { value0 } = await this.dao.runLocal('getNameDao', {})
        return value0
    }

    getVersion(): string {
        return this.dao.version
    }

    async getDetails(): Promise<TDao> {
        const smvTokenRootAddr = await this._getSmvRootTokenAddr()
        const smvTokenRoot = new GoshSmvTokenRoot(this.client, smvTokenRootAddr)
        const owner = await this._getOwner()
        return {
            address: this.dao.address,
            name: await this.getName(),
            version: this.dao.version,
            members: await this._getProfiles(),
            supply: await smvTokenRoot.getTotalSupply(),
            owner,
            isAuthOwner: this.profile && this.profile.address === owner ? true : false,
            isAuthMember: await this._isAuthMember(),
            isAuthenticated: !!this.profile && !!this.wallet,
        }
    }

    async getRepository(options: {
        name?: string
        address?: TAddress
    }): Promise<IGoshRepositoryAdapter> {
        const { name, address } = options
        const auth = this.profile &&
            this.wallet && {
                username: await this.profile.getName(),
                wallet: this.wallet,
            }

        if (address) return new GoshRepositoryAdapter(this.gosh, address, auth)
        if (!name) throw new GoshError('Repo name undefined')

        const { value0 } = await this.dao.runLocal('getAddrRepository', {
            name: name.toLowerCase(),
        })
        return new GoshRepositoryAdapter(this.gosh, value0, auth)
    }

    async getMemberWallet(options: {
        profile?: string
        address?: TAddress
        index?: number
    }): Promise<IGoshWallet> {
        const { profile, address, index } = options
        if (address) return new GoshWallet(this.client, address)

        if (!profile) throw new GoshError(EGoshError.PROFILE_UNDEFINED)
        const addr = await this._getWalletAddress(profile, index ?? 0)
        return new GoshWallet(this.client, addr)
    }

    async getSmvPlatformCode(): Promise<string> {
        const { value0 } = await this.gosh.gosh.runLocal('getSMVPlatformCode', {})
        return value0
    }

    async getSmvProposalCodeHash(): Promise<string> {
        const { value0 } = await this.dao.runLocal('getProposalCode', {})
        const { hash } = await this.client.boc.get_boc_hash({ boc: value0 })
        return hash
    }

    async getSmvClientCode(): Promise<string> {
        const { value0 } = await this.dao.runLocal('getClientCode', {})
        return value0
    }

    async deployRepository(
        name: string,
        prev?: { addr: TAddress; version: string } | undefined,
    ): Promise<IGoshRepositoryAdapter> {
        if (!this.wallet) throw new GoshError(EGoshError.WALLET_UNDEFINED)

        // Check if repo is already deployed
        const repo = await this.getRepository({ name })
        if (await repo.isDeployed()) return repo

        // Deploy repo
        await this.wallet.run('deployRepository', {
            nameRepo: name.toLowerCase(),
            previous: prev || null,
        })
        const wait = await whileFinite(async () => await repo.isDeployed())
        if (!wait) throw new GoshError('Deploy repository timeout reached')
        return repo
    }

    async createMember(username: string[]): Promise<void> {
        if (!this.wallet) throw new GoshError(EGoshError.PROFILE_UNDEFINED)

        // Validate usernames and get profile addressed
        const profiles = await Promise.all(
            username.map(async (member) => {
                member = member.trim()
                const { valid, reason } = validateUsername(member)
                if (!valid) throw new GoshError(`${member}: ${reason}`)

                const profile = await this.gosh.getProfile({ username: member })
                if (!(await profile.isDeployed())) {
                    throw new GoshError(`${member}: Profile does not exist`)
                }

                return profile.address
            }),
        )

        // Deploy profiles wallets
        await this.wallet.run('deployWalletDao', { pubaddr: profiles })
    }

    async deleteMember(username: string[]): Promise<void> {
        if (!this.wallet) throw new GoshError(EGoshError.PROFILE_UNDEFINED)

        const profiles = await Promise.all(
            username.map(async (member) => {
                const profile = await this.gosh.getProfile({ username: member })
                return profile.address
            }),
        )
        await this.wallet.run('deleteWalletDao', { pubaddr: profiles })
    }

    async _isAuthMember(): Promise<boolean> {
        if (!this.profile) return false

        const { value0 } = await this.dao.runLocal('isMember', {
            pubaddr: this.profile.address,
        })
        return value0
    }

    private async _getWalletAddress(profile: TAddress, index: number): Promise<TAddress> {
        const { value0 } = await this.dao.runLocal('getAddrWallet', {
            pubaddr: profile,
            index,
        })
        return value0
    }

    async _getWallet(index: number, keys?: KeyPair): Promise<IGoshWallet> {
        if (!this.profile) throw new GoshError(EGoshError.PROFILE_UNDEFINED)

        const address = await this._getWalletAddress(this.profile.address, index)
        return new GoshWallet(this.client, address, { keys, profile: this.profile })
    }

    private async _getSmvRootTokenAddr(): Promise<string> {
        const { _rootTokenRoot } = await this.dao.runLocal('_rootTokenRoot', {})
        return _rootTokenRoot
    }

    private async _getProfiles(): Promise<{ profile: TAddress; wallet: TAddress }[]> {
        const { value0 } = await this.dao.runLocal('getWalletsFull', {})
        const profiles = []
        for (const key in value0) {
            const profile = `0:${key.slice(2)}`
            profiles.push({ profile, wallet: value0[key] })
        }
        return profiles
    }

    async _getOwner(): Promise<TAddress> {
        const { value0 } = await this.dao.runLocal('getOwner', {})
        return value0
    }
}

class GoshRepositoryAdapter implements IGoshRepositoryAdapter {
    private gosh: IGoshAdapter
    private client: TonClient
    private repo: IGoshRepository

    auth?: { username: string; wallet: IGoshWallet }

    constructor(
        gosh: IGoshAdapter,
        address: string,
        auth?: { username: string; wallet: IGoshWallet },
    ) {
        console.debug('Repo auth', auth)
        this.gosh = gosh
        this.client = gosh.client
        this.repo = new GoshRepository(this.client, address)
        this.auth = auth
    }

    async isDeployed(): Promise<boolean> {
        return await this.repo.isDeployed()
    }

    getAddress(): TAddress {
        return this.repo.address
    }

    async getName(): Promise<string> {
        const result = await this.repo.runLocal('getName', {})
        return result.value0
    }

    getVersion(): string {
        return this.repo.version
    }

    async getHead(): Promise<string> {
        const result = await this.repo.runLocal('getHEAD', {})
        return result.value0
    }

    async getDetails(): Promise<TRepository> {
        return {
            address: this.repo.address,
            name: await this.getName(),
            version: this.repo.version,
            branches: await this.getBranches(),
            head: await this.getHead(),
            tags: await this.getTags(),
        }
    }

    async getTree(
        commit: string,
        search?: string,
    ): Promise<{ tree: TTree; items: TTreeItem[] }> {
        /** Recursive walker through tree blobs */
        const recursive = async (path: string, subitems: TTreeItem[]) => {
            let trees = subitems.filter((item) => item.type === 'tree')

            if (search) {
                let [dir] = splitByPath(search)
                const filtered: string[] = [search, dir]
                while (dir !== '') {
                    const [part] = splitByPath(dir)
                    filtered.push(part)
                    dir = part
                }

                trees = trees.filter((item) => {
                    return filtered.indexOf(getTreeItemFullPath(item)) >= 0
                })
            }

            for (let i = 0; i < trees.length; i++) {
                const subtree = trees[i]
                const subtreeItems = await this._getTreeItems({ name: subtree.sha1 })
                const subtreePath = `${path ? `${path}/` : ''}${subtree.name}`

                subtreeItems.forEach((item) => (item.path = subtreePath))
                items.push(...subtreeItems)
                await sleep(300)
                await recursive(subtreePath, subtreeItems)
            }
        }

        // Get root tree items and recursively get subtrees
        let items: TTreeItem[] = []
        if (commit !== ZERO_COMMIT) {
            const root = (await this.getCommit({ name: commit })).tree
            items = await this._getTreeItems({ name: root })
        }
        if (search !== '') await recursive('', items)

        // Build full tree
        const tree = this._getTreeFromItems(items)
        return { tree, items }
    }

    async getBlob(options: {
        fullpath?: string
        address?: TAddress
    }): Promise<string | Buffer> {
        const snapshot = await this._getSnapshot(options)
        const data = await snapshot.runLocal('getSnapshot', {})
        const { value0, value1, value2, value3, value4, value5 } = data

        const patched = value0 === value3 ? value1 : value4
        const ipfs = value0 === value3 ? value2 : value5
        if (!patched && !ipfs) return ''

        const compressed = ipfs
            ? (await goshipfs.read(ipfs)).toString()
            : Buffer.from(patched, 'hex').toString('base64')
        const decompressed = await zstd.decompress(compressed, false)
        const buffer = Buffer.from(decompressed, 'base64')

        if (isUtf8(buffer)) return buffer.toString()
        return buffer
    }

    async getCommit(options: { name?: string; address?: TAddress }): Promise<TCommit> {
        const commit = await this._getCommit(options)
        const details = await commit.runLocal('getCommit', {})
        const { branch, sha, parents, content, initupgrade } = details

        // Parse content
        const splitted = (content as string).split('\n')
        const commentIndex = splitted.findIndex((v) => v === '')
        const commentData = splitted.slice(commentIndex + 1)
        const [title, ...message] = commentData
        const parsed: { [key: string]: string } = {
            title,
            message: message.filter((v) => v).join('\n'),
        }

        const commitData = splitted.slice(0, commentIndex)
        commitData.forEach((item) => {
            const keys = ['tree', 'author', 'committer']
            keys.forEach((key) => {
                if (item.search(key) >= 0) parsed[key] = item.replace(`${key} `, '')
            })
        })

        return {
            address: commit.address,
            name: sha,
            branch,
            content,
            tree: parsed.tree,
            title: parsed.title,
            message: parsed.message,
            author: parsed.author,
            committer: parsed.committer,
            parents,
            version: commit.version,
            initupgrade,
        }
    }

    async getCommitBlob(
        treepath: string,
        commit: string,
    ): Promise<{ previous: string | Buffer; current: string | Buffer }> {
        const target = await this.getCommit({ name: commit })
        let parent: string | undefined

        const fullpath = `${target.branch}/${treepath}`
        const snapshot = await this._getSnapshot({ fullpath })

        const applied = []
        let cursor: string | undefined
        while (true) {
            const page = await snapshot.getMessages({ msgType: ['IntIn'], cursor }, true)
            cursor = page.cursor

            const approved: string[] = []
            let parentIsNextApproved = false
            for (const { decoded } of page.messages) {
                if (decoded.name !== 'approve') continue
                approved.push(decoded.value.commit)
                if (parentIsNextApproved) {
                    parent = decoded.value.commit
                    break
                }
                if (decoded.value.commit === target.name) parentIsNextApproved = true
            }

            applied.push(
                ...page.messages
                    .filter(({ decoded }) => {
                        return (
                            decoded.name === 'applyDiff' &&
                            approved.indexOf(decoded.value.namecommit) >= 0
                        )
                    })
                    .map(({ decoded }) => decoded.value.diff),
            )

            if (!cursor || parent) break
            await sleep(300)
        }

        // Restore blob content to parent commit
        let previous = !parent ? '' : await this.getBlob({ fullpath })
        if (Buffer.isBuffer(previous)) return { previous, current: previous }
        for (const diff of applied) {
            if (!parent) break
            if (diff.patch && diff.commit === parent) break
            previous = await this._applyBlobDiffPatch(previous, diff, true)
        }

        // Apply target commit diff
        let current = previous
        const diffs = applied.filter((diff) => diff.commit === target.name)
        for (const diff of diffs) {
            current = await this._applyBlobDiffPatch(current, diff)
        }

        return { previous, current }
    }

    async getCommitBlobs(name: string): Promise<string[]> {
        const commit = await this._getCommit({ name })
        const branch = await commit.runLocal('getNameBranch', {})
        const { messages } = await commit.getMessages({ msgType: ['IntIn'] }, true, true)
        const blobs = messages
            .filter(({ decoded }) => {
                if (!decoded) return false

                const { name, value } = decoded
                return name === 'getAcceptedDiff' && value.branch === branch.value0
            })
            .map(({ decoded }) => decoded.value.value0.snap)

        return await Promise.all(
            blobs.map(async (address) => {
                const snapshot = await this._getSnapshot({ address })
                const { value0 } = await snapshot.runLocal('getName', {})
                return value0.split('/').slice(1).join('/')
            }),
        )
    }

    async getBranch(name: string): Promise<TBranch> {
        const { key, value, version } = await this._getBranch(name)
        return {
            name: key,
            commit: {
                ...(await this.getCommit({ address: value })),
                version,
            },
            isProtected: await this._isBranchProtected(name),
        }
    }

    async getBranches(): Promise<TBranch[]> {
        const { value0 } = await this.repo.runLocal('getAllAddress', {})
        return await Promise.all(
            value0.map(async (item: any) => {
                const { key, value, version } = item
                return {
                    name: key,
                    commit: {
                        ...(await this.getCommit({ address: value })),
                        version,
                    },
                    isProtected: await this._isBranchProtected(item.key),
                }
            }),
        )
    }

    async getTags(): Promise<TTag[]> {
        // Get repo tag code and all tag accounts addresses
        const code = await this.repo.runLocal('getTagCode', {})
        const codeHash = await this.client.boc.get_boc_hash({ boc: code.value0 })
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
                return await this._getTag(address)
            }),
        )
    }

    async getUpgrade(commit: string): Promise<TUpgradeData> {
        const commitData = await this.getCommit({ name: commit })
        const { tree, items } = await this.getTree(commit)
        const blobs = await this._getTreeBlobs(items, commitData.branch)
        return {
            commit: {
                ...commitData,
                parents: [commitData.address],
            },
            tree,
            blobs,
        }
    }

    async deployBranch(name: string, from: string): Promise<void> {
        if (!this.auth) throw new GoshError(EGoshError.PROFILE_UNDEFINED)

        // Get branch details and check name
        const fromBranch = await this.getBranch(from)
        if (fromBranch.name === name) return

        // Get `from` branch tree items and collect all blobs
        const { items } = await this.getTree(fromBranch.commit.name)
        const blobs = await this._getTreeBlobs(items, fromBranch.name)

        // Deploy snapshots (split by chunks)
        for (const chunk of splitByChunk(blobs, 20)) {
            await Promise.all(
                chunk.map(async (blob) => {
                    const { treepath, content } = blob
                    await this._deploySnapshot(
                        name,
                        fromBranch.commit.name,
                        treepath,
                        content,
                    )
                }),
            )
            await sleep(300)
        }

        // Deploy new branch
        await this.auth.wallet.run('deployBranch', {
            repoName: await this.getName(),
            newName: name,
            fromCommit: fromBranch.commit.name,
        })
        const wait = await whileFinite(async () => {
            const branch = await this.getBranch(name)
            return branch.name === name
        })
        if (!wait) throw new GoshError('Deploy branch timeout reached')
    }

    async deleteBranch(name: string): Promise<void> {
        if (!this.auth) throw new GoshError(EGoshError.PROFILE_UNDEFINED)

        if (['main', 'master'].indexOf(name) >= 0) {
            throw new GoshError(`Can not delete branch '${name}' `)
        }

        // Check branch
        const { key } = await this._getBranch(name)
        if (!key) throw new GoshError('Branch does not exist')
        if (await this._isBranchProtected(name)) {
            throw new GoshError('Branch is protected')
        }

        // Get all snapshots from branch and delete
        const snapCode = await this.repo.runLocal('getSnapCode', { branch: name })
        const snapCodeHash = await this.client.boc.get_boc_hash({ boc: snapCode.value0 })
        const accounts = await getAllAccounts({
            filters: [`code_hash: {eq:"${snapCodeHash.hash}"}`],
        })
        const snaps = accounts.map((account) => account.id)
        for (const chunk of splitByChunk(snaps, 20)) {
            await Promise.all(
                chunk.map(async (address) => {
                    await this.auth!.wallet.run('deleteSnapshot', { snap: address })
                }),
            )
            await sleep(200)
        }

        // Delete branch and wait for it to be deleted
        await this.auth.wallet.run('deleteBranch', {
            repoName: await this.getName(),
            Name: name,
        })
        const wait = await whileFinite(async () => {
            const { key } = await this._getBranch(name)
            return !key
        })
        if (!wait) throw new GoshError('Delete branch timeout reached')
    }

    async lockBranch(name: string): Promise<void> {
        if (!this.auth) throw new GoshError(EGoshError.PROFILE_UNDEFINED)

        const locker = await this.auth.wallet.getSmvLocker()
        await this.auth.wallet.run('startProposalForAddProtectedBranch', {
            repoName: await this.getName(),
            branchName: name,
            num_clients: await locker.getNumClients(),
        })
    }

    async unlockBranch(name: string): Promise<void> {
        if (!this.auth) throw new GoshError(EGoshError.PROFILE_UNDEFINED)

        const locker = await this.auth.wallet.getSmvLocker()
        await this.auth.wallet.run('startProposalForDeleteProtectedBranch', {
            repoName: await this.getName(),
            branchName: name,
            num_clients: await locker.getNumClients(),
        })
    }

    async setHead(branch: string): Promise<void> {
        if (!this.auth) throw new GoshError(EGoshError.PROFILE_UNDEFINED)

        await this.auth.wallet.run('setHEAD', {
            repoName: await this.repo.getName(),
            branchName: branch,
        })
    }

    async push(
        branch: string,
        blobs: {
            treepath: string
            original: string | Buffer
            modified: string | Buffer
        }[],
        message: string,
        tags?: string,
        branchParent?: string,
        callback?: IPushCallback,
    ): Promise<void> {
        if (!this.auth) throw new GoshError(EGoshError.PROFILE_UNDEFINED)

        const taglist = tags ? tags.split(' ') : []
        const callbackDummy = () => {}
        callback = callback || callbackDummy

        // Get branch info and get branch tree
        const branchTo = await this.getBranch(branch)
        const { items } = await this.getTree(branchTo.commit.name)

        // Generate blobs meta object
        const blobsMeta: {
            snapshot: TAddress
            treepath: string
            treeItem?: TTreeItem
            compressed: string
            patch: string | null
            isIpfs: boolean
            flags: number
            hashes: { sha1: string; sha256: string }
        }[] = await Promise.all(
            blobs.map(async ({ treepath, original, modified }) => {
                const treeItem = items.find((it) => getTreeItemFullPath(it) === treepath)
                if (treeItem && !original) throw new GoshError(EGoshError.FILE_EXISTS)
                if (!modified) throw new GoshError(EGoshError.FILE_EMPTY)
                if (original === modified) throw new GoshError(EGoshError.FILE_UNMODIFIED)

                const compressed = await zstd.compress(modified)
                let patch = null
                let flags = EGoshBlobFlag.COMPRESSED
                if (
                    Buffer.isBuffer(original) ||
                    Buffer.isBuffer(modified) ||
                    Buffer.from(modified).byteLength > MAX_ONCHAIN_FILE_SIZE
                ) {
                    flags |= EGoshBlobFlag.IPFS
                    if (Buffer.isBuffer(modified)) flags |= EGoshBlobFlag.BINARY
                } else {
                    patch = this._generateBlobDiffPatch(treepath, modified, original)
                    patch = await zstd.compress(patch)
                    patch = Buffer.from(patch, 'base64').toString('hex')
                }

                const isIpfs = (flags & EGoshBlobFlag.IPFS) === EGoshBlobFlag.IPFS
                const hashes = {
                    sha1: sha1(modified, treeItem?.type || 'blob', 'sha1'),
                    sha256: isIpfs
                        ? sha256(modified, true)
                        : await this.gosh.getTvmHash(modified),
                }

                return {
                    snapshot: await this._getSnapshotAddress(branch, treepath),
                    treepath,
                    treeItem,
                    compressed,
                    patch,
                    isIpfs,
                    flags,
                    hashes,
                }
            }),
        )

        // Add/update tree items by incoming blobs
        const updatedTrees: string[] = []
        await Promise.all(
            blobs.map(async ({ treepath }) => {
                const blobmeta = blobsMeta.find((data) => data.treepath === treepath)
                const { hashes, flags, treeItem } = blobmeta!

                this._getTreeItemsFromPath(treepath, hashes, flags, treeItem).forEach(
                    (item) => {
                        const pathindex = updatedTrees.findIndex((p) => p === item.path)
                        if (pathindex < 0) updatedTrees.push(item.path)

                        const itemIndex = items.findIndex((itm) => {
                            return item.path === itm.path && item.name === itm.name
                        })
                        if (itemIndex >= 0) items[itemIndex] = item
                        else items.push(item)
                    },
                )
            }),
        )
        const updatedTree = this._updateSubtreesHash(this._getTreeFromItems(items))
        const updatedTreeHash = sha1Tree(updatedTree[''], 'sha1')
        callback({
            treesBuild: true,
            treesDeploy: { count: 0, total: updatedTrees.length },
            snapsDeploy: { count: 0, total: blobsMeta.length },
            diffsDeploy: { count: 0, total: blobsMeta.length },
            tagsDeploy: { count: 0, total: taglist.length },
        })

        // Generate commit data
        const { commitHash, commitContent, commitParentAddrs } =
            await this._generateCommit(branchTo, updatedTreeHash, message, branchParent)

        // Deploy everything for commit with commit
        await Promise.all([
            // Deploy snapshots
            (async () => {
                let counter = 0
                for (const { treepath } of blobsMeta) {
                    await retry(async () => {
                        await this._deploySnapshot(branch, '', treepath)
                    }, 3)
                    callback({ snapsDeploy: { count: ++counter } })
                }
            })(),
            // Deploy trees
            (async () => {
                let counter = 0
                for (const path of updatedTrees) {
                    await retry(async () => await this._deployTree(updatedTree[path]), 3)
                    callback({ treesDeploy: { count: ++counter } })
                }
            })(),
            // Deploy diffs
            (async () => {
                let counter = 0
                for (let i = 0; i < blobsMeta.length; i++) {
                    await retry(async () => {
                        await this._deployDiff(branch, commitHash, blobsMeta[i], i)
                    }, 3)
                    callback({ diffsDeploy: { count: ++counter } })
                }
            })(),
            // Deploy tags
            (async () => {
                let counter = 0
                for (const tag of taglist) {
                    await retry(async () => await this._deployTag(commitHash, tag), 3)
                    callback({ tagsDeploy: { count: ++counter } })
                }
            })(),
            // Deploy commit
            (async () => {
                await retry(async () => {
                    await this._deployCommit(
                        branch,
                        commitHash,
                        commitContent,
                        commitParentAddrs,
                        updatedTreeHash,
                        false,
                    )
                }, 3)
                callback({ commitDeploy: true })
            })(),
        ])

        // Set commit or start PR proposal
        if (!branchTo.isProtected) {
            await retry(async () => {
                await this._setCommit(branch, commitHash, blobsMeta.length)
            }, 3)
            const wait = await whileFinite(async () => {
                const check = await this.getBranch(branch)
                return check.commit.address !== branchTo.commit.address
            })
            if (!wait) throw new GoshError('Push timeout reached')
        } else {
            await retry(async () => {
                await this._startProposalForSetCommit(
                    branch,
                    commitHash,
                    blobsMeta.length,
                )
            }, 3)
        }
        callback({ completed: true })
    }

    async pushUpgrade(data: TUpgradeData): Promise<void> {
        const { blobs, commit, tree } = data

        // Deploy everything for commit with commit
        await Promise.all([
            // Deploy trees
            (async () => {
                let counter = 0
                for (const path of Object.keys(tree)) {
                    await retry(async () => await this._deployTree(tree[path]), 3)
                    // callback({ treesDeploy: { count: ++counter } })
                }
            })(),
            // Deploy commit
            (async () => {
                await retry(async () => {
                    await this._deployCommit(
                        commit.branch,
                        commit.name,
                        commit.content,
                        commit.parents,
                        commit.tree,
                        true,
                    )
                }, 3)
                // callback({ commitDeploy: true })
            })(),
        ])

        // Deploy snapshots
        let counter = 0
        for (const { treepath, content } of blobs) {
            await retry(async () => {
                await this._deploySnapshot(commit.branch, commit.name, treepath, content)
            }, 3)
            // callback({ snapsDeploy: { count: ++counter } })
        }

        // Set commit
        await retry(async () => {
            await this._setCommit(commit.branch, commit.name, blobs.length)
        }, 3)
        const wait = await whileFinite(async () => {
            const check = await this.getBranch(commit.branch)
            return check.commit.address !== commit.address
        })
        if (!wait) throw new GoshError('Push upgrade timeout reached')
    }

    private async _isBranchProtected(name: string): Promise<boolean> {
        const { value0 } = await this.repo.runLocal('isBranchProtected', {
            branch: name,
        })
        return value0
    }

    private async _getBranch(name: string): Promise<any> {
        const { value0 } = await this.repo.runLocal('getAddrBranch', { name })
        return value0
    }

    private async _getSnapshot(options: {
        fullpath?: string
        address?: TAddress
    }): Promise<IGoshSnapshot> {
        const { address, fullpath } = options
        if (address) return new GoshSnapshot(this.client, address)

        if (!fullpath) throw new GoshError('Blob name is undefined')
        const [branch, ...path] = fullpath.split('/')
        const addr = await this._getSnapshotAddress(branch, path.join('/'))
        return new GoshSnapshot(this.client, addr)
    }

    private async _getCommit(options: {
        name?: string
        address?: TAddress
    }): Promise<IGoshCommit> {
        const { name, address } = options

        if (address) return new GoshCommit(this.client, address)

        if (!name) throw new GoshError('Commit name is undefined')
        const { value0 } = await this.repo.runLocal('getCommitAddr', { nameCommit: name })
        return new GoshCommit(this.client, value0)
    }

    private async _getTree(options: {
        name?: string
        address?: TAddress
    }): Promise<IGoshTree> {
        const { address, name } = options
        if (address) return new GoshTree(this.client, address)

        if (!name) throw new GoshError('Tree name is undefined')
        const { value0 } = await this.repo.runLocal('getTreeAddr', { treeName: name })
        return new GoshTree(this.client, value0)
    }

    private async _getTreeItems(options: {
        name?: string
        address?: TAddress
    }): Promise<TTreeItem[]> {
        const tree = await this._getTree(options)
        const { value0 } = await tree.runLocal('gettree', {})
        return Object.values(value0).map((item: any) => ({
            flags: +item.flags,
            mode: item.mode,
            type: item.typeObj,
            sha1: item.sha1,
            sha256: item.sha256,
            path: '',
            name: item.name,
        }))
    }

    private async _getTreeBlobs(
        items: TTreeItem[],
        branch: string,
    ): Promise<{ treepath: string; content: string | Buffer }[]> {
        const filtered = items.filter(
            (item) => ['blob', 'blobExecutable'].indexOf(item.type) >= 0,
        )
        const blobs: { treepath: string; content: string | Buffer }[] = []
        for (const chunk of splitByChunk(filtered, 20)) {
            await Promise.all(
                chunk.map(async (item) => {
                    const treepath = getTreeItemFullPath(item)
                    const fullpath = `${branch}/${treepath}`
                    const content = await this.getBlob({ fullpath })
                    blobs.push({ treepath, content })
                }),
            )
            await sleep(300)
        }
        return blobs
    }

    private async _getDiff(
        commit: string,
        index1: number,
        index2: number,
    ): Promise<IGoshDiff> {
        const { value0 } = await this.repo.runLocal('getDiffAddr', {
            commitName: commit,
            index1,
            index2,
        })
        return new GoshDiff(this.client, value0)
    }

    private async _getTag(address: TAddress): Promise<TTag> {
        const tag = new GoshTag(this.client, address)
        const commit = await tag.runLocal('getCommit', {})
        const content = await tag.runLocal('getContent', {})
        return {
            commit: commit.value0,
            content: content.value0,
        }
    }

    private async _getSnapshotAddress(
        branch: string,
        treepath: string,
    ): Promise<TAddress> {
        const { value0 } = await this.repo.runLocal('getSnapshotAddr', {
            branch,
            name: treepath,
        })
        return value0
    }

    private async _deploySnapshot(
        branch: string,
        commit: string,
        treepath: string,
        content?: string | Buffer,
    ): Promise<IGoshSnapshot> {
        if (!this.auth) throw new GoshError(EGoshError.PROFILE_UNDEFINED)

        const addr = await this._getSnapshotAddress(branch, treepath)
        const snapshot = new GoshSnapshot(this.client, addr)
        if (await snapshot.isDeployed()) return snapshot

        const data: { snapshotData: string; snapshotIpfs: string | null } = {
            snapshotData: '',
            snapshotIpfs: null,
        }
        if (!!content) {
            const compressed = await zstd.compress(content)
            if (
                Buffer.isBuffer(content) ||
                Buffer.from(content).byteLength > MAX_ONCHAIN_FILE_SIZE
            ) {
                data.snapshotIpfs = await goshipfs.write(compressed)
            } else {
                data.snapshotData = Buffer.from(compressed, 'base64').toString('hex')
            }
        }

        await this.auth.wallet.run('deployNewSnapshot', {
            branch,
            commit,
            repo: this.repo.address,
            name: treepath,
            snapshotdata: data.snapshotData,
            snapshotipfs: data.snapshotIpfs,
        })
        return snapshot
    }

    private async _deployTree(items: TTreeItem[]): Promise<void> {
        if (!this.auth) throw new GoshError(EGoshError.PROFILE_UNDEFINED)

        // Check if deployed
        const hash = sha1Tree(items, 'sha1')
        const tree = await this._getTree({ name: hash })
        if (await tree.isDeployed()) return

        // Deploy tree
        const datatree: any = {}
        for (const { flags, mode, type, name, sha1, sha256 } of items) {
            const key = await this.gosh.getTvmHash(`${type}:${name}`)
            datatree[key] = {
                flags: flags.toString(),
                mode,
                typeObj: type,
                name,
                sha1,
                sha256,
            }
        }
        await this.auth.wallet.run('deployTree', {
            repoName: await this.repo.getName(),
            shaTree: hash,
            datatree,
            ipfs: null,
        })
    }

    private async _deployDiff(
        branch: string,
        commit: string,
        blobmeta: {
            snapshot: TAddress
            treepath: string
            treeItem?: TTreeItem
            compressed: string
            patch: string | null
            isIpfs: boolean
            flags: number
            hashes: { sha1: string; sha256: string }
        },
        index1: number,
    ): Promise<void> {
        if (!this.auth) throw new GoshError(EGoshError.PROFILE_UNDEFINED)

        // Check if deployed
        const diffContract = await this._getDiff(commit, index1, 0)
        if (await diffContract.isDeployed()) return

        // Deploy diff
        const { isIpfs, compressed, snapshot, patch, hashes } = blobmeta
        const ipfs = isIpfs ? await goshipfs.write(compressed) : null
        const diff = {
            snap: snapshot,
            commit,
            patch,
            ipfs,
            ...hashes,
        }
        await this.auth.wallet.run('deployDiff', {
            repoName: await this.getName(),
            branchName: branch,
            commitName: commit,
            diffs: [diff],
            index1,
            index2: 0,
            last: true,
        })
    }

    private async _deployTag(commit: string, content: string): Promise<void> {
        if (!this.auth) throw new GoshError(EGoshError.PROFILE_UNDEFINED)

        const commitContract = await this._getCommit({ name: commit })
        await this.auth.wallet.run('deployTag', {
            repoName: await this.getName(),
            nametag: sha1(content, 'tag', 'sha1'),
            nameCommit: commit,
            content,
            commit: commitContract.address,
        })
    }

    private async _deployCommit(
        branch: string,
        commit: string,
        content: string,
        parents: TAddress[],
        treeHash: string,
        upgrade: boolean,
    ): Promise<void> {
        if (!this.auth) throw new GoshError(EGoshError.PROFILE_UNDEFINED)

        // Check if deployed
        const commitContract = await this._getCommit({ name: commit })
        if (await commitContract.isDeployed()) return

        // Deploy commit
        const tree = await this._getTree({ name: treeHash })
        await this.auth.wallet.run('deployCommit', {
            repoName: await this.repo.getName(),
            branchName: branch,
            commitName: commit,
            fullCommit: content,
            parents,
            tree: tree.address,
            upgrade,
        })
    }

    private async _setCommit(
        branch: string,
        commit: string,
        numBlobs: number,
    ): Promise<void> {
        if (!this.auth) throw new GoshError(EGoshError.PROFILE_UNDEFINED)

        await this.auth.wallet.run('setCommit', {
            repoName: await this.getName(),
            branchName: branch,
            commit,
            numberChangedFiles: numBlobs,
            numberCommits: 1,
        })
    }

    private async _startProposalForSetCommit(
        branch: string,
        commit: string,
        numBlobs: number,
    ): Promise<void> {
        if (!this.auth) throw new GoshError(EGoshError.PROFILE_UNDEFINED)

        const locker = await this.auth.wallet.getSmvLocker()
        await this.auth.wallet.run('startProposalForSetCommit', {
            repoName: await this.getName(),
            branchName: branch,
            commit,
            numberChangedFiles: numBlobs,
            numberCommits: 1,
            num_clients: await locker.getNumClients(),
        })
    }

    private async _generateCommit(
        branch: TBranch,
        treeHash: string,
        message: string,
        branchParent?: string,
    ): Promise<{
        commitHash: string
        commitContent: string
        commitParentAddrs: TAddress[]
    }> {
        if (!this.auth) throw new GoshError(EGoshError.PROFILE_UNDEFINED)

        const email = `${this.auth.username.replace('@', '')}@gosh.sh`
        const parent = branchParent ? await this.getBranch(branchParent) : undefined

        const parentNames = []
        if (branch.commit.name !== ZERO_COMMIT) {
            parentNames.push(`parent ${branch.commit.name}`)
        }
        if (parent && parent.commit.name !== ZERO_COMMIT) {
            parentNames.push(`parent ${parent.commit.name}`)
        }

        const parentAddrs = [branch.commit.address, parent?.commit.address].reduce(
            (filtered: string[], item) => {
                if (!!item) filtered.push(item)
                return filtered
            },
            [],
        )

        const commitdata = [
            `tree ${treeHash}`,
            ...parentNames,
            `author ${this.auth.username} <${email}> ${unixtimeWithTz()}`,
            `committer ${this.auth.username} <${email}> ${unixtimeWithTz()}`,
            '',
            message,
        ]
            .filter((item) => item !== null)
            .join('\n')

        return {
            commitHash: sha1(commitdata, 'commit', 'sha1'),
            commitContent: commitdata,
            commitParentAddrs: parentAddrs,
        }
    }

    private async _applyBlobDiffPatch(
        content: string | Buffer,
        diff: any,
        reverse: boolean = false,
    ): Promise<string | Buffer> {
        if (Buffer.isBuffer(content)) return content

        const { ipfs, patch } = diff
        const compressed = ipfs
            ? (await goshipfs.read(ipfs)).toString()
            : Buffer.from(patch, 'hex').toString('base64')
        const decompressed = await zstd.decompress(compressed, false)
        const buffer = Buffer.from(decompressed, 'base64')

        if (!isUtf8(buffer)) return buffer

        const patchOrContent = buffer.toString()
        if (ipfs) return patchOrContent

        const apply = reverse
            ? this._reverseBlobDiffPatch(patchOrContent)
            : patchOrContent
        return Diff.applyPatch(content as string, apply)
    }

    private _getTreeFromItems(items: TTreeItem[]): TTree {
        const isTree = (i: TTreeItem) => i.type === 'tree'

        const result = items.filter(isTree).reduce(
            (acc: TTree, i) => {
                const path = i.path !== '' ? `${i.path}/${i.name}` : i.name
                if (!acc.path) acc[path] = []
                return acc
            },
            { '': [] },
        )
        items.forEach((i: any) => result[i.path].push(i))
        return result
    }

    private _getTreeItemsFromPath(
        fullpath: string,
        hashes: { sha1: string; sha256: string },
        flags: number,
        treeItem?: TTreeItem,
    ): TTreeItem[] {
        const items: TTreeItem[] = []

        let [path, name] = splitByPath(fullpath)
        items.push({
            flags,
            mode: treeItem?.mode || '100644',
            type: treeItem?.type || 'blob',
            sha1: hashes.sha1,
            sha256: hashes.sha256,
            path,
            name,
        })

        // Parse blob path and push subtrees to items
        while (path !== '') {
            const [dirPath, dirName] = splitByPath(path)
            if (!items.find((item) => item.path === dirPath && item.name === dirName)) {
                items.push({
                    flags: 0,
                    mode: '040000',
                    type: 'tree',
                    sha1: '',
                    sha256: '',
                    path: dirPath,
                    name: dirName,
                })
            }
            path = dirPath
        }
        return items
    }

    private _updateSubtreesHash(tree: TTree): TTree {
        Object.keys(tree)
            .sort((a, b) => b.length - a.length)
            .filter((key) => key.length)
            .forEach((key) => {
                const [path, name] = splitByPath(key)
                const found = tree[path].find(
                    (item) => item.path === path && item.name === name,
                )
                if (found) {
                    found.sha1 = sha1Tree(tree[key], 'sha1')
                    found.sha256 = `0x${sha1Tree(tree[key], 'sha256')}`
                }
            })

        return tree
    }

    private _generateBlobDiffPatch = (
        treepath: string,
        modified: string,
        original: string,
    ) => {
        /** Git like patch representation */
        // let patch = Diff.createTwoFilesPatch(
        //     `a/${filename}`,
        //     `b/${filename}`,
        //     original,
        //     modified
        // );
        // patch = patch.split('\n').slice(1).join('\n');

        // const shaOriginal = original ? sha1(original, 'blob') : '0000000';
        // const shaModified = modified ? sha1(modified, 'blob') : '0000000';
        // patch =
        //     `index ${shaOriginal.slice(0, 7)}..${shaModified.slice(0, 7)} 100644\n` + patch;

        // if (!original) patch = patch.replace(`a/${filename}`, '/dev/null');
        // if (!modified) patch = patch.replace(`b/${filename}`, '/dev/null');

        /** Gosh snapshot recommended patch representation */
        const patch = Diff.createPatch(treepath, original, modified)
        return patch.split('\n').slice(4).join('\n')
    }

    private _reverseBlobDiffPatch = (patch: string) => {
        const parsedDiff = Diff.parsePatch(patch)[0]

        const { oldFileName, newFileName, oldHeader, newHeader, hunks } = parsedDiff

        parsedDiff.oldFileName = newFileName
        parsedDiff.oldHeader = newHeader
        parsedDiff.newFileName = oldFileName
        parsedDiff.newHeader = oldHeader

        for (const hunk of hunks) {
            const { oldLines, oldStart, newLines, newStart, lines } = hunk
            hunk.oldLines = newLines
            hunk.oldStart = newStart
            hunk.newLines = oldLines
            hunk.newStart = oldStart

            hunk.lines = lines.map((l) => {
                if (l.startsWith('-')) return `+${l.slice(1)}`
                if (l.startsWith('+')) return `-${l.slice(1)}`
                return l
            })
        }

        return parsedDiff
    }
}

export { GoshAdapter_0_11_0 }
