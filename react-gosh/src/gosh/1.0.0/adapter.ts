import { KeyPair, TonClient } from '@eversdk/core'
import { Buffer } from 'buffer'
import isUtf8 from 'isutf8'
import { EGoshError, GoshError } from '../../errors'
import {
    TAddress,
    TDao,
    TSmvDetails,
    ESmvEventType,
    TValidationResult,
    EBlobFlag,
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
    TSmvEvent,
    TSmvEventMinimal,
    TPushBlobData,
} from '../../types'
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
    IGoshSmvAdapter,
    IGoshSmvLocker,
    IGoshSmvProposal,
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
import { GoshTag } from './goshtag'
import * as Diff from 'diff'
import { GoshDiff } from './goshdiff'
import {
    MAX_ONCHAIN_SIZE,
    MAX_PARALLEL_READ,
    MAX_PARALLEL_WRITE,
    SmvEventTypes,
    ZERO_BLOB_SHA1,
    ZERO_COMMIT,
} from '../../constants'
import { GoshSmvTokenRoot } from './goshsmvtokenroot'
import { validateUsername } from '../../validators'
import { GoshContentSignature } from './goshcontentsignature'
import { GoshSmvLocker } from './goshsmvlocker'
import { GoshSmvProposal } from './goshsmvproposal'
import { GoshSmvClient } from './goshsmvclient'

class GoshAdapter_1_0_0 implements IGoshAdapter {
    private static instance: GoshAdapter_1_0_0
    private auth?: { username: string; keys: KeyPair }

    static version: string = '1.0.0'

    client: TonClient
    goshroot: IGoshRoot
    gosh: IGosh

    private constructor(goshroot: IGoshRoot, goshaddr: TAddress) {
        this.goshroot = goshroot
        this.client = goshroot.account.client
        this.gosh = new Gosh(this.client, goshaddr)
    }

    static getInstance(goshroot: IGoshRoot, goshaddr: TAddress): GoshAdapter_1_0_0 {
        if (!GoshAdapter_1_0_0.instance) {
            GoshAdapter_1_0_0.instance = new GoshAdapter_1_0_0(goshroot, goshaddr)
        }
        return GoshAdapter_1_0_0.instance
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
        const { value0 } = await this.gosh.runLocal(
            'getProfileAddr',
            {
                name: username.toLowerCase(),
            },
            undefined,
            { useCachedBoc: true },
        )
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
            const { value0 } = await this.gosh.runLocal(
                'getAddrDao',
                {
                    name: name.toLowerCase(),
                },
                undefined,
                { useCachedBoc: true },
            )
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
        const { value0 } = await this.gosh.runLocal(
            'getAddrRepository',
            { dao, name },
            undefined,
            { useCachedBoc: true },
        )
        return new GoshRepositoryAdapter(this, value0)
    }

    async getRepositoryCodeHash(dao: TAddress): Promise<string> {
        const { value0 } = await this.gosh.runLocal(
            'getRepoDaoCode',
            {
                dao,
            },
            undefined,
            { useCachedBoc: true },
        )
        const { hash } = await this.client.boc.get_boc_hash({ boc: value0 })
        return hash
    }

    async getTvmHash(data: string | Buffer): Promise<string> {
        const state = Buffer.isBuffer(data)
            ? data.toString('hex')
            : Buffer.from(data).toString('hex')
        const { value0 } = await this.gosh.runLocal(
            'getHash',
            {
                state,
            },
            undefined,
            { useCachedBoc: true },
        )
        return value0
    }

    async deployProfile(username: string, pubkey: string): Promise<IGoshProfile> {
        // Get profile and check it's status
        const profile = await this.getProfile({ username })
        if (await profile.isDeployed()) return profile

        // Deploy profile
        await this.gosh.run('deployProfile', {
            name: username.toLowerCase(),
            pubkey: pubkey.startsWith('0x') ? pubkey : `0x${pubkey}`,
        })
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
        const { value0 } = await this.dao.runLocal('getNameDao', {}, undefined, {
            useCachedBoc: true,
        })
        return value0
    }

    getVersion(): string {
        return this.dao.version
    }

    async getDetails(): Promise<TDao> {
        const smv = await this.getSmv()
        const owner = await this._getOwner()
        return {
            address: this.dao.address,
            name: await this.getName(),
            version: this.dao.version,
            members: await this._getProfiles(),
            supply: await smv.getTotalSupply(),
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
        const config = await this._getConfig()

        let auth = undefined
        if (this.profile && this.wallet) {
            auth = {
                username: await this.profile.getName(),
                wallet0: this.wallet,
            }
        }

        if (address) return new GoshRepositoryAdapter(this.gosh, address, auth, config)
        if (!name) throw new GoshError('Repo name undefined')

        const { value0 } = await this.dao.runLocal(
            'getAddrRepository',
            {
                name: name.toLowerCase(),
            },
            undefined,
            { useCachedBoc: true },
        )
        return new GoshRepositoryAdapter(this.gosh, value0, auth, config)
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

    async getSmv(): Promise<IGoshSmvAdapter> {
        return new GoshSmvAdapter(this.gosh, this.dao, this.wallet)
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

        const smv = await this.getSmv()
        await smv.validateProposalStart()

        await this.wallet.run('startProposalForDeployWalletDao', {
            pubaddr: profiles,
            num_clients: await smv.getClientsCount(),
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

        const smv = await this.getSmv()
        await smv.validateProposalStart()

        await this.wallet.run('startProposalForDeleteWalletDao', {
            pubaddr: profiles,
            num_clients: await smv.getClientsCount(),
        })
    }

    async upgrade(version: string, description?: string | undefined): Promise<void> {
        if (!this.wallet) throw new GoshError(EGoshError.PROFILE_UNDEFINED)

        const smv = await this.getSmv()
        await smv.validateProposalStart()

        await this.wallet.run('startProposalForUpgradeDao', {
            newversion: version,
            description: description ?? `Upgrade DAO to version ${version}`,
            num_clients: await smv.getClientsCount(),
        })
    }

    private async _isAuthMember(): Promise<boolean> {
        if (!this.profile) return false

        const { value0 } = await this.dao.runLocal('isMember', {
            pubaddr: this.profile.address,
        })
        return value0
    }

    private async _getWalletAddress(profile: TAddress, index: number): Promise<TAddress> {
        const { value0 } = await this.dao.runLocal(
            'getAddrWallet',
            {
                pubaddr: profile,
                index,
            },
            undefined,
            { useCachedBoc: true },
        )
        return value0
    }

    private async _getWallet(index: number, keys?: KeyPair): Promise<IGoshWallet> {
        if (!this.profile) throw new GoshError(EGoshError.PROFILE_UNDEFINED)

        const address = await this._getWalletAddress(this.profile.address, index)
        return new GoshWallet(this.client, address, { keys })
    }

    private async _getProfiles(): Promise<{ profile: TAddress; wallet: TAddress }[]> {
        const { value0 } = await this.dao.runLocal('getWalletsFull', {})
        const profiles = []
        for (const key in value0) {
            const profile = `0:${key.slice(2)}`
            profiles.push({ profile, wallet: value0[key].member })
        }
        return profiles
    }

    private async _getOwner(): Promise<TAddress> {
        const { value0 } = await this.dao.runLocal('getOwner', {})
        return value0
    }

    private async _getConfig(): Promise<any> {
        const { value0 } = await this.dao.runLocal('getConfig', {})
        return {
            maxWalletsWrite: +value0,
        }
    }
}

class GoshRepositoryAdapter implements IGoshRepositoryAdapter {
    private gosh: IGoshAdapter
    private client: TonClient
    private repo: IGoshRepository
    private name?: string
    private subwallets: IGoshWallet[] = []

    auth?: { username: string; wallet0: IGoshWallet }
    config?: { maxWalletsWrite: number }

    constructor(
        gosh: IGoshAdapter,
        address: TAddress,
        auth?: { username: string; wallet0: IGoshWallet },
        config?: { maxWalletsWrite: number },
    ) {
        console.debug('Repo', auth, config)
        this.gosh = gosh
        this.client = gosh.client
        this.repo = new GoshRepository(this.client, address)
        this.auth = auth
        this.config = config
    }

    async isDeployed(): Promise<boolean> {
        return await this.repo.isDeployed()
    }

    getAddress(): TAddress {
        return this.repo.address
    }

    async getName(): Promise<string> {
        if (!this.name) {
            const { value0 } = await this.repo.runLocal('getName', {}, undefined, {
                useCachedBoc: true,
            })
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
        commit: string | TCommit,
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
        if (typeof commit === 'string') commit = await this.getCommit({ name: commit })
        let items: TTreeItem[] = []
        if (commit.name !== ZERO_COMMIT) {
            items = await this._getTreeItems({ name: commit.tree })
        }
        if (search !== '') await recursive('', items)

        // Build full tree
        const tree = this._getTreeFromItems(items)
        return { tree, items }
    }

    async getBlob(options: {
        commit?: string
        fullpath?: string
        address?: TAddress
    }): Promise<{
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

        const { commit, ...rest } = options
        const snapshot = await this._getSnapshot(rest)
        const data = await snapshot.runLocal('getSnapshot', {})
        const { value0, value1, value2, value3, value4, value5, value6 } = data

        const name = options.fullpath || (await snapshot.getName())
        const branch = name.split('/')[0]
        const commitName = commit || (await this.getBranch(branch)).commit.name

        const patched = value0 === commitName ? value1 : value4
        const ipfscid = value0 === commitName ? value2 : value5

        // Read onchain snapshot content
        if (patched) {
            const compressed = Buffer.from(patched, 'hex').toString('base64')
            const content = await zstd.decompress(compressed, true)
            result.onchain = {
                commit: value0 === commitName ? value0 : value3,
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
        branch: string,
        commit: string | TCommit,
    ): Promise<{ previous: string | Buffer; current: string | Buffer }> {
        if (typeof commit === 'string') commit = await this.getCommit({ name: commit })
        const parent = await this.getCommit({ address: commit.parents[0] })

        // Get snapshot and read all incoming internal messages
        const fullpath = `${branch}/${treepath}`
        const snapshot = await this._getSnapshot({ fullpath })
        const { messages } = await snapshot.getMessages(
            { msgType: ['IntIn'] },
            true,
            true,
        )

        // Collect approved diff messages
        const approved = messages
            .filter(({ decoded }) => {
                if (!decoded) return false
                return ['approve', 'constructor'].indexOf(decoded.name) >= 0
            })
            .map(({ decoded }) => {
                const { name, value } = decoded
                if (name === 'approve') return value.diff
                return {
                    commit: value.commit,
                    patch: value.data || false,
                    ipfs: value.ipfsdata,
                }
            })

        // Restore blob at commit and parent commit
        const { content } = await this.getBlob({ commit: commit.name, fullpath })
        const current = await this._getCommitBlob(commit, treepath, content, approved)
        const previous =
            parent.name === ZERO_COMMIT
                ? ''
                : await this._getCommitBlob(parent, treepath, content, approved)

        return { previous, current }
    }

    async getCommitBlobs(branch: string, commit: string | TCommit): Promise<string[]> {
        const isTCommit = typeof commit !== 'string'
        const object = !isTCommit
            ? await this._getCommit({ name: commit })
            : await this._getCommit({ address: commit.address })

        const { messages } = await object.getMessages({ msgType: ['IntIn'] }, true, true)
        const addresses = messages
            .filter(({ decoded }) => {
                if (!decoded) return false

                const { name, value } = decoded
                return name === 'getAcceptedDiff' && value.branch === branch
            })
            .map(({ decoded }) => decoded.value.value0.snap)

        return await executeByChunk<TAddress, TAddress>(
            Array.from(new Set(addresses)),
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
        commit: string | TCommit,
    ): Promise<{ previous: string | Buffer; current: string | Buffer }> {
        if (typeof commit === 'string') commit = await this.getCommit({ name: commit })

        // If commit was accepted, return blob state at commit
        if (item.index === -1) {
            return await this.getCommitBlob(item.treepath, commit.branch, commit)
        }

        // Get blob state at parent commit, get diffs and apply
        const parent = await this.getCommit({ address: commit.parents[0] })

        let previous: string | Buffer
        let current: string | Buffer
        try {
            const state = await this.getCommitBlob(
                item.treepath,
                commit.branch,
                parent.name,
            )
            previous = current = state.current
        } catch {
            previous = current = ''
        }

        const diff = await this._getDiff(commit.name, item.index, 0)
        const subdiffs = await this._getDiffs(diff)
        for (const subdiff of subdiffs) {
            current = await this._applyBlobDiffPatch(current, subdiff)
        }
        return { previous, current }
    }

    async getPullRequestBlobs(
        commit: string | TCommit,
    ): Promise<{ treepath: string; index: number }[]> {
        if (typeof commit === 'string') commit = await this.getCommit({ name: commit })

        // Get IGoshDiff instance list for commit
        const diffs: IGoshDiff[] = []
        let index1 = 0
        while (true) {
            const diff = await this._getDiff(commit.name, index1, 0)
            if (!(await diff.isDeployed())) break

            diffs.push(diff)
            index1++
        }

        // Get blobs list from commit (if commit was accepted)
        if (!diffs.length) {
            const blobs = await this.getCommitBlobs(commit.branch, commit)
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
        const code = await this.repo.runLocal('getTagCode', {}, undefined, {
            useCachedBoc: true,
        })
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
        const object = await this.getCommit({ name: commit })
        if (object.name === ZERO_COMMIT) {
            return {
                commit: {
                    ...object,
                    tree: ZERO_COMMIT,
                    parents: [object.address],
                },
                tree: {},
                blobs: [],
            }
        }

        // Get non-zero commit data
        const { tree, items } = await this.getTree(object)
        const blobs = await this._getTreeBlobs(items, object.branch, commit)
        return {
            commit: { ...object, parents: [object.address] },
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

        const { value0: address } = await this.auth.wallet0.runLocal(
            'getContentAddress',
            {
                repoName: repository,
                commit,
                label,
            },
            undefined,
            { useCachedBoc: true },
        )

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
        const { items } = await this.getTree(fromBranch.commit)
        const blobs = await this._getTreeBlobs(
            items,
            fromBranch.name,
            fromBranch.commit.name,
        )
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
        await this.auth.wallet0.run('deployBranch', {
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
        const snapCode = await this.repo.runLocal(
            'getSnapCode',
            { branch: name },
            undefined,
            { useCachedBoc: true },
        )
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
        await this.auth.wallet0.run('deleteBranch', {
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

        const smvClientsCount = await this._validateProposalStart()
        await this.auth.wallet0.run('startProposalForAddProtectedBranch', {
            repoName: await this.getName(),
            branchName: name,
            num_clients: smvClientsCount,
        })
    }

    async unlockBranch(name: string): Promise<void> {
        if (!this.auth) throw new GoshError(EGoshError.PROFILE_UNDEFINED)
        if (!(await this._isBranchProtected(name))) {
            throw new GoshError('Branch is not protected')
        }

        const smvClientsCount = await this._validateProposalStart()
        await this.auth.wallet0.run('startProposalForDeleteProtectedBranch', {
            repoName: await this.getName(),
            branchName: name,
            num_clients: smvClientsCount,
        })
    }

    async setHead(branch: string): Promise<void> {
        if (!this.auth) throw new GoshError(EGoshError.PROFILE_UNDEFINED)

        await this.auth.wallet0.run('setHEAD', {
            repoName: await this.repo.getName(),
            branchName: branch,
        })
    }

    async push(
        branch: string,
        blobs: {
            treepath: string[]
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
        const { items } = await this.getTree(branchTo.commit)

        // Validation
        if (!isPullRequest && branchTo.isProtected) {
            throw new GoshError(EGoshError.PR_BRANCH)
        }
        if (isPullRequest) await this._validateProposalStart()

        // Generate blobs push data array
        const blobsData = (
            await executeByChunk(blobs, MAX_PARALLEL_READ, async (blob) => {
                return await this._getBlobPushData(items, branch, blob)
            })
        ).flat()

        // Get updated tree
        const updatedTree = await this._getTreePushData(items, blobsData)
        cb({
            treesBuild: true,
            treesDeploy: { count: 0, total: updatedTree.updated.length },
            snapsDeploy: { count: 0, total: blobsData.length },
            diffsDeploy: { count: 0, total: blobsData.length },
            tagsDeploy: { count: 0, total: taglist.length },
        })

        // Generate commit data
        const { commitHash, commitContent, commitParentAddrs } =
            await this._generateCommit(branchTo, updatedTree.hash, message, branchParent)

        // Deploy snapshots
        let snapCounter = 0
        await this._runMultiwallet(blobsData, async (wallet, { data }) => {
            await this._deploySnapshot(branch, '', data.treepath, undefined, wallet)
            cb({ snapsDeploy: { count: ++snapCounter } })
        })

        // Deploy trees
        let treeCounter = 0
        await this._runMultiwallet(updatedTree.updated, async (wallet, path) => {
            await this._deployTree(updatedTree.tree[path], wallet)
            cb({ treesDeploy: { count: ++treeCounter } })
        })

        // Deploy diffs
        let diffCounter = 0
        await this._runMultiwallet(blobsData, async (wallet, { data }, index) => {
            await this._deployDiff(branch, commitHash, data, index, wallet)
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
            updatedTree.hash,
            false,
        )
        cb({ commitDeploy: true })

        // Set commit or start PR proposal
        if (!isPullRequest) {
            await this._setCommit(branch, commitHash, blobsData.length)
            const wait = await whileFinite(async () => {
                const check = await this.getBranch(branch)
                return check.commit.address !== branchTo.commit.address
            })
            if (!wait) throw new GoshError('Push timeout reached')
        } else {
            await this._startProposalForSetCommit(branch, commitHash, blobsData.length)
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

        await this.auth.wallet0.run('deployContent', {
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

    private async _getBlobPushData(
        tree: TTreeItem[],
        branch: string,
        blob: {
            treepath: string[]
            original: string | Buffer
            modified: string | Buffer
        },
    ): Promise<TPushBlobData[]> {
        const _getData = async (
            path: string,
            content: { original: string | Buffer; modified: string | Buffer },
            treeitem?: TTreeItem,
        ) => {
            const { original, modified } = content
            const flagsOriginal = treeitem?.flags || 0
            const isOriginalIpfs = (flagsOriginal & EBlobFlag.IPFS) === EBlobFlag.IPFS

            const compressed = await zstd.compress(modified)
            let patch = null
            let flagsModified = EBlobFlag.COMPRESSED
            let isGoingOnchain = false
            if (
                Buffer.isBuffer(original) ||
                Buffer.isBuffer(modified) ||
                Buffer.from(modified).byteLength > MAX_ONCHAIN_SIZE
            ) {
                flagsModified |= EBlobFlag.IPFS
                if (Buffer.isBuffer(modified)) flagsModified |= EBlobFlag.BINARY
            } else {
                patch = this._generateBlobDiffPatch(path, modified, original)
                if (isOriginalIpfs) {
                    patch = Buffer.from(compressed, 'base64').toString('hex')
                    isGoingOnchain = true
                } else if (Buffer.from(patch).byteLength > MAX_ONCHAIN_SIZE) {
                    flagsModified |= EBlobFlag.IPFS
                    patch = null
                } else {
                    patch = await zstd.compress(patch)
                    patch = Buffer.from(patch, 'base64').toString('hex')
                }
            }

            const isGoingIpfs = (flagsModified & EBlobFlag.IPFS) === EBlobFlag.IPFS
            const hashes: { sha1: string; sha256: string } = {
                sha1: sha1(modified, treeitem?.type || 'blob', 'sha1'),
                sha256: isGoingIpfs
                    ? sha256(modified, true)
                    : await this.gosh.getTvmHash(modified),
            }

            if (isGoingIpfs && !isOriginalIpfs) {
                patch = await zstd.compress(original)
                patch = Buffer.from(patch, 'base64').toString('hex')
            }

            return {
                snapshot: await this._getSnapshotAddress(branch, path),
                treepath: path,
                treeitem,
                compressed,
                patch,
                flags: flagsModified,
                hashes,
                isGoingIpfs,
                isGoingOnchain,
            }
        }

        /** Method body */
        const { treepath, original, modified } = blob

        const [aPath, bPath] = treepath
        const aItem = tree.find((item) => {
            return getTreeItemFullPath(item) === aPath
        })
        const bItem = tree.find((item) => {
            return getTreeItemFullPath(item) === bPath
        })

        // Add new line token to modified content
        let modifiedFix = modified
        if (!Buffer.isBuffer(modifiedFix)) {
            const lines = modifiedFix.split('\n')
            const endLine = lines.slice(-1)[0]
            if (lines.length === 1 || endLine !== '') {
                modifiedFix = `${modifiedFix}\n`
            }
        }
        const content = { original, modified: modifiedFix }

        // Test cases (add, delete, update, rename)
        if (!aPath && !bPath) throw new GoshError('Blob has no tree path')
        if (!aPath && bPath) {
            if (bItem) throw new GoshError(EGoshError.FILE_EXISTS, { path: bPath })

            const data = await _getData(bPath, { ...content, original: '' }, bItem)
            return [{ data, status: 0 }]
        }
        if (aPath && !bPath) {
            if (!aItem) throw new GoshError(EGoshError.FILE_NOT_EXIST, { path: aPath })

            const data = await _getData(aPath, { ...content, modified: '' }, aItem)
            return [{ data, status: 2 }]
        }
        if (aPath === bPath) {
            if (!aItem) throw new GoshError(EGoshError.FILE_NOT_EXIST, { path: aPath })
            if (content.original === content.modified) {
                throw new GoshError(EGoshError.FILE_UNMODIFIED)
            }

            const data = await _getData(aPath, content, aItem)
            return [{ data, status: 1 }]
        }

        if (bItem) throw new GoshError(EGoshError.FILE_EXISTS, { path: bPath })
        return await Promise.all(
            treepath.map(async (path) => {
                const _content = {
                    original: path === bPath ? '' : content.original,
                    modified: path === aPath ? '' : content.modified,
                }
                const item = path === aPath ? aItem : bItem
                const data = await _getData(path, _content, item)
                return {
                    data,
                    status: path === aPath ? 2 : 0,
                }
            }),
        )
    }

    private async _getTreePushData(
        treeitems: TTreeItem[],
        blobsData: TPushBlobData[],
    ): Promise<{ tree: TTree; updated: string[]; hash: string }> {
        const items = [...treeitems]

        // Add/update/delete tree items according to changed blobs data
        const updatedTrees: string[] = []
        blobsData.forEach(({ data, status }) => {
            const { hashes, flags, treepath, treeitem } = data
            this._getTreeItemsFromPath(treepath, hashes, flags, treeitem).forEach(
                (item) => {
                    const path0 = getTreeItemFullPath(item)
                    const pathindex = updatedTrees.findIndex((p) => p === item.path)
                    if (pathindex < 0) updatedTrees.push(item.path)

                    const itemIndex = items.findIndex((itm) => {
                        const path1 = getTreeItemFullPath(itm)
                        return path0 === path1
                    })
                    if (itemIndex >= 0) {
                        if (path0 === treepath && status === 2) items.splice(itemIndex, 1)
                        else items[itemIndex] = item
                    } else items.push(item)
                },
            )
        })

        // Build tree from updated items and clean
        const cleanedTree = this._getTreeFromItems(items)
        const keys = Object.keys(cleanedTree).sort(
            (a, b) => b.split('/').length - a.split('/').length,
        )
        for (const key of keys) {
            if (key === '' || cleanedTree[key].length) continue

            const [parent, current] = splitByPath(key)
            const index0 = cleanedTree[parent].findIndex((item) => {
                return item.type === 'tree' && item.name === current
            })
            if (index0 >= 0) cleanedTree[parent].splice(index0, 1)

            const index1 = updatedTrees.findIndex((item) => item === key)
            if (index1 >= 0) updatedTrees.splice(index1, 1)

            delete cleanedTree[key]
        }

        // Update tree items' hashes and calculate root tree hash
        const updatedTree = this._updateSubtreesHash(cleanedTree)
        const updatedTreeHash = sha1Tree(updatedTree[''], 'sha1')

        return { tree: updatedTree, updated: updatedTrees, hash: updatedTreeHash }
    }

    private async _getCommitBlob(
        commit: TCommit,
        treepath: string,
        content: string | Buffer,
        messages: any[],
    ): Promise<string | Buffer> {
        // Get commit tree items filtered by blob tree path,
        // find resulting blob sha1 after commit was applied
        const tree = (await this.getTree(commit, treepath)).items
        const found = tree.find((item) => getTreeItemFullPath(item) === treepath)
        const sha1 = found?.sha1 || ZERO_BLOB_SHA1

        let restored = content
        let stop = false
        for (const [i, diff] of messages.entries()) {
            const prev = i > 0 && messages[i - 1]

            if (stop) break
            if (!diff.commit && !diff.patch && !diff.ipfs) {
                restored = ''
                break
            }
            if (diff.ipfs && diff.sha1 !== sha1) continue
            if (diff.removeIpfs) {
                const compressed = Buffer.from(diff.patch, 'hex').toString('base64')
                restored = await zstd.decompress(compressed, true)
            }
            if (prev?.ipfs && !diff.ipfs && diff.patch) {
                const compressed = Buffer.from(prev.patch, 'hex').toString('base64')
                restored = await zstd.decompress(compressed, true)
            }
            if (diff.sha1 === sha1) {
                if (!diff.ipfs && diff.patch) break
                stop = true
            }

            restored = await this._applyBlobDiffPatch(restored, diff, true)
        }
        return restored
    }

    private async _getCommit(options: {
        name?: string
        address?: TAddress
    }): Promise<IGoshCommit> {
        const { name, address } = options

        if (address) return new GoshCommit(this.client, address)

        if (!name) throw new GoshError('Commit name is undefined')
        const { value0 } = await this.repo.runLocal(
            'getCommitAddr',
            { nameCommit: name },
            undefined,
            { useCachedBoc: true },
        )
        return new GoshCommit(this.client, value0)
    }

    private async _getTree(options: {
        name?: string
        address?: TAddress
    }): Promise<IGoshTree> {
        const { address, name } = options
        if (address) return new GoshTree(this.client, address)

        if (!name) throw new GoshError('Tree name is undefined')
        const { value0 } = await this.repo.runLocal(
            'getTreeAddr',
            { treeName: name },
            undefined,
            { useCachedBoc: true },
        )
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
        commit?: string,
    ): Promise<{ treepath: string; content: string | Buffer }[]> {
        const filtered = items.filter(
            (item) => ['blob', 'blobExecutable'].indexOf(item.type) >= 0,
        )
        return await executeByChunk(filtered, MAX_PARALLEL_READ, async (item) => {
            const treepath = getTreeItemFullPath(item)
            const fullpath = `${branch}/${treepath}`
            const { content } = await this.getBlob({ commit, fullpath })
            return { treepath, content }
        })
    }

    private async _getDiff(
        commit: string,
        index1: number,
        index2: number,
    ): Promise<IGoshDiff> {
        const { value0 } = await this.repo.runLocal(
            'getDiffAddr',
            {
                commitName: commit,
                index1,
                index2,
            },
            undefined,
            { useCachedBoc: true },
        )
        return new GoshDiff(this.client, value0)
    }

    private async _getDiffs(diff: IGoshDiff): Promise<TDiff[]> {
        const { value0 } = await diff.runLocal('getdiffs', {})
        return value0
    }

    private async _getTag(address: TAddress): Promise<TTag> {
        const tag = new GoshTag(this.client, address)
        const commit = await tag.runLocal('getCommit', {}, undefined, {
            useCachedBoc: true,
        })
        const content = await tag.runLocal('getContent', {}, undefined, {
            useCachedBoc: true,
        })
        return {
            commit: commit.value0,
            content: content.value0,
        }
    }

    private async _getSnapshotAddress(
        branch: string,
        treepath: string,
    ): Promise<TAddress> {
        const { value0 } = await this.repo.runLocal(
            'getSnapshotAddr',
            {
                branch,
                name: treepath,
            },
            undefined,
            { useCachedBoc: true },
        )
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

        wallet = wallet || this.auth.wallet0
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
        if (this.auth.wallet0.account.signer.type !== 'Keys') {
            throw new GoshError(EGoshError.PROFILE_UNDEFINED)
        }

        const { value0 } = await this.auth.wallet0.runLocal(
            'getWalletAddr',
            { index },
            undefined,
            { useCachedBoc: true },
        )
        const subwallet = new GoshWallet(this.client, value0, {
            keys: this.auth.wallet0.account.signer.keys,
        })

        if (!(await subwallet.isDeployed())) {
            throw new GoshError(`Wallet with index "${index}" is not deployed`)
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

        wallet = wallet || this.auth.wallet0
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
        data: {
            snapshot: TAddress
            treepath: string
            treeItem?: TTreeItem
            compressed: string
            patch: string | null
            flags: number
            hashes: { sha1: string; sha256: string }
            isGoingOnchain: boolean
            isGoingIpfs: boolean
        },
        index1: number,
        wallet?: IGoshWallet,
    ): Promise<void> {
        if (!this.auth) throw new GoshError(EGoshError.PROFILE_UNDEFINED)

        // Check if deployed
        const diffContract = await this._getDiff(commit, index1, 0)
        if (await diffContract.isDeployed()) return

        // Deploy diff
        const { isGoingOnchain, isGoingIpfs, compressed, snapshot, patch, hashes } = data
        const ipfs = isGoingIpfs ? await goshipfs.write(compressed) : null
        const diff = {
            snap: snapshot,
            commit,
            patch,
            ipfs,
            ...hashes,
            removeIpfs: isGoingOnchain,
        }

        wallet = wallet || this.auth.wallet0
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
        wallet = wallet || this.auth.wallet0
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
        await this.auth.wallet0.run('deployCommit', {
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

        await this.auth.wallet0.run('setCommit', {
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

        const smvClientsCount = await this._validateProposalStart()
        await this.auth.wallet0.run('startProposalForSetCommit', {
            repoName: await this.getName(),
            branchName: branch,
            commit,
            numberChangedFiles: numBlobs,
            numberCommits: 1,
            num_clients: smvClientsCount,
        })
    }

    private async _runMultiwallet<Input, Output>(
        array: Input[],
        executor: (wallet: IGoshWallet, params: Input, index: number) => Promise<Output>,
    ): Promise<Output[]> {
        if (!this.auth) throw new GoshError(EGoshError.PROFILE_UNDEFINED)
        if (!this.config) throw new GoshError('Repository config is undefined')

        // Get/deploy wallets
        if (this.subwallets.length !== this.config.maxWalletsWrite) {
            this.subwallets = await Promise.all(
                Array.from(new Array(this.config.maxWalletsWrite)).map(
                    async (_, index) => {
                        if (index === 0) return this.auth!.wallet0
                        return await this._getSubwallet(index)
                    },
                ),
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
        treeitem?: TTreeItem,
    ): TTreeItem[] {
        const items: TTreeItem[] = []

        let [path, name] = splitByPath(fullpath)
        items.push({
            flags,
            mode: treeitem?.mode || '100644',
            type: treeitem?.type || 'blob',
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
        // Get lib patch
        let patch = Diff.createPatch(treepath, original, modified)
        // Format to GOSH patch
        patch = patch.split('\n').slice(4).join('\n')
        // If remove all file content
        if (!modified) {
            patch = patch.replace('\n\\ No newline at end of file', '')
        }
        return patch
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

    /**
     * TODO
     * This method is duplicating from GoshSmvAdapter
     * Change class architecture and remove this...
     * */
    private async _validateProposalStart(): Promise<number> {
        if (!this.auth) throw new GoshError(EGoshError.PROFILE_UNDEFINED)

        const address = await this.auth.wallet0.runLocal('tip3VotingLocker', {})
        const locker = new GoshSmvLocker(this.client, address.tip3VotingLocker)

        const { lockerBusy } = await locker.runLocal('lockerBusy', {})
        if (lockerBusy) throw new GoshError(EGoshError.SMV_LOCKER_BUSY)

        const { m_tokenBalance } = await locker.runLocal('m_tokenBalance', {})
        if (+m_tokenBalance < 20) {
            throw new GoshError(EGoshError.SMV_NO_BALANCE, { min: 20 })
        }

        const { m_num_clients } = await locker.runLocal('m_num_clients', {})
        return +m_num_clients
    }
}

class GoshSmvAdapter implements IGoshSmvAdapter {
    private dao: IGoshDao
    private client: TonClient
    private wallet?: IGoshWallet
    private locker?: IGoshSmvLocker

    constructor(gosh: IGoshAdapter, dao: IGoshDao, wallet?: IGoshWallet) {
        this.client = gosh.client
        this.dao = dao
        this.wallet = wallet
    }

    async getTotalSupply(): Promise<number> {
        const { _rootTokenRoot } = await this.dao.runLocal('_rootTokenRoot', {})
        const tokenRoot = new GoshSmvTokenRoot(this.client, _rootTokenRoot)

        const { totalSupply_ } = await tokenRoot.runLocal('totalSupply_', {})
        return +totalSupply_
    }

    async getDetails(): Promise<TSmvDetails> {
        if (!this.wallet) throw new GoshError(EGoshError.PROFILE_UNDEFINED)

        const { m_pseudoDAOBalance } = await this.wallet.runLocal(
            'm_pseudoDAOBalance',
            {},
        )
        const smvBalance = await this._getLockerBalance()

        return {
            balance: +m_pseudoDAOBalance,
            smvAvailable: smvBalance.total,
            smvLocked: smvBalance.locked,
            isLockerBusy: await this._isLockerBusy(),
        }
    }

    async getClientsCount(): Promise<number> {
        const locker = await this._getLocker()
        const { m_num_clients } = await locker.runLocal('m_num_clients', {})
        return +m_num_clients
    }

    async getEventCodeHash(): Promise<string> {
        const { value0 } = await this.dao.runLocal('getProposalCode', {}, undefined, {
            useCachedBoc: true,
        })
        const { hash } = await this.client.boc.get_boc_hash({ boc: value0 })
        return hash
    }

    async getEvent(
        address: string,
        isDetailed?: boolean,
    ): Promise<TSmvEventMinimal | TSmvEvent> {
        const event = await this._getEvent(address)

        // Event type
        const { proposalKind } = await event.runLocal('getGoshProposalKind', {})
        const type = { kind: +proposalKind, name: SmvEventTypes[+proposalKind] }

        // Event status
        const { value0: isCompleted } = await event.runLocal('_isCompleted', {})
        const status = {
            completed: isCompleted !== null,
            accepted: !!isCompleted,
        }

        const minimal = { address, type, status }
        if (!isDetailed) return minimal

        // Event period
        const { startTime } = await event.runLocal('startTime', {})
        const { finishTime } = await event.runLocal('finishTime', {})
        const { realFinishTime } = await event.runLocal('realFinishTime', {})
        const time = {
            start: +startTime * 1000,
            finish: +finishTime * 1000,
            finishReal: +realFinishTime * 1000,
        }

        // Event data
        const data = await this._getEventData(event, type.kind)

        // Event votes
        const { votesYes } = await event.runLocal('votesYes', {})
        const { votesNo } = await event.runLocal('votesNo', {})
        const { totalSupply } = await event.runLocal('totalSupply', {})
        const votes = {
            yes: +votesYes,
            no: +votesNo,
            yours: await this._getEventUserVotes(event),
            total: +totalSupply,
        }

        return { ...minimal, time, data, votes }
    }

    async getWalletBalance(wallet: IGoshWallet): Promise<number> {
        const { m_pseudoDAOBalance } = await wallet.runLocal('m_pseudoDAOBalance', {})
        return +m_pseudoDAOBalance
    }

    async validateProposalStart(): Promise<void> {
        if (await this._isLockerBusy()) throw new GoshError(EGoshError.SMV_LOCKER_BUSY)

        const { total } = await this._getLockerBalance()
        if (total < 20) throw new GoshError(EGoshError.SMV_NO_BALANCE, { min: 20 })
    }

    async transferToSmv(amount: number): Promise<void> {
        if (!this.wallet) throw new GoshError(EGoshError.PROFILE_UNDEFINED)
        if (await this._isLockerBusy()) throw new GoshError(EGoshError.SMV_LOCKER_BUSY)
        await this.wallet.run('lockVoting', { amount })
    }

    async transferToWallet(amount: number): Promise<void> {
        if (!this.wallet) throw new GoshError(EGoshError.PROFILE_UNDEFINED)
        if (await this._isLockerBusy()) throw new GoshError(EGoshError.SMV_LOCKER_BUSY)
        await this.wallet.run('unlockVoting', { amount })
    }

    async releaseAll(): Promise<void> {
        if (!this.wallet) throw new GoshError(EGoshError.PROFILE_UNDEFINED)
        if (await this._isLockerBusy()) throw new GoshError(EGoshError.SMV_LOCKER_BUSY)
        await this.wallet.run('updateHead', {})
    }

    async vote(event: TAddress, choice: boolean, amount: number): Promise<void> {
        if (!this.wallet) throw new GoshError(EGoshError.PROFILE_UNDEFINED)
        if (await this._isLockerBusy()) throw new GoshError(EGoshError.SMV_LOCKER_BUSY)

        const instance = await this._getEvent(event)
        const { platform_id } = await instance.runLocal('platform_id', {})
        await this.wallet.run('voteFor', {
            platform_id,
            choice,
            amount,
            num_clients: await this.getClientsCount(),
        })
    }

    private async _isLockerBusy(): Promise<boolean> {
        const locker = await this._getLocker()
        const { lockerBusy } = await locker.runLocal('lockerBusy', {})
        return lockerBusy
    }

    private async _getLockerAddress(): Promise<TAddress> {
        if (!this.wallet) throw new GoshError(EGoshError.PROFILE_UNDEFINED)
        const { tip3VotingLocker } = await this.wallet.runLocal('tip3VotingLocker', {})
        return tip3VotingLocker
    }

    private async _getLocker(): Promise<IGoshSmvLocker> {
        const address = await this._getLockerAddress()
        if (!this.locker) this.locker = new GoshSmvLocker(this.client, address)
        return this.locker
    }

    private async _getLockerBalance(): Promise<{ total: number; locked: number }> {
        const locker = await this._getLocker()
        const { m_tokenBalance } = await locker.runLocal('m_tokenBalance', {})
        const { votes_locked } = await locker.runLocal('votes_locked', {})
        return { total: +m_tokenBalance, locked: +votes_locked }
    }

    private async _getEvent(address: TAddress): Promise<IGoshSmvProposal> {
        return new GoshSmvProposal(this.client, address)
    }

    private async _getEventData(event: IGoshSmvProposal, type: number): Promise<any> {
        let fn: string = ''
        if (type === ESmvEventType.DAO_UPGRADE) {
            fn = 'getGoshUpgradeDaoProposalParams'
        } else if (type === ESmvEventType.DAO_MEMBER_ADD) {
            fn = 'getGoshDeployWalletDaoProposalParams'
        } else if (type === ESmvEventType.DAO_MEMBER_DELETE) {
            fn = 'getGoshDeleteWalletDaoProposalParams'
        } else if (type === ESmvEventType.BRANCH_LOCK) {
            fn = 'getGoshAddProtectedBranchProposalParams'
        } else if (type === ESmvEventType.BRANCH_UNLOCK) {
            fn = 'getGoshDeleteProtectedBranchProposalParams'
        } else if (type === ESmvEventType.PR) {
            fn = 'getGoshSetCommitProposalParams'
        } else if (type === ESmvEventType.DAO_CONFIG_CHANGE) {
            fn = 'getGoshSetConfigDaoProposalParams'
        } else {
            throw new GoshError(`Event type "${type}" is unknown`)
        }

        const decoded = await event.runLocal(fn, {}, undefined, { useCachedBoc: true })
        delete decoded.proposalKind
        return decoded
    }

    private async _getEventUserVotes(event: IGoshSmvProposal): Promise<number> {
        if (!this.wallet) return 0
        if (!(await this.wallet.isDeployed())) return 0

        const { platform_id } = await event.runLocal('platform_id', {})
        const { value0 } = await this.wallet.runLocal('clientAddressForProposal', {
            _tip3VotingLocker: await this._getLockerAddress(),
            _platform_id: platform_id,
        })
        const client = new GoshSmvClient(this.client, value0)
        if (!(await client.isDeployed())) return 0

        const { value0: locked } = await client.runLocal('amount_locked', {})
        return +locked
    }
}

export { GoshAdapter_1_0_0 }
