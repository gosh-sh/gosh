import { KeyPair, TonClient } from '@eversdk/core'
import { Buffer } from 'buffer'
import isUtf8 from 'isutf8'
import { EGoshError, GoshError } from '../../errors'
import { EBlobFlag, TAddress, TDao, TValidationResult } from '../../types'
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
    getTreeItemFullPath,
    sha1,
    sha1Tree,
    sha256,
    splitByPath,
    unixtimeWithTz,
    zstd,
    goshipfs,
    executeByChunk,
    splitByChunk,
} from '../../helpers'
import { GoshCommit } from './goshcommit'
import { GoshTree } from './goshtree'
import {
    IPushCallback,
    ITBranchOperateCallback,
    TBranch,
    TCommit,
    TDiff,
    TRepository,
    TTag,
    TTree,
    TTreeItem,
    TUpgradeData,
} from '../../types/repo.types'
import { GoshTag } from './goshtag'
import * as Diff from 'diff'
import { GoshDiff } from './goshdiff'
import {
    MAX_ONCHAIN_SIZE,
    MAX_PARALLEL_READ,
    MAX_PARALLEL_WRITE,
    ZERO_COMMIT,
} from '../../constants'
import { GoshSmvTokenRoot } from './goshsmvtokenroot'
import { validateUsername } from '../../validators'
import { GoshContentSignature } from './goshcontentsignature'

class GoshAdapter_0_11_0 implements IGoshAdapter {
    private static instance: GoshAdapter_0_11_0
    private auth?: { username: string; keys: KeyPair }

    static version: string = '0.11.0'

    client: TonClient
    goshroot: IGoshRoot
    gosh: IGosh

    private constructor(goshroot: IGoshRoot, goshaddr: TAddress) {
        this.goshroot = goshroot
        this.client = goshroot.account.client
        this.gosh = new Gosh(this.client, goshaddr)
    }

    static getInstance(goshroot: IGoshRoot, goshaddr: TAddress): GoshAdapter_0_11_0 {
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

    async isValidProfile(username: string[]): Promise<TAddress[]> {
        return await executeByChunk(username, MAX_PARALLEL_READ, async (member) => {
            member = member.trim()
            const { valid, reason } = validateUsername(member)
            if (!valid) throw new GoshError(`${member}: ${reason}`)

            const profile = await this.getProfile({ username: member })
            if (!(await profile.isDeployed())) {
                throw new GoshError(`${member}: Profile does not exist`)
            }

            return profile.address
        })
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

        if (useAuth && this.auth) {
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

    constructor(gosh: IGoshAdapter, address: TAddress) {
        this.client = gosh.client
        this.gosh = gosh
        this.dao = new GoshDao(gosh.client, address)
    }

    async isDeployed(): Promise<boolean> {
        return await this.dao.isDeployed()
    }

    async setAuth(username: string, keys: KeyPair): Promise<void> {
        if (!(await this.isDeployed())) return

        this.profile = await this.gosh.getProfile({ username })
        this.wallet = await this._getWallet(0, keys)
        if (!(await this.wallet.isDeployed())) return

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

    async getRemoteConfig(): Promise<object> {
        if (!this.profile || !this.wallet || this.wallet.account.signer.type !== 'Keys') {
            throw new GoshError(EGoshError.PROFILE_UNDEFINED)
        }

        const keys = this.wallet.account.signer.keys
        const { endpoints } = await this.client.net.get_endpoints()
        return {
            'primary-network': 'primary',
            networks: {
                primary: {
                    'user-wallet': {
                        profile: await this.profile.getName(),
                        pubkey: keys.public,
                        secret: keys.secret,
                    },
                    endpoints,
                },
            },
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

        const profiles = await this.gosh.isValidProfile(username)

        const locker = await this.wallet.getSmvLocker()
        await locker.validateProposalStart()

        await this.wallet.run('startProposalForDeployWalletDao', {
            pubaddr: profiles,
            num_clients: await locker.getNumClients(),
        })
    }

    async deleteMember(username: string[]): Promise<void> {
        if (!this.wallet) throw new GoshError(EGoshError.PROFILE_UNDEFINED)

        const profiles = await executeByChunk(
            username,
            MAX_PARALLEL_READ,
            async (member) => {
                const profile = await this.gosh.getProfile({ username: member })
                return profile.address
            },
        )

        const locker = await this.wallet.getSmvLocker()
        await locker.validateProposalStart()

        await this.wallet.run('startProposalForDeleteWalletDao', {
            pubaddr: profiles,
            num_clients: await locker.getNumClients(),
        })
    }

    async upgrade(version: string, description?: string | undefined): Promise<void> {
        if (!this.wallet) throw new GoshError(EGoshError.PROFILE_UNDEFINED)

        const locker = await this.wallet.getSmvLocker()
        await locker.validateProposalStart()

        await this.wallet.run('startProposalForUpgradeDao', {
            newversion: version,
            description: description ?? `Upgrade DAO to version ${version}`,
            num_clients: await locker.getNumClients(),
        })
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
    private name?: string
    private subwallets: IGoshWallet[] = []

    auth?: { username: string; wallet: IGoshWallet }

    constructor(
        gosh: IGoshAdapter,
        address: TAddress,
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
        if (!this.name) {
            const { value0 } = await this.repo.runLocal('getName', {})
            this.name = value0
        }
        return this.name!
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
            branches: (await this._getBranches()).length,
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

    async getBlob(options: { fullpath?: string; address?: TAddress }): Promise<{
        onchain: { commit: string; content: string }
        content: string | Buffer
        ipfs: boolean
    }> {
        const result: {
            onchain: { commit: string; content: string }
            content: string | Buffer
            ipfs: boolean
        } = {
            onchain: { commit: '', content: '' },
            content: '',
            ipfs: false,
        }

        const snapshot = await this._getSnapshot(options)
        const data = await snapshot.runLocal('getSnapshot', {})
        const { value0, value1, value2, value3, value4, value5, value6 } = data

        const name = options.fullpath || (await snapshot.getName())
        const branch = name.split('/')[0]
        const { commit } = await this.getBranch(branch)

        const patched = value0 === commit.name ? value1 : value4
        const ipfscid = value0 === commit.name ? value2 : value5

        // Read onchain snapshot content
        if (patched) {
            const compressed = Buffer.from(patched, 'hex').toString('base64')
            const content = await zstd.decompress(compressed, true)
            result.onchain = {
                commit: value0 === value3 ? value0 : value3,
                content: content,
            }
            result.content = content
            result.ipfs = false
        }

        // Read ipfs snapshot content
        if (ipfscid) {
            const compressed = (await goshipfs.read(ipfscid)).toString()
            const decompressed = await zstd.decompress(compressed, false)
            const buffer = Buffer.from(decompressed, 'base64')
            result.onchain = { commit: value6, content: result.content as string }
            result.content = isUtf8(buffer) ? buffer.toString() : buffer
            result.ipfs = true
        }

        return result
    }

    async getCommit(options: { name?: string; address?: TAddress }): Promise<TCommit> {
        const commit = await this._getCommit(options)
        const details = await commit.runLocal('getCommit', {})
        const { value0: versionPrev } = await commit.runLocal('getPrevCommitVersion', {})
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
            versionPrev: versionPrev ?? commit.version,
            initupgrade,
        }
    }

    async getCommitBlob(
        treepath: string,
        commit: string,
    ): Promise<{ previous: string | Buffer; current: string | Buffer }> {
        // Get commit tree items filtered by blob tree path,
        // find resulting blob sha1 after commit was applied
        const tree = (await this.getTree(commit, treepath)).items
        const sha1 = tree.find((item) => getTreeItemFullPath(item) === treepath)?.sha1
        if (!sha1) {
            throw new GoshError('Blob not found in commit tree', { commit, treepath })
        }

        // Get snapshot and read all incoming internal messages
        const target = await this.getCommit({ name: commit })
        const fullpath = `${target.branch}/${treepath}`
        const snapshot = await this._getSnapshot({ fullpath })
        const { messages } = await snapshot.getMessages(
            { msgType: ['IntIn'] },
            true,
            true,
        )

        // Filter only approved diff messages
        const approved: string[] = []
        for (const { decoded } of messages) {
            if (['approve', 'constructor'].indexOf(decoded.name) < 0) continue
            const { value } = decoded
            if (value.commit) approved.push(value.commit)
        }

        // Filter applied diff messages by approved and get diffs
        const applied = messages
            .filter(({ decoded }) => {
                const { name, value } = decoded
                const key = name === 'applyDiff' ? 'namecommit' : 'commit'
                return (
                    ['applyDiff', 'constructor'].indexOf(name) >= 0 &&
                    approved.indexOf(value[key]) >= 0
                )
            })
            .map(({ decoded }) => {
                const { name, value } = decoded
                if (name === 'applyDiff') return decoded.value.diff
                return {
                    commit: value.commit,
                    patch: !!value.data,
                    ipfs: value.ipfsdata,
                }
            })

        // Restore blob state on current commit
        const { onchain, content } = await this.getBlob({ fullpath })
        let current = content
        let prevIndex: number | undefined
        for (const [i, diff] of applied.entries()) {
            const prev = i > 0 && applied[i - 1]

            if (prevIndex !== undefined) break
            if (diff.ipfs && diff.sha1 !== sha1) continue
            if (prev?.ipfs && diff.patch) current = onchain.content
            if (diff.sha1 === sha1) {
                prevIndex = diff.ipfs ? i + 1 : i
                if (diff.patch) break
            }
            current = await this._applyBlobDiffPatch(current, diff, true)
        }

        // Restore blob state on commit before current
        let previous = current
        if (prevIndex !== undefined && applied[prevIndex]) {
            const diff = applied[prevIndex]
            const prev = prevIndex > 0 && applied[prevIndex - 1]

            if (prev?.ipfs && diff.patch) previous = onchain.content
            if (
                !prev?.ipfs ||
                (prev?.ipfs && diff.ipfs) ||
                (prev?.ipfs && prev.sha1 !== sha1)
            ) {
                previous = await this._applyBlobDiffPatch(previous, diff, true)
            }
        } else previous = ''

        return { previous, current }
    }

    async getCommitBlobs(name: string): Promise<string[]> {
        const commit = await this._getCommit({ name })
        const branch = await commit.runLocal('getNameBranch', {})
        const { messages } = await commit.getMessages({ msgType: ['IntIn'] }, true, true)
        const addresses = messages
            .filter(({ decoded }) => {
                if (!decoded) return false

                const { name, value } = decoded
                return name === 'getAcceptedDiff' && value.branch === branch.value0
            })
            .map(({ decoded }) => decoded.value.value0.snap)

        return await executeByChunk<TAddress, TAddress>(
            addresses,
            MAX_PARALLEL_READ,
            async (address) => {
                const snapshot = await this._getSnapshot({ address })
                const name = await snapshot.getName()
                return name.split('/').slice(1).join('/')
            },
        )
    }

    async getPullRequestBlob(
        item: { treepath: string; index: number },
        commit: string,
    ): Promise<{ previous: string | Buffer; current: string | Buffer }> {
        // If commit was accepted, return blob state at commit
        if (item.index === -1) {
            return await this.getCommitBlob(item.treepath, commit)
        }

        // Get blob state at parent commit, get diffs and apply
        const details = await this.getCommit({ name: commit })
        const parent = await this.getCommit({ address: details.parents[0] })

        let previous: string | Buffer
        let current: string | Buffer
        try {
            const state = await this.getCommitBlob(item.treepath, parent.name)
            previous = current = state.current
        } catch {
            previous = current = ''
        }

        const diff = await this._getDiff(commit, item.index, 0)
        const subdiffs = await this._getDiffs(diff)
        for (const subdiff of subdiffs) {
            current = await this._applyBlobDiffPatch(current, subdiff)
        }
        return { previous, current }
    }

    async getPullRequestBlobs(
        commit: string,
    ): Promise<{ treepath: string; index: number }[]> {
        // Get IGoshDiff instance list for commit
        const diffs: IGoshDiff[] = []
        let index1 = 0
        while (true) {
            const diff = await this._getDiff(commit, index1, 0)
            if (!(await diff.isDeployed())) break

            diffs.push(diff)
            index1++
        }

        // Get blobs list from commit (if commit was accepted)
        if (!diffs.length) {
            const blobs = await this.getCommitBlobs(commit)
            return blobs.map((treepath) => ({ treepath, index: -1 }))
        }

        // Get blobs list from diffs (if commit is not accepted)
        return await executeByChunk<IGoshDiff, { treepath: string; index: number }>(
            diffs,
            MAX_PARALLEL_READ,
            async (diff, index) => {
                const subdiffs = await this._getDiffs(diff)
                const snapshot = await this._getSnapshot({ address: subdiffs[0].snap })
                const name = await snapshot.getName()
                const treepath = name.split('/').slice(1).join('/')
                return { treepath, index }
            },
        )
    }

    async getBranch(name: string): Promise<TBranch> {
        const { branchname, commitaddr, commitversion } = await this._getBranch(name)
        return {
            name: branchname,
            commit: {
                ...(await this.getCommit({ address: commitaddr })),
                version: commitversion,
            },
            isProtected: await this._isBranchProtected(name),
        }
    }

    async getBranches(): Promise<TBranch[]> {
        const items = await this._getBranches()
        return await executeByChunk<any, TBranch>(
            items,
            MAX_PARALLEL_READ,
            async (item) => {
                const { branchname, commitaddr, commitversion } = item
                return {
                    name: branchname,
                    commit: {
                        ...(await this.getCommit({ address: commitaddr })),
                        version: commitversion,
                    },
                    isProtected: await this._isBranchProtected(branchname),
                }
            },
        )
    }

    async getTags(): Promise<TTag[]> {
        // Get repo tag code and all tag accounts addresses
        const code = await this.repo.runLocal('getTagCode', {})
        const codeHash = await this.client.boc.get_boc_hash({ boc: code.value0 })
        const accounts: string[] = await getAllAccounts({
            filters: [`code_hash: {eq:"${codeHash.hash}"}`],
        })

        // Read each tag account details
        return await executeByChunk<TAddress, TTag>(
            accounts,
            MAX_PARALLEL_READ,
            async (address) => {
                return await this._getTag(address)
            },
        )
    }

    async getUpgrade(commit: string): Promise<TUpgradeData> {
        const commitData = await this.getCommit({ name: commit })
        if (commitData.name === ZERO_COMMIT) {
            return {
                commit: {
                    ...commitData,
                    tree: ZERO_COMMIT,
                    parents: [commitData.address],
                },
                tree: {},
                blobs: [],
            }
        }

        // Get non-zero commit data
        const { tree, items } = await this.getTree(commit)
        const blobs = await this._getTreeBlobs(items, commitData.branch)
        return {
            commit: { ...commitData, parents: [commitData.address] },
            tree,
            blobs,
        }
    }

    async getContentSignature(
        repository: string,
        commit: string,
        label: string,
    ): Promise<string> {
        if (!this.auth) throw new GoshError(EGoshError.PROFILE_UNDEFINED)

        const { value0: address } = await this.auth.wallet.runLocal('getContentAddress', {
            repoName: repository,
            commit,
            label,
        })

        const instance = new GoshContentSignature(this.client, address)
        const { value0 } = await instance.runLocal('getContent', {})
        return value0
    }

    async createBranch(
        name: string,
        from: string,
        callback?: ITBranchOperateCallback,
    ): Promise<void> {
        if (!this.auth) throw new GoshError(EGoshError.PROFILE_UNDEFINED)

        const cb: ITBranchOperateCallback = (params) => callback && callback(params)

        // Get branch details and check name
        const fromBranch = await this.getBranch(from)
        if (fromBranch.name === name) return

        // Get `from` branch tree items and collect all blobs
        const { items } = await this.getTree(fromBranch.commit.name)
        const blobs = await this._getTreeBlobs(items, fromBranch.name)
        cb({
            snapshotsRead: true,
            snapshotsWrite: { count: 0, total: blobs.length },
        })

        // Deploy snapshots
        let counter = 0
        await this._runMultiwallet(blobs, async (wallet, { treepath, content }) => {
            await this._deploySnapshot(
                name,
                fromBranch.commit.name,
                treepath,
                content,
                wallet,
            )
            cb({ snapshotsWrite: { count: ++counter } })
        })

        // Deploy new branch
        await this.auth.wallet.run('deployBranch', {
            repoName: await this.getName(),
            newName: name,
            fromCommit: fromBranch.commit.name,
        })
        const wait = await whileFinite(async () => {
            const { branchname } = await this._getBranch(name)
            return branchname === name
        })
        if (!wait) throw new GoshError('Deploy branch timeout reached')
        cb({ completed: true })
    }

    async deleteBranch(name: string, callback?: ITBranchOperateCallback): Promise<void> {
        if (!this.auth) throw new GoshError(EGoshError.PROFILE_UNDEFINED)

        const cb: ITBranchOperateCallback = (params) => callback && callback(params)

        if (['main', 'master'].indexOf(name) >= 0) {
            throw new GoshError(`Can not delete branch '${name}' `)
        }

        // Check branch
        const { branchname } = await this._getBranch(name)
        if (!branchname) throw new GoshError('Branch does not exist')
        if (await this._isBranchProtected(name)) {
            throw new GoshError('Branch is protected')
        }

        // Get all snapshots from branch and delete
        const snapCode = await this.repo.runLocal('getSnapCode', { branch: name })
        const snapCodeHash = await this.client.boc.get_boc_hash({ boc: snapCode.value0 })
        const accounts = await getAllAccounts({
            filters: [`code_hash: {eq:"${snapCodeHash.hash}"}`],
        })
        cb({
            snapshotsRead: true,
            snapshotsWrite: { count: 0, total: accounts.length },
        })

        let counter = 0
        await this._runMultiwallet(
            accounts.map((account) => account.id),
            async (wallet, address) => {
                await wallet.run('deleteSnapshot', { snap: address })
                cb({ snapshotsWrite: { count: ++counter } })
            },
        )

        // Delete branch and wait for it to be deleted
        await this.auth.wallet.run('deleteBranch', {
            repoName: await this.getName(),
            Name: name,
        })
        const wait = await whileFinite(async () => {
            const { branchname } = await this._getBranch(name)
            return !branchname
        })
        if (!wait) throw new GoshError('Delete branch timeout reached')
        cb({ completed: true })
    }

    async lockBranch(name: string): Promise<void> {
        if (!this.auth) throw new GoshError(EGoshError.PROFILE_UNDEFINED)
        if (await this._isBranchProtected(name)) {
            throw new GoshError('Branch is already protected')
        }

        const locker = await this.auth.wallet.getSmvLocker()
        await locker.validateProposalStart()

        await this.auth.wallet.run('startProposalForAddProtectedBranch', {
            repoName: await this.getName(),
            branchName: name,
            num_clients: await locker.getNumClients(),
        })
    }

    async unlockBranch(name: string): Promise<void> {
        if (!this.auth) throw new GoshError(EGoshError.PROFILE_UNDEFINED)
        if (!(await this._isBranchProtected(name))) {
            throw new GoshError('Branch is not protected')
        }

        const locker = await this.auth.wallet.getSmvLocker()
        await locker.validateProposalStart()

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
        isPullRequest: boolean,
        tags?: string,
        branchParent?: string,
        callback?: IPushCallback,
    ): Promise<void> {
        if (!this.auth) throw new GoshError(EGoshError.PROFILE_UNDEFINED)

        const taglist = tags ? tags.split(' ') : []
        const cb: IPushCallback = (params) => callback && callback(params)

        // Get branch info and get branch tree
        const branchTo = await this.getBranch(branch)
        const { items } = await this.getTree(branchTo.commit.name)

        // Validation
        if (!isPullRequest && branchTo.isProtected) {
            throw new GoshError(EGoshError.PR_BRANCH)
        }
        if (isPullRequest) {
            const locker = await this.auth.wallet.getSmvLocker()
            await locker.validateProposalStart()
        }

        // Generate blobs meta object
        const blobsMeta = await executeByChunk(
            blobs,
            MAX_PARALLEL_READ,
            async ({ treepath, original, modified }) => {
                const treeItem: TTreeItem | undefined = items.find((it) => {
                    return getTreeItemFullPath(it) === treepath
                })
                if (treeItem && !original) throw new GoshError(EGoshError.FILE_EXISTS)
                if (!modified) throw new GoshError(EGoshError.FILE_EMPTY)
                if (original === modified) throw new GoshError(EGoshError.FILE_UNMODIFIED)

                const compressed = await zstd.compress(modified)
                let patch = null
                let flags = EBlobFlag.COMPRESSED
                if (
                    ((treeItem?.flags || 0) & EBlobFlag.IPFS) === EBlobFlag.IPFS ||
                    Buffer.isBuffer(original) ||
                    Buffer.isBuffer(modified) ||
                    Buffer.from(modified).byteLength > MAX_ONCHAIN_SIZE
                ) {
                    flags |= EBlobFlag.IPFS
                    if (Buffer.isBuffer(modified)) flags |= EBlobFlag.BINARY
                } else {
                    patch = this._generateBlobDiffPatch(treepath, modified, original)
                    if (Buffer.from(patch).byteLength > MAX_ONCHAIN_SIZE) {
                        flags |= EBlobFlag.IPFS
                        patch = null
                    } else {
                        patch = await zstd.compress(patch)
                        patch = Buffer.from(patch, 'base64').toString('hex')
                    }
                }

                const isIpfs = (flags & EBlobFlag.IPFS) === EBlobFlag.IPFS
                const hashes: { sha1: string; sha256: string } = {
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
            },
        )

        // Add/update tree items by incoming blobs
        const updatedTrees: string[] = []
        blobs.forEach(({ treepath }) => {
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
        })
        const updatedTree = this._updateSubtreesHash(this._getTreeFromItems(items))
        const updatedTreeHash = sha1Tree(updatedTree[''], 'sha1')
        cb({
            treesBuild: true,
            treesDeploy: { count: 0, total: updatedTrees.length },
            snapsDeploy: { count: 0, total: blobsMeta.length },
            diffsDeploy: { count: 0, total: blobsMeta.length },
            tagsDeploy: { count: 0, total: taglist.length },
        })

        // Generate commit data
        const { commitHash, commitContent, commitParentAddrs } =
            await this._generateCommit(branchTo, updatedTreeHash, message, branchParent)

        // Deploy snapshots
        let snapCounter = 0
        await this._runMultiwallet(blobsMeta, async (wallet, { treepath }) => {
            await this._deploySnapshot(branch, '', treepath, undefined, wallet)
            cb({ snapsDeploy: { count: ++snapCounter } })
        })

        // Deploy trees
        let treeCounter = 0
        await this._runMultiwallet(updatedTrees, async (wallet, path) => {
            await this._deployTree(updatedTree[path], wallet)
            cb({ treesDeploy: { count: ++treeCounter } })
        })

        // Deploy diffs
        let diffCounter = 0
        await this._runMultiwallet(blobsMeta, async (wallet, meta, index) => {
            await this._deployDiff(branch, commitHash, meta, index, wallet)
            cb({ diffsDeploy: { count: ++diffCounter } })
        })

        // Deploy tags
        let tagsCounter = 0
        await this._runMultiwallet(taglist, async (wallet, tag) => {
            await this._deployTag(commitHash, tag, wallet)
            cb({ tagsDeploy: { count: ++tagsCounter } })
        })

        // Deploy commit
        await this._deployCommit(
            branch,
            commitHash,
            commitContent,
            commitParentAddrs,
            updatedTreeHash,
            false,
        )
        cb({ commitDeploy: true })

        // Set commit or start PR proposal
        if (!isPullRequest) {
            await this._setCommit(branch, commitHash, blobsMeta.length)
            const wait = await whileFinite(async () => {
                const check = await this.getBranch(branch)
                return check.commit.address !== branchTo.commit.address
            })
            if (!wait) throw new GoshError('Push timeout reached')
        } else {
            await this._startProposalForSetCommit(branch, commitHash, blobsMeta.length)
        }
        cb({ completed: true })
    }

    async pushUpgrade(data: TUpgradeData): Promise<void> {
        const { blobs, commit, tree } = data

        // Deploy trees
        await this._runMultiwallet(Object.keys(tree), async (wallet, path) => {
            await this._deployTree(tree[path], wallet)
        })

        // Deploy commit
        await this._deployCommit(
            commit.branch,
            commit.name,
            commit.content,
            commit.parents,
            commit.tree,
            true,
        )

        // Deploy snapshots
        await this._runMultiwallet(blobs, async (wallet, { treepath, content }) => {
            await this._deploySnapshot(
                commit.branch,
                commit.name,
                treepath,
                content,
                wallet,
            )
        })

        // Set commit
        await this._setCommit(commit.branch, commit.name, blobs.length)
        const wait = await whileFinite(async () => {
            const check = await this.getBranch(commit.branch)
            return check.commit.address !== commit.address
        })
        if (!wait) throw new GoshError('Push upgrade timeout reached')
    }

    async deployContentSignature(
        repository: string,
        commit: string,
        label: string,
        content: string,
    ): Promise<void> {
        if (!this.auth) throw new GoshError(EGoshError.PROFILE_UNDEFINED)

        await this.auth.wallet.run('deployContent', {
            repoName: repository,
            commit,
            label,
            content,
        })
    }

    private async _isBranchProtected(name: string): Promise<boolean> {
        const { value0 } = await this.repo.runLocal('isBranchProtected', {
            branch: name,
        })
        return value0
    }

    private async _getBranches(): Promise<any[]> {
        const { value0 } = await this.repo.runLocal('getAllAddress', {})
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
        return await executeByChunk(filtered, MAX_PARALLEL_READ, async (item) => {
            const treepath = getTreeItemFullPath(item)
            const fullpath = `${branch}/${treepath}`
            const { content } = await this.getBlob({ fullpath })
            return { treepath, content }
        })
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

    private async _getDiffs(diff: IGoshDiff): Promise<TDiff[]> {
        const { value0 } = await diff.runLocal('getdiffs', {})
        return value0
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
        wallet?: IGoshWallet,
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
                Buffer.from(content).byteLength > MAX_ONCHAIN_SIZE
            ) {
                data.snapshotIpfs = await goshipfs.write(compressed)
            } else {
                data.snapshotData = Buffer.from(compressed, 'base64').toString('hex')
            }
        }

        wallet = wallet || this.auth.wallet
        await wallet.run('deployNewSnapshot', {
            branch,
            commit,
            repo: this.repo.address,
            name: treepath,
            snapshotdata: data.snapshotData,
            snapshotipfs: data.snapshotIpfs,
        })
        return snapshot
    }

    private async _getSubwallet(index: number): Promise<IGoshWallet> {
        if (!this.auth) throw new GoshError(EGoshError.PROFILE_UNDEFINED)
        if (this.auth.wallet.account.signer.type !== 'Keys') {
            throw new GoshError(EGoshError.PROFILE_UNDEFINED)
        }

        const { value0 } = await this.auth.wallet.runLocal('getWalletAddr', { index })
        const subwallet = new GoshWallet(this.client, value0, {
            keys: this.auth.wallet.account.signer.keys,
        })

        if (!(await subwallet.isDeployed())) {
            await this.auth.wallet.run('deployWallet', {})
        }

        return subwallet
    }

    private async _deployTree(items: TTreeItem[], wallet?: IGoshWallet): Promise<void> {
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

        wallet = wallet || this.auth.wallet
        await wallet.run('deployTree', {
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
        wallet?: IGoshWallet,
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

        wallet = wallet || this.auth.wallet
        await wallet.run('deployDiff', {
            repoName: await this.getName(),
            branchName: branch,
            commitName: commit,
            diffs: [diff],
            index1,
            index2: 0,
            last: true,
        })
    }

    private async _deployTag(
        commit: string,
        content: string,
        wallet?: IGoshWallet,
    ): Promise<void> {
        if (!this.auth) throw new GoshError(EGoshError.PROFILE_UNDEFINED)

        const commitContract = await this._getCommit({ name: commit })
        wallet = wallet || this.auth.wallet
        await wallet.run('deployTag', {
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
        await locker.validateProposalStart()

        await this.auth.wallet.run('startProposalForSetCommit', {
            repoName: await this.getName(),
            branchName: branch,
            commit,
            numberChangedFiles: numBlobs,
            numberCommits: 1,
            num_clients: await locker.getNumClients(),
        })
    }

    private async _runMultiwallet<Input, Output>(
        array: Input[],
        executor: (wallet: IGoshWallet, params: Input, index: number) => Promise<Output>,
    ): Promise<Output[]> {
        if (!this.auth) throw new GoshError(EGoshError.PROFILE_UNDEFINED)

        // Get/deploy wallets
        if (this.subwallets.length !== 10) {
            this.subwallets = await Promise.all(
                Array.from(new Array(10)).map(async (_, index) => {
                    if (index === 0) return this.auth!.wallet
                    return await this._getSubwallet(index)
                }),
            )
        }

        // Split array for chunks for each wallet
        const walletChunkSize = Math.ceil(array.length / this.subwallets.length)
        const chunks = splitByChunk(array, walletChunkSize)

        // Run chunk for each wallet
        const result: Output[] = []
        await Promise.all(
            chunks.map(async (chunk, index) => {
                const chunkSize = Math.floor(MAX_PARALLEL_WRITE / chunks.length)
                const subresult = await executeByChunk(
                    chunk,
                    chunkSize,
                    async (params, i) => {
                        const gIndex = walletChunkSize * index + i
                        return await executor(this.subwallets[index], params, gIndex)
                    },
                )
                result.push(...subresult)
            }),
        )
        return result
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
        diff: TDiff,
        reverse: boolean = false,
    ): Promise<string | Buffer> {
        if (Buffer.isBuffer(content)) return content

        const { ipfs, patch } = diff
        const compressed = ipfs
            ? (await goshipfs.read(ipfs)).toString()
            : Buffer.from(patch!, 'hex').toString('base64')
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
