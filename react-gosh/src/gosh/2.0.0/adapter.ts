import { KeyPair, ResultOfProcessMessage, TonClient } from '@eversdk/core'
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
    TCommitTag,
    TTree,
    TTreeItem,
    TUpgradeData,
    TSmvEvent,
    TSmvEventMinimal,
    TPushBlobData,
    TTaskCommitConfig,
    TDaoMember,
    TTaskDetails,
    TRepositoryCreateParams,
    TRepositoryCreateResult,
    TEventMultipleCreateProposalParams,
    TSmvEventVotes,
    TSmvEventStatus,
    TSmvEventTime,
    TRepositoryUpdateDescriptionParams,
    TRepositoryChangeBranchProtectionParams,
    TDaoMemberCreateParams,
    TDaoMemberDeleteParams,
    TDaoUpgradeParams,
    TTaskDeleteParams,
    TTaskCreateParams,
    TDaoVotingTokenAddParams,
    TDaoRegularTokenAddParams,
    TDaoMintTokenParams,
    TDaoTagCreateParams,
    TDaoTagDeleteParams,
    TDaoMintDisableParams,
    TDaoMemberAllowanceUpdateParams,
    TRepositoryTagCreateParams,
    TRepositoryTagDeleteParams,
    TDaoEventAllowDiscussionParams,
    TDaoEventShowProgressParams,
    TTaskReceiveBountyParams,
    TDaoEventSendReviewParams,
    TDaoAskMembershipAllowanceParams,
    TTopic,
    TTopicCreateParams,
    TTopicMessageCreateParams,
    TRepositoryChangeBranchProtectionResult,
    TDaoMemberCreateResult,
    TDaoMemberDeleteResult,
    TDaoUpgradeResult,
    TTaskCreateResult,
    TTaskDeleteResult,
    TDaoVotingTokenAddResult,
    TDaoRegularTokenAddResult,
    TDaoMintTokenResult,
    TDaoMintDisableResult,
    TDaoTagCreateResult,
    TDaoTagDeleteResult,
    TDaoMemberAllowanceUpdateResult,
    TRepositoryTagCreateResult,
    TRepositoryTagDeleteResult,
    TRepositoryUpdateDescriptionResult,
    TDaoEventAllowDiscussionResult,
    TDaoEventShowProgressResult,
    TDaoAskMembershipAllowanceResult,
    TRepositoryCreateCommitTagParams,
    TIsMemberParams,
    TIsMemberResult,
    TEventMultipleCreateProposalAsDaoParams,
    TDaoTokenDaoSendParams,
    TUserParam,
    TTaskTransferParams,
    TTaskTransferResult,
    TTaskUpgradeCompleteParams,
    TTaskUpgradeCompleteResult,
    TDaoVoteParams,
    TDaoVoteResult,
    TDaoReviewParams,
    TDaoReviewResult,
    TTaskReceiveBountyDaoParams,
    TTaskReceiveBountyDaoResult,
    TDaoTokenDaoLockParams,
    TDaoTokenDaoLockResult,
    TTaskUpgradeParams,
    TTaskUpgradeResult,
    TDaoTokenDaoTransferParams,
    TDaoTokenDaoTransferResult,
    TUpgradeVersionControllerParams,
    TDaoStartPaidMembershipParams,
    TDaoStartPaidMembershipResult,
    TDaoStopPaidMembershipParams,
    TDaoStopPaidMembershipResult,
    TCodeCommentThreadCreateParams,
    TCodeCommentThreadGetCodeParams,
    TCodeCommentThreadGetCodeResult,
    TCodeCommentThreadGetParams,
    TCodeCommentThreadGetResult,
    TCodeCommentCreateParams,
    TCodeCommentThreadCreateResult,
    TBigTaskCreateParams,
    TBigTaskCreateResult,
    TSubTaskCreateParams,
    TSubTaskDeleteParams,
    TBigTaskApproveParams,
    TBigTaskApproveResult,
    TBigTaskDeleteParams,
    TBigTaskDeleteResult,
    TBigTaskUpgradeParams,
    TBigTaskUpgradeResult,
    TCodeCommentThreadResdolveParams,
    TEventSignleCreateProposalParams,
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
    IGoshTask,
    IGoshHelperTag,
    IGoshTopic,
    IGoshProfileDao,
    IGoshCommitTag,
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
import { GoshCommitTag } from './goshcommittag'
import * as Diff from 'diff'
import { GoshDiff } from './goshdiff'
import {
    MAX_ONCHAIN_SIZE,
    MAX_PARALLEL_READ,
    MAX_PARALLEL_WRITE,
    SmvEventTypes,
    SYSTEM_TAG,
    ZERO_BLOB_SHA1,
    ZERO_COMMIT,
} from '../../constants'
import { GoshSmvTokenRoot } from './goshsmvtokenroot'
import { GoshContentSignature } from './goshcontentsignature'
import { GoshSmvLocker } from './goshsmvlocker'
import { GoshSmvProposal } from './goshsmvproposal'
import { GoshSmvClient } from './goshsmvclient'
import { GoshTask } from './goshtask'
import { GoshHelperTag } from './goshhelpertag'
import { GoshTopic } from './goshtopic'
import { GoshAdapterFactory } from '../factories'
import { GoshProfileDao } from '../goshprofiledao'

class GoshAdapter_2_0_0 implements IGoshAdapter {
    private static instance: GoshAdapter_2_0_0
    private auth?: { username: string; keys: KeyPair }

    static version: string = '2.0.0'

    client: TonClient
    goshroot: IGoshRoot
    gosh: IGosh

    private constructor(goshroot: IGoshRoot, goshaddr: TAddress) {
        this.goshroot = goshroot
        this.client = goshroot.account.client
        this.gosh = new Gosh(this.client, goshaddr)
    }

    static getInstance(goshroot: IGoshRoot, goshaddr: TAddress): GoshAdapter_2_0_0 {
        if (!GoshAdapter_2_0_0.instance) {
            GoshAdapter_2_0_0.instance = new GoshAdapter_2_0_0(goshroot, goshaddr)
        }
        return GoshAdapter_2_0_0.instance
    }

    isValidUsername(username: string): TValidationResult {
        const field = 'Username'
        if (username.startsWith('_')) {
            return { valid: false, reason: `${field} can not start with "_"` }
        }
        return this._isValidName(username, field)
    }

    isValidDaoName(name: string): TValidationResult {
        const field = 'DAO name'
        if (name.startsWith('_')) {
            return { valid: false, reason: `${field} can not start with "_"` }
        }
        return this._isValidName(name, field)
    }

    isValidRepoName(name: string): TValidationResult {
        return this._isValidName(name, 'Repository name')
    }

    async isValidProfile(
        username: string[],
    ): Promise<{ username: string; address: TAddress }[]> {
        return await executeByChunk(username, MAX_PARALLEL_READ, async (member) => {
            member = member.trim()
            const { valid, reason } = this.isValidUsername(member)
            if (!valid) throw new GoshError(`${member}: ${reason}`)

            const profile = await this.getProfile({ username: member })
            if (!(await profile.isDeployed())) {
                throw new GoshError(`${member}: Profile does not exist`)
            }

            return { username: member, address: profile.address }
        })
    }

    async isValidDao(name: string[]): Promise<{ username: string; address: string }[]> {
        throw new Error('Method is unavailable in current version')
    }

    async isValidUser(user: TUserParam): Promise<{ user: TUserParam; address: string }> {
        throw new Error('Method is unavailable in current version')
    }

    async setAuth(username: string, keys: KeyPair): Promise<void> {
        this.auth = { username, keys }
    }

    async resetAuth(): Promise<void> {
        this.auth = undefined
    }

    getVersion(): string {
        return GoshAdapter_2_0_0.version
    }

    async getProfile(options: {
        username?: string
        address?: TAddress
    }): Promise<IGoshProfile> {
        const { username, address } = options
        if (address) {
            return new GoshProfile(this.client, address)
        }
        if (!username) {
            throw new GoshError(EGoshError.USER_NAME_UNDEFINED)
        }

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
                { name: name.toLowerCase() },
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

    async getDaoProfile(options: {
        name?: string
        address?: string
    }): Promise<IGoshProfileDao> {
        const { name, address } = options
        if (address) {
            return new GoshProfileDao(this.client, address)
        }

        if (!name) {
            throw new GoshError('DAO name is not provided')
        }
        const { value0 } = await this.gosh.runLocal(
            'getProfileDaoAddr',
            {
                name: name.trim().toLowerCase(),
            },
            undefined,
            { useCachedBoc: true },
        )
        return new GoshProfileDao(this.client, value0)
    }

    async getUserByAddress(address: string): Promise<TUserParam> {
        const profile = await this.getProfile({ address })
        return { name: await profile.getName(), type: 'user' }
    }

    async getRepository(options: {
        path?: string | undefined
        address?: TAddress | undefined
    }): Promise<IGoshRepositoryAdapter> {
        const { path, address } = options
        if (address) {
            return new GoshRepositoryAdapter(this, address)
        }

        if (!path) {
            throw new GoshError('Repository path is undefined')
        }
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

    async getTaskTagGoshCodeHash(tag: string): Promise<string> {
        const { value0 } = await this.gosh.runLocal(
            'getTaskTagGoshCode',
            { tag },
            undefined,
            { useCachedBoc: true },
        )
        const { hash } = await this.client.boc.get_boc_hash({ boc: value0 })
        return hash
    }

    async getTaskTagDaoCodeHash(dao: TAddress, tag: string): Promise<string> {
        const { value0 } = await this.gosh.runLocal(
            'getTaskTagDaoCode',
            { dao, tag },
            undefined,
            { useCachedBoc: true },
        )
        const { hash } = await this.client.boc.get_boc_hash({ boc: value0 })
        return hash
    }

    async getTaskTagRepoCodeHash(
        dao: string,
        repository: string,
        tag: string,
    ): Promise<string> {
        const { value0 } = await this.gosh.runLocal(
            'getTaskTagRepoCode',
            { dao, repo: repository, tag },
            undefined,
            { useCachedBoc: true },
        )
        const { hash } = await this.client.boc.get_boc_hash({ boc: value0 })
        return hash
    }

    async getHelperTag(address: string): Promise<IGoshHelperTag> {
        return new GoshHelperTag(this.client, address)
    }

    async getCommitTag(params: {
        address?: string | undefined
        data?: { daoName: string; repoName: string; tagName: string } | undefined
    }): Promise<IGoshCommitTag> {
        throw new Error('Method is unavailable in current version')
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

    async getCommitAddress(params: {
        repo_addr: string
        commit_name: string
    }): Promise<string> {
        throw new Error('Method is unavailable in current version')
    }

    async getSnapshotAddress(params: {
        repo_addr: string
        commit_name: string
        tree_path: string
    }): Promise<string> {
        throw new Error('Method is unavailable in current version')
    }

    async getTreeAddress(params: {
        repo_addr: string
        tree_hash: string
    }): Promise<string> {
        throw new Error('Method is unavailable in current version')
    }

    private _isValidName(name: string, field?: string): TValidationResult {
        field = field || 'Name'

        const matchSymbols = name.match(/^[\w-]+$/g)
        if (!matchSymbols || matchSymbols[0] !== name) {
            return { valid: false, reason: `${field} has incorrect symbols` }
        }

        const matchHyphens = name.match(/-{2,}/g)
        if (matchHyphens && matchHyphens.length > 0) {
            return { valid: false, reason: `${field} can not contain consecutive "-"` }
        }

        const matchUnderscores = name.match(/_{2,}/g)
        if (matchUnderscores && matchUnderscores.length > 0) {
            return { valid: false, reason: `${field} can not contain consecutive "_"` }
        }

        if (name.startsWith('-')) {
            return { valid: false, reason: `${field} can not start with "-"` }
        }

        if (name.toLowerCase() !== name) {
            return { valid: false, reason: `${field} should be lowercase` }
        }

        if (name.length > 39) {
            return { valid: false, reason: `${field} is too long (Max length is 39)` }
        }

        return { valid: true }
    }
}

class GoshDaoAdapter implements IGoshDaoAdapter {
    private client: TonClient
    private gosh: IGoshAdapter
    dao: IGoshDao // TODO: remove public
    private profile?: IGoshProfile
    wallet?: IGoshWallet // TODO: remove public
    private systemRepository?: IGoshRepositoryAdapter | null

    constructor(gosh: IGoshAdapter, address: TAddress) {
        this.client = gosh.client
        this.gosh = gosh
        this.dao = new GoshDao(gosh.client, address)
    }

    async isDeployed(): Promise<boolean> {
        return await this.dao.isDeployed()
    }

    async isRepositoriesUpgraded(): Promise<boolean> {
        const { _isRepoUpgraded } = await this.dao.runLocal('_isRepoUpgraded', {})
        return _isRepoUpgraded
    }

    async isMember(params: TIsMemberParams): TIsMemberResult {
        const { user, profile } = params

        let pubaddr: string
        if (user) {
            const validated = await this.gosh.isValidProfile([user.name])
            pubaddr = validated[0].address
        } else if (profile) {
            pubaddr = profile
        } else {
            throw new GoshError('Either profile address or username should be provided')
        }

        const { value0 } = await this.dao.runLocal('isMember', { pubaddr })
        return value0
    }

    async setAuth(username: string, keys: KeyPair): Promise<void> {
        if (!(await this.isDeployed())) {
            return
        }

        this.profile = await this.gosh.getProfile({ username })
        this.wallet = await this._getWallet(0, keys)
        if (!(await this.wallet.isDeployed())) {
            await this._createLimitedWallet(this.profile.address)
        }

        const { value0: pubkey } = await this.wallet.runLocal('getAccess', {})
        if (!pubkey) {
            await this.profile.turnOn(this.wallet.address, keys.public, keys)
        }
    }

    getGosh(): IGoshAdapter {
        return this.gosh
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
        const details = await this.dao.runLocal('getDetails', {})
        const owner = details.pubaddr

        return {
            address: this.dao.address,
            name: details.nameDao,
            version: this.dao.version,
            members: this._getMembers(details.wallets),
            supply: {
                reserve: parseInt(details.reserve),
                voting: parseInt(details.allbalance),
                total: parseInt(details.totalsupply),
            },
            owner,
            tags: Object.values(details.hashtag),
            isMintOn: details.allowMint,
            isEventProgressOn: !details.hide_voting_results,
            isEventDiscussionOn: details.allow_discussion_on_proposals,
            isAskMembershipOn: details.abilityInvite,
            isAuthenticated: !!this.profile && !!this.wallet,
            isAuthOwner: this.profile && this.profile.address === owner ? true : false,
            isAuthMember: await this._isAuthMember(),
            isAuthLimited: await this._isAuthLimited(),
            isRepoUpgraded: details.isRepoUpgraded,
            isTaskRedeployed: true,
            isMemberOf: [],
            hasRepoIndex: !!(await this._getSystemRepository()),
            isUpgraded: details.isRepoUpgraded,
        }
    }

    async getShortDescription(): Promise<string | null> {
        return await this._getSystemBlob('description.txt')
    }

    async getDescription(): Promise<string | null> {
        return await this._getSystemBlob('readme.md')
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

        if (address) {
            return new GoshRepositoryAdapter(this.gosh, address, auth, config)
        }
        if (!name) {
            throw new GoshError('Repo name undefined')
        }

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

    async getMembers(): Promise<TDaoMember[]> {
        const { value0 } = await this.dao.runLocal('getWalletsFull', {})
        return this._getMembers(value0)
    }

    async getMemberWallet(options: {
        profile?: TAddress
        address?: TAddress
        index?: number
        create?: boolean
    }): Promise<IGoshWallet> {
        const { profile, address, index, create } = options
        if (address) {
            return new GoshWallet(this.client, address)
        }

        if (!profile) {
            throw new GoshError(EGoshError.PROFILE_UNDEFINED)
        }
        const addr = await this._getWalletAddress(profile, index ?? 0)
        const wallet = new GoshWallet(this.client, addr)
        if (create && !(await wallet.isDeployed())) {
            await this._createLimitedWallet(profile)
        }
        return wallet
    }

    async getReviewers(
        user: TUserParam[],
    ): Promise<{ username: string; profile: string; wallet: string }[]> {
        const profiles = await this.gosh.isValidProfile(user.map(({ name }) => name))
        return await executeByChunk(
            profiles,
            MAX_PARALLEL_READ,
            async ({ username, address }) => {
                const wallet = await this.getMemberWallet({
                    profile: address,
                    index: 0,
                    create: true,
                })
                return { username, profile: address, wallet: wallet.address }
            },
        )
    }

    async getTaskCodeHash(repository: string): Promise<string> {
        const { value0 } = await this.dao.runLocal(
            'getTaskCode',
            { repoName: repository },
            undefined,
            {
                useCachedBoc: true,
            },
        )
        const { hash } = await this.client.boc.get_boc_hash({ boc: value0 })
        return hash
    }

    async getTask(options: {
        repository?: string
        name?: string
        address?: TAddress
    }): Promise<TTaskDetails> {
        const task = await this.getTaskAccount(options)
        const details = await task.runLocal('getStatus', {})
        const repository = await this.getRepository({ address: details.repo })

        // Clean tags
        const tagsClean = [...details.hashtag]
        const _systemTagIndex = tagsClean.findIndex((item: string) => item === SYSTEM_TAG)
        if (_systemTagIndex >= 0) {
            tagsClean.splice(_systemTagIndex, 1)
        }

        // Parse candidates
        let team
        if (details.candidates.length) {
            const candidate = details.candidates[0]
            const commit = await repository.getCommit({ address: candidate.commit })
            const assigners = await Promise.all(
                Object.keys(candidate.pubaddrassign).map(async (address) => {
                    const profile = await this.gosh.getProfile({ address })
                    return { username: await profile.getName(), address }
                }),
            )
            const reviewers = await Promise.all(
                Object.keys(candidate.pubaddrreview).map(async (address) => {
                    const profile = await this.gosh.getProfile({ address })
                    return { username: await profile.getName(), address }
                }),
            )
            const managers = await Promise.all(
                Object.keys(candidate.pubaddrmanager).map(async (address) => {
                    const profile = await this.gosh.getProfile({ address })
                    return { username: await profile.getName(), address }
                }),
            )
            team = {
                commit: { branch: commit.branch, name: commit.name },
                assigners,
                reviewers,
                managers,
            }
        }

        return {
            account: task,
            address: task.address,
            name: details.nametask,
            repository: await repository.getName(),
            team,
            config: details.grant,
            confirmed: details.ready,
            confirmedAt: details.locktime,
            tags: tagsClean,
            tagsRaw: details.hashtag,
        }
    }

    async getBigTask(options: {
        name?: string | undefined
        address?: string | undefined
    }): Promise<TTaskDetails> {
        throw new Error('Method is unavailable in current version')
    }

    async getTopicCodeHash(): Promise<string> {
        const { value0 } = await this.gosh.gosh.runLocal(
            'getTopicCode',
            { dao: this.dao.address },
            undefined,
            { useCachedBoc: true },
        )
        const { hash } = await this.client.boc.get_boc_hash({ boc: value0 })
        return hash
    }

    async getTopic(params: { address?: string }): Promise<TTopic> {
        const topic = await this._getTopic(params)
        const { value0, value1, value2 } = await topic.runLocal(
            'getObject',
            {},
            undefined,
            { useCachedBoc: true },
        )
        return {
            account: topic,
            name: value0,
            content: value1,
            object: value2,
        }
    }

    async getCodeCommetThreadCodeHash(
        params: TCodeCommentThreadGetCodeParams,
    ): Promise<TCodeCommentThreadGetCodeResult> {
        throw new Error('Method is unavailable in current version')
    }

    async getCodeCommentThread(
        params: TCodeCommentThreadGetParams,
    ): Promise<TCodeCommentThreadGetResult> {
        throw new Error('Method is unavailable in current version')
    }

    async getSmv(): Promise<IGoshSmvAdapter> {
        return new GoshSmvAdapter(this.gosh, this.dao, this.wallet)
    }

    async getPrevDao() {
        const { value0: prevAddr } = await this.dao.runLocal('getPreviousDaoAddr', {})
        if (!prevAddr) {
            return null
        }

        const prevDao = await this.gosh.getDao({ address: prevAddr, useAuth: false })
        const { value1: prevVer } = await prevDao.dao.runLocal('getVersion', {})

        const prevGosh = GoshAdapterFactory.create(prevVer)
        return await prevGosh.getDao({ address: prevAddr, useAuth: false })
    }

    async createRepository(
        params: TRepositoryCreateParams,
    ): Promise<TRepositoryCreateResult> {
        const {
            name,
            prev,
            comment = '',
            description = '',
            reviewers = [],
            alone,
            cell,
        } = params

        if (!this.wallet) {
            throw new GoshError(EGoshError.WALLET_UNDEFINED)
        }

        const { valid, reason } = this.gosh.isValidRepoName(name)
        if (!valid) {
            throw new GoshError(EGoshError.REPO_NAME_INVALID, reason)
        }

        // Check if repo is already deployed
        const repo = await this.getRepository({ name })
        if (await repo.isDeployed()) {
            return repo
        }

        // Deploy repo
        if (cell) {
            const { value0 } = await this.wallet.runLocal('getCellDeployRepo', {
                nameRepo: name.toLowerCase(),
                descr: description,
                previous: prev || null,
                comment,
            })
            return value0
        } else if (alone) {
            await this.wallet.run('AloneDeployRepository', {
                nameRepo: name.toLowerCase(),
                descr: description,
                previous: prev || null,
            })
            const wait = await whileFinite(async () => await repo.isDeployed())
            if (!wait) throw new GoshError('Deploy repository timeout reached')
        } else {
            const _reviewers = await this.getReviewers(reviewers)
            const smv = await this.getSmv()
            await smv.validateProposalStart()
            await this.wallet.run('startProposalForDeployRepository', {
                nameRepo: name.toLowerCase(),
                descr: description,
                previous: prev || null,
                comment,
                reviewers: _reviewers.map(({ wallet }) => wallet),
                num_clients: await smv.getClientsCount(),
            })
        }

        return repo
    }

    async createMember(params: TDaoMemberCreateParams): Promise<TDaoMemberCreateResult> {
        const { members = [], reviewers = [], cell } = params

        if (!members.length) {
            return
        }
        if (!this.wallet) {
            throw new GoshError(EGoshError.PROFILE_UNDEFINED)
        }

        // Get members' profiles
        const usernames = members.map(({ user }) => user.name)
        const profiles = await this.gosh.isValidProfile(usernames)

        // Prepare proposal comment
        const note = []
        for (const { user, comment } of members) {
            if (comment) {
                note.push(`${user.name}\n${comment}`)
            }
        }

        // Prepare proposal arguments
        const pubaddr = profiles.map(({ username, address }) => {
            const found = members.find((item) => item.user.name === username)
            if (!found) {
                throw new GoshError(`Member '${username}' not found in arguments`)
            }
            return { member: address, count: found.allowance }
        })

        if (cell) {
            const { value0 } = await this.wallet.runLocal('getCellDeployWalletDao', {
                pubaddr,
                comment: note.length ? note.join('\n\n') : '',
            })
            return value0
        } else {
            const _reviewers = await this.getReviewers(reviewers)
            const smv = await this.getSmv()
            await smv.validateProposalStart(0)
            await this.wallet.run('startProposalForDeployWalletDao', {
                pubaddr,
                comment: note.length ? note.join('\n\n') : '',
                reviewers: _reviewers.map(({ wallet }) => wallet),
                num_clients: await smv.getClientsCount(),
            })
        }
    }

    async deleteMember(params: TDaoMemberDeleteParams): Promise<TDaoMemberDeleteResult> {
        const { user, comment = '', reviewers = [], cell } = params

        if (!this.wallet) {
            throw new GoshError(EGoshError.PROFILE_UNDEFINED)
        }

        const profiles = await executeByChunk(user, MAX_PARALLEL_READ, async (item) => {
            const profile = await this.gosh.getProfile({ username: item.name })
            return profile.address
        })

        if (cell) {
            const { value0 } = await this.wallet.runLocal('getCellDeleteWalletDao', {
                pubaddr: profiles,
                comment,
            })
            return value0
        } else {
            const _reviewers = await this.getReviewers(reviewers)
            const smv = await this.getSmv()
            await smv.validateProposalStart()
            await this.wallet.run('startProposalForDeleteWalletDao', {
                pubaddr: profiles,
                comment,
                reviewers: _reviewers.map(({ wallet }) => wallet),
                num_clients: await smv.getClientsCount(),
            })
        }
    }

    async updateMemberAllowance(
        params: TDaoMemberAllowanceUpdateParams,
    ): Promise<TDaoMemberAllowanceUpdateResult> {
        const { members, comment = '', reviewers = [], cell } = params

        if (!this.wallet) {
            throw new GoshError(EGoshError.PROFILE_UNDEFINED)
        }

        const profiles: TAddress[] = []
        const increase: boolean[] = []
        const amount: number[] = []
        for (const item of members) {
            if (!amount) {
                continue
            }
            profiles.push(item.profile)
            increase.push(item.increase)
            amount.push(item.amount)
        }

        if (cell) {
            const { value0 } = await this.wallet.runLocal('getCellChangeAllowance', {
                pubaddr: profiles,
                increase,
                grant: amount,
                comment,
            })
            return value0
        } else {
            const _reviewers = await this.getReviewers(reviewers)
            const smv = await this.getSmv()
            await smv.validateProposalStart()
            await this.wallet.run('startProposalForChangeAllowance', {
                pubaddr: profiles,
                increase,
                grant: amount,
                comment,
                reviewers: _reviewers.map(({ wallet }) => wallet),
                num_clients: await smv.getClientsCount(),
            })
        }
    }

    async updateAskMembershipAllowance(
        params: TDaoAskMembershipAllowanceParams,
    ): Promise<TDaoAskMembershipAllowanceResult> {
        const { decision, comment = '', reviewers = [], cell } = params

        if (!this.wallet) {
            throw new GoshError(EGoshError.PROFILE_UNDEFINED)
        }

        if (cell) {
            const { value0 } = await this.wallet.runLocal('getCellSetAbilityInvite', {
                res: decision,
                comment,
            })
            return value0
        } else {
            const _reviewers = await this.getReviewers(reviewers)
            const smv = await this.getSmv()
            await smv.validateProposalStart()
            await this.wallet.run('startProposalForSetAbilityInvite', {
                res: decision,
                comment,
                reviewers: _reviewers.map(({ wallet }) => wallet),
                num_clients: await smv.getClientsCount(),
            })
        }
    }

    async upgrade(params: TDaoUpgradeParams): Promise<TDaoUpgradeResult> {
        const { version, description, comment = '', reviewers = [], cell } = params

        if (!this.wallet) {
            throw new GoshError(EGoshError.PROFILE_UNDEFINED)
        }

        if (cell) {
            const { value0 } = await this.wallet.runLocal('getCellSetUpgrade', {
                newversion: version,
                description: description ?? `Upgrade DAO to version ${version}`,
                comment,
            })
            return value0
        } else {
            const _reviewers = await this.getReviewers(reviewers)
            const smv = await this.getSmv()
            await smv.validateProposalStart()
            await this.wallet.run('startProposalForUpgradeDao', {
                newversion: version,
                description: description ?? `Upgrade DAO to version ${version}`,
                comment,
                reviewers: _reviewers.map(({ wallet }) => wallet),
                num_clients: await smv.getClientsCount(),
            })
        }
    }

    async setRepositoriesUpgraded(): Promise<void> {
        if (!this.wallet) {
            throw new GoshError(EGoshError.PROFILE_UNDEFINED)
        }
        await this.wallet.run('setRepoUpgraded', { res: true })
    }

    async mint(params: TDaoMintTokenParams): Promise<TDaoMintTokenResult> {
        const { amount, comment = '', reviewers = [], alone, cell } = params

        if (!this.wallet) {
            throw new GoshError(EGoshError.PROFILE_UNDEFINED)
        }
        if (!(await this._isMintOn())) {
            throw new GoshError('Token mint is disabled')
        }

        if (cell) {
            const { value0 } = await this.wallet.runLocal('getCellMintToken', {
                token: amount,
                comment,
            })
            return value0
        } else if (alone) {
            await this.wallet.run('AloneMintDaoReserve', { token: amount })
        } else {
            const _reviewers = await this.getReviewers(reviewers)
            const smv = await this.getSmv()
            await smv.validateProposalStart()
            await this.wallet.run('startProposalForMintDaoReserve', {
                token: amount,
                comment,
                reviewers: _reviewers.map(({ wallet }) => wallet),
                num_clients: await smv.getClientsCount(),
            })
        }
    }

    async disableMint(params: TDaoMintDisableParams): Promise<TDaoMintDisableResult> {
        const { comment = '', reviewers = [], alone, cell } = params

        if (!this.wallet) {
            throw new GoshError(EGoshError.PROFILE_UNDEFINED)
        }

        if (cell) {
            const { value0 } = await this.wallet.runLocal('getCellAllowMint', {
                comment,
            })
            return value0
        } else if (alone) {
            await this.wallet.run('AloneNotAllowMint', {})
        } else {
            const _reviewers = await this.getReviewers(reviewers)
            const smv = await this.getSmv()
            await smv.validateProposalStart()

            await this.wallet.run('startProposalForNotAllowMint', {
                comment,
                reviewers: _reviewers.map(({ wallet }) => wallet),
                num_clients: await smv.getClientsCount(),
            })
        }
    }

    async addVotingTokens(
        params: TDaoVotingTokenAddParams,
    ): Promise<TDaoVotingTokenAddResult> {
        const { user, amount, comment = '', reviewers = [], alone, cell } = params

        if (!this.wallet) {
            throw new GoshError(EGoshError.PROFILE_UNDEFINED)
        }

        // Get profile by username
        const profile = (await this.gosh.isValidProfile([user.name]))[0]

        // TODO: May be better to move this to hook
        // Deploy limited wallet if not a DAO member
        if (!(await this.isMember({ profile: profile.address }))) {
            await this._createLimitedWallet(profile.address)
        }

        if (cell) {
            const { value0 } = await this.wallet.runLocal('getCellAddVoteToken', {
                pubaddr: profile.address,
                token: amount,
                comment,
            })
            return value0
        } else if (alone) {
            await this.wallet.run('AloneAddVoteTokenDao', { grant: amount })
        } else {
            const _reviewers = await this.getReviewers(reviewers)
            const smv = await this.getSmv()
            await smv.validateProposalStart()

            await this.wallet.run('startProposalForAddVoteToken', {
                pubaddr: profile.address,
                token: amount,
                comment,
                reviewers: _reviewers.map(({ wallet }) => wallet),
                num_clients: await smv.getClientsCount(),
            })
        }
    }

    async addRegularTokens(
        params: TDaoRegularTokenAddParams,
    ): Promise<TDaoRegularTokenAddResult> {
        const { user, amount, comment = '', reviewers = [], alone, cell } = params

        if (!this.wallet) {
            throw new GoshError(EGoshError.PROFILE_UNDEFINED)
        }

        // Get profile by username
        const profile = (await this.gosh.isValidProfile([user.name]))[0]

        // TODO: May be better to move this to hook
        // Deploy limited wallet if not a DAO member
        if (!(await this.isMember({ profile: profile.address }))) {
            await this._createLimitedWallet(profile.address)
        }

        if (cell) {
            const { value0 } = await this.wallet.runLocal('getCellAddRegularToken', {
                pubaddr: profile.address,
                token: amount,
                comment,
            })
            return value0
        } else if (alone) {
            await this.wallet.run('AloneAddTokenDao', { grant: amount })
        } else {
            const _reviewers = await this.getReviewers(reviewers)
            const smv = await this.getSmv()
            await smv.validateProposalStart()

            await this.wallet.run('startProposalForAddRegularToken', {
                pubaddr: profile.address,
                token: amount,
                comment,
                reviewers: _reviewers.map(({ wallet }) => wallet),
                num_clients: await smv.getClientsCount(),
            })
        }
    }

    async sendInternal2Internal(user: TUserParam, amount: number): Promise<void> {
        if (!this.wallet) {
            throw new GoshError(EGoshError.WALLET_UNDEFINED)
        }

        const profile = (await this.gosh.isValidProfile([user.name]))[0]
        const wallet = await this.getMemberWallet({ profile: profile.address })
        if (!(await wallet.isDeployed())) {
            await this._createLimitedWallet(profile.address)
        }

        await this._convertVoting2Regular(amount)
        await this.wallet.run('sendToken', { pubaddr: profile.address, grant: amount })
    }

    async send2DaoReserve(amount: number): Promise<void> {
        if (!this.wallet) {
            throw new GoshError(EGoshError.WALLET_UNDEFINED)
        }

        await this._convertVoting2Regular(amount)
        await this.wallet.run('sendTokenToDaoReserve', { grant: amount })
    }

    async sendDaoToken(params: TDaoTokenDaoSendParams): Promise<void> {
        throw new Error('Method is unavailable in current version')
    }

    async voteDao(params: TDaoVoteParams): Promise<TDaoVoteResult> {
        throw new Error('Method is unavailable in current version')
    }

    async reviewDao(params: TDaoReviewParams): Promise<TDaoReviewResult> {
        throw new Error('Method is unavailable in current version')
    }

    async receiveTaskBountyDao(
        params: TTaskReceiveBountyDaoParams,
    ): Promise<TTaskReceiveBountyDaoResult> {
        throw new Error('Method is unavailable in current version')
    }

    async lockDaoToken(params: TDaoTokenDaoLockParams): Promise<TDaoTokenDaoLockResult> {
        throw new Error('Method is unavailable in current version')
    }

    async transferDaoToken(
        params: TDaoTokenDaoTransferParams,
    ): Promise<TDaoTokenDaoTransferResult> {
        throw new Error('Method is unavailable in current version')
    }

    async createTag(params: TDaoTagCreateParams): Promise<TDaoTagCreateResult> {
        const { tags, comment = '', reviewers = [], alone, cell } = params

        if (!this.wallet) {
            throw new GoshError(EGoshError.WALLET_UNDEFINED)
        }

        const clean = tags.map((item) => {
            return item.startsWith('#') ? item.slice(1) : item
        })

        if (cell) {
            const { value0 } = await this.wallet.runLocal('getCellAddDaoTag', {
                tag: clean,
                comment,
            })
            return value0
        } else if (alone) {
            await this.wallet.run('AloneDeployDaoTag', { tag: clean })
        } else {
            const _reviewers = await this.getReviewers(reviewers)
            const smv = await this.getSmv()
            await smv.validateProposalStart()
            await this.wallet.run('startProposalForAddDaoTag', {
                tag: clean,
                comment,
                reviewers: _reviewers.map(({ wallet }) => wallet),
                num_clients: await smv.getClientsCount(),
            })
        }
    }

    async deleteTag(params: TDaoTagDeleteParams): Promise<TDaoTagDeleteResult> {
        const { tags, comment = '', reviewers = [], cell } = params

        if (!this.wallet) {
            throw new GoshError(EGoshError.WALLET_UNDEFINED)
        }

        const clean = tags.map((item) => {
            return item.startsWith('#') ? item.slice(1) : item
        })

        if (cell) {
            const { value0 } = await this.wallet.runLocal('getCellDestroyDaoTag', {
                tag: clean,
                comment,
            })
            return value0
        } else {
            const _reviewers = await this.getReviewers(reviewers)
            const smv = await this.getSmv()
            await smv.validateProposalStart()
            await this.wallet.run('startProposalForDestroyDaoTag', {
                tag: clean,
                comment,
                reviewers: _reviewers.map(({ wallet }) => wallet),
                num_clients: await smv.getClientsCount(),
            })
        }
    }

    async getEventAddress(result: ResultOfProcessMessage): Promise<string | null> {
        throw new Error('Method is unavailable in current version')
    }

    async createSingleProposal(
        params: TEventSignleCreateProposalParams,
    ): Promise<string | null> {
        throw new Error('Method is unavailable in current version')
    }

    async createMultiProposal(
        params: TEventMultipleCreateProposalParams,
    ): Promise<string | null> {
        if (!this.wallet) {
            throw new GoshError(EGoshError.WALLET_UNDEFINED)
        }
        const { proposals, reviewers = [] } = params

        // Prepare cells
        const cells = await executeByChunk(proposals, 10, async ({ type, params }) => {
            if (type === ESmvEventType.REPO_CREATE) {
                return await this.createRepository({ ...params, cell: true })
            }
            if (type === ESmvEventType.BRANCH_LOCK) {
                const repository = await this.getRepository({ name: params.repository })
                return await repository.lockBranch({ ...params, cell: true })
            }
            if (type === ESmvEventType.BRANCH_UNLOCK) {
                const repository = await this.getRepository({ name: params.repository })
                return await repository.unlockBranch({ ...params, cell: true })
            }
            if (type === ESmvEventType.DAO_MEMBER_ADD) {
                return await this.createMember({ ...params, cell: true })
            }
            if (type === ESmvEventType.DAO_MEMBER_DELETE) {
                return await this.deleteMember({ ...params, cell: true })
            }
            if (type === ESmvEventType.DAO_UPGRADE) {
                return await this.upgrade({ ...params, cell: true })
            }
            if (type === ESmvEventType.TASK_CREATE) {
                return await this.createTask({ ...params, cell: true })
            }
            if (type === ESmvEventType.TASK_DELETE) {
                return await this.deleteTask({ ...params, cell: true })
            }
            if (type === ESmvEventType.DAO_TOKEN_VOTING_ADD) {
                return await this.addVotingTokens({ ...params, cell: true })
            }
            if (type === ESmvEventType.DAO_TOKEN_REGULAR_ADD) {
                return await this.addRegularTokens({ ...params, cell: true })
            }
            if (type === ESmvEventType.DAO_TOKEN_MINT) {
                return await this.mint({ ...params, cell: true })
            }
            if (type === ESmvEventType.DAO_TOKEN_MINT_DISABLE) {
                return await this.disableMint({ ...params, cell: true })
            }
            if (type === ESmvEventType.DAO_TAG_ADD) {
                return await this.createTag({ ...params, cell: true })
            }
            if (type === ESmvEventType.DAO_TAG_REMOVE) {
                return await this.deleteTag({ ...params, cell: true })
            }
            if (type === ESmvEventType.DAO_ALLOWANCE_CHANGE) {
                return await this.updateMemberAllowance({ ...params, cell: true })
            }
            if (type === ESmvEventType.REPO_TAG_ADD) {
                const repository = await this.getRepository({ name: params.repository })
                return await repository.createTag({ ...params, cell: true })
            }
            if (type === ESmvEventType.REPO_TAG_REMOVE) {
                const repository = await this.getRepository({ name: params.repository })
                return await repository.deleteTag({ ...params, cell: true })
            }
            if (type === ESmvEventType.REPO_UPDATE_DESCRIPTION) {
                const repository = await this.getRepository({ name: params.repository })
                return await repository.updateDescription({ ...params, cell: true })
            }
            if (type === ESmvEventType.DAO_EVENT_ALLOW_DISCUSSION) {
                return await this.updateEventAllowDiscussion({ ...params, cell: true })
            }
            if (type === ESmvEventType.DAO_EVENT_HIDE_PROGRESS) {
                return await this.updateEventShowProgress({ ...params, cell: true })
            }
            if (type === ESmvEventType.DAO_ASK_MEMBERSHIP_ALLOWANCE) {
                return await this.updateAskMembershipAllowance({ ...params, cell: true })
            }
            return null
        })

        // Compose cells
        const clean = cells.filter((cell) => typeof cell === 'string')
        const count = clean.length
        for (let i = clean.length - 1; i > 0; i--) {
            const cellA = clean[i - 1]
            const cellB = clean[i]
            const { value0 } = await this.wallet.runLocal('AddCell', {
                data1: cellA,
                data2: cellB,
            })
            clean.splice(i - 1, 2, value0)
            await sleep(100)
        }

        // Create proposal
        const _reviewers = await this.getReviewers(reviewers)
        const smv = await this.getSmv()
        await smv.validateProposalStart()
        await this.wallet.run('startMultiProposal', {
            number: count,
            proposals: clean[0],
            reviewers: _reviewers.map(({ wallet }) => wallet),
            num_clients: await smv.getClientsCount(),
        })

        return null
    }

    async createMultiProposalAsDao(
        params: TEventMultipleCreateProposalAsDaoParams,
    ): Promise<void> {
        throw new Error('Method is unavailable in current version')
    }

    async createTask(params: TTaskCreateParams): Promise<TTaskCreateResult> {
        const {
            repository,
            name,
            config,
            tags = [],
            comment = '',
            reviewers = [],
            cell,
        } = params
        if (!this.wallet) {
            throw new GoshError(EGoshError.PROFILE_UNDEFINED)
        }

        const _task = await this.getTaskAccount({ repository, name })
        if (await _task.isDeployed()) {
            throw new GoshError('Task already exists', { name })
        }

        const tagList = [SYSTEM_TAG, ...tags]
        if (cell) {
            const { value0 } = await this.wallet.runLocal('getCellTaskDeploy', {
                repoName: repository,
                taskName: name,
                grant: config,
                tag: tagList,
                comment,
            })
            return value0
        } else {
            const _reviewers = await this.getReviewers(reviewers)
            const smv = await this.getSmv()
            await smv.validateProposalStart()
            await this.wallet.run('startProposalForTaskDeploy', {
                repoName: repository,
                taskName: name,
                grant: config,
                tag: tagList,
                comment,
                reviewers: _reviewers.map(({ wallet }) => wallet),
                num_clients: await smv.getClientsCount(),
            })
        }
    }

    async receiveTaskBounty(params: TTaskReceiveBountyParams): Promise<void> {
        const { repository, name, type } = params
        if (!this.wallet) {
            throw new GoshError(EGoshError.PROFILE_UNDEFINED)
        }
        await this.wallet.run('askGrantToken', {
            repoName: repository,
            nametask: name,
            typegrant: type,
        })
    }

    async deleteTask(params: TTaskDeleteParams): Promise<TTaskDeleteResult> {
        const { repository, name, comment = '', reviewers = [], cell } = params

        if (!this.wallet) {
            throw new GoshError(EGoshError.PROFILE_UNDEFINED)
        }

        if (cell) {
            const { value0 } = await this.wallet.runLocal('getCellTaskDestroy', {
                repoName: repository,
                taskName: name,
                comment,
            })
            return value0
        } else {
            const _reviewers = await this.getReviewers(reviewers)
            const smv = await this.getSmv()
            await smv.validateProposalStart()
            await this.wallet.run('startProposalForTaskDestroy', {
                repoName: repository,
                taskName: name,
                comment: comment,
                reviewers: _reviewers.map(({ wallet }) => wallet),
                num_clients: await smv.getClientsCount(),
            })
        }
    }

    async transferTask(params: TTaskTransferParams): Promise<TTaskTransferResult> {
        throw new Error('Method is unavailable in current version')
    }

    async upgradeTask(params: TTaskUpgradeParams): Promise<TTaskUpgradeResult> {
        throw new Error('Method is unavailable in current version')
    }

    async upgradeTaskComplete(
        params: TTaskUpgradeCompleteParams,
    ): Promise<TTaskUpgradeCompleteResult> {
        throw new Error('Method is unavailable in current version')
    }

    async createBigTask(params: TBigTaskCreateParams): Promise<TBigTaskCreateResult> {
        throw new Error('Method is unavailable in current version')
    }

    async approveBigTask(params: TBigTaskApproveParams): Promise<TBigTaskApproveResult> {
        throw new Error('Method is unavailable in current version')
    }

    async deleteBigTask(params: TBigTaskDeleteParams): Promise<TBigTaskDeleteResult> {
        throw new Error('Method is unavailable in current version')
    }

    async receiveBigTaskBounty(params: TTaskReceiveBountyParams): Promise<void> {
        throw new Error('Method is unavailable in current version')
    }

    async upgradeBigTask(params: TBigTaskUpgradeParams): Promise<TBigTaskUpgradeResult> {
        throw new Error('Method is unavailable in current version')
    }

    async createSubTask(params: TSubTaskCreateParams): Promise<void> {
        throw new Error('Method is unavailable in current version')
    }

    async deleteSubTask(params: TSubTaskDeleteParams): Promise<void> {
        throw new Error('Method is unavailable in current version')
    }

    async sendEventReview(params: TDaoEventSendReviewParams): Promise<void> {
        const { event, decision } = params

        if (!this.wallet) {
            throw new GoshError(EGoshError.WALLET_UNDEFINED)
        }

        const fn = decision ? 'acceptReviewer' : 'rejectReviewer'
        await this.wallet.run(fn, { propAddress: event })
    }

    async updateEventShowProgress(
        params: TDaoEventShowProgressParams,
    ): Promise<TDaoEventShowProgressResult> {
        const { decision, comment = '', reviewers = [], cell } = params

        if (!this.wallet) {
            throw new GoshError(EGoshError.WALLET_UNDEFINED)
        }

        if (cell) {
            const { value0 } = await this.wallet.runLocal('getCellSetHideVotingResult', {
                res: !decision,
                comment,
            })
            return value0
        } else {
            const _reviewers = await this.getReviewers(reviewers)
            const smv = await this.getSmv()
            await smv.validateProposalStart()
            await this.wallet.run('startProposalForSetHideVotingResult', {
                res: !decision,
                comment,
                reviewers: _reviewers.map(({ wallet }) => wallet),
                num_clients: await smv.getClientsCount(),
            })
        }
    }

    async updateEventAllowDiscussion(
        params: TDaoEventAllowDiscussionParams,
    ): Promise<TDaoEventAllowDiscussionResult> {
        const { allow, comment = '', reviewers = [], cell } = params

        if (!this.wallet) {
            throw new GoshError(EGoshError.WALLET_UNDEFINED)
        }

        if (cell) {
            const { value0 } = await this.wallet.runLocal('getCellSetAllowDiscussion', {
                res: allow,
                comment,
            })
            return value0
        } else {
            const _reviewers = await this.getReviewers(reviewers)
            const smv = await this.getSmv()
            await smv.validateProposalStart()
            await this.wallet.run('startProposalForSetAllowDiscussion', {
                res: allow,
                comment,
                reviewers: _reviewers.map(({ wallet }) => wallet),
                num_clients: await smv.getClientsCount(),
            })
        }
    }

    async createTopic(params: TTopicCreateParams): Promise<void> {
        const { name, content, object } = params
        if (!this.wallet) {
            throw new GoshError(EGoshError.PROFILE_UNDEFINED)
        }
        await this.wallet.run('deployTopic', { name, content, object })
    }

    async createTopicMessage(params: TTopicMessageCreateParams): Promise<void> {
        const { topic, message, answerId } = params
        if (!this.wallet) {
            throw new GoshError(EGoshError.PROFILE_UNDEFINED)
        }
        await this.wallet.run('deployMessage', { topic, message, answer: answerId })
    }

    async upgradeVersionController(
        params: TUpgradeVersionControllerParams,
    ): Promise<void> {
        throw new Error('Method is unavailable in current version')
    }

    async startPaidMembership(
        params: TDaoStartPaidMembershipParams,
    ): Promise<TDaoStartPaidMembershipResult> {
        throw new Error('Method is unavailable in current version')
    }

    async stopPaidMembership(
        params: TDaoStopPaidMembershipParams,
    ): Promise<TDaoStopPaidMembershipResult> {
        throw new Error('Method is unavailable in current version')
    }

    async createCodeCommentThread(
        params: TCodeCommentThreadCreateParams,
    ): Promise<TCodeCommentThreadCreateResult> {
        throw new Error('Method is unavailable in current version')
    }

    async resolveCodeCommentThread(
        params: TCodeCommentThreadResdolveParams,
    ): Promise<void> {
        throw new Error('Method is unavailable in current version')
    }

    async createCodeComment(params: TCodeCommentCreateParams): Promise<void> {
        throw new Error('Method is unavailable in current version')
    }

    private async _isAuthMember(): Promise<boolean> {
        if (!this.profile) {
            return false
        }
        return await this.isMember({ profile: this.profile.address })
    }

    private async _isAuthLimited(): Promise<boolean> {
        if (!this.wallet) {
            return false
        }
        const { _limited } = await this.wallet.runLocal('_limited', {})
        return _limited
    }

    private async _isMintOn(): Promise<boolean> {
        const { _allowMint } = await this.dao.runLocal('_allowMint', {})
        return _allowMint
    }

    private _getMembers(mapping: { [key: string]: { member: TAddress; count: string } }) {
        const members = []
        for (const key in mapping) {
            const profile = `0:${key.slice(2)}`
            members.push({
                profile,
                wallet: mapping[key].member,
                allowance: parseInt(mapping[key].count),
            })
        }
        return members
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
        if (!this.profile) {
            throw new GoshError(EGoshError.PROFILE_UNDEFINED)
        }

        const address = await this._getWalletAddress(this.profile.address, index)
        return new GoshWallet(this.client, address, { keys })
    }

    private async _getConfig(): Promise<any> {
        const { value0 } = await this.dao.runLocal('getConfig', {})
        return {
            maxWalletsWrite: +value0,
        }
    }

    async getTaskAccount(options: {
        address?: TAddress
        repository?: string
        name?: string
    }): Promise<IGoshTask> {
        const { repository, name, address } = options

        if (address) {
            return new GoshTask(this.client, address)
        }
        if (!repository || !name) {
            throw new GoshError(
                'Either task address or repository and task name should be provided',
            )
        }
        const { value0 } = await this.gosh.gosh.runLocal('getTaskAddr', {
            dao: await this.getName(),
            repoName: repository,
            nametask: name,
        })
        return new GoshTask(this.client, value0)
    }

    private async _getTopic(params: { address?: TAddress }): Promise<IGoshTopic> {
        const { address } = params
        if (address) {
            return new GoshTopic(this.client, address)
        }
        throw new GoshError('Topic address should be provided')
    }

    private async _getSystemRepository(): Promise<
        IGoshRepositoryAdapter | null | undefined
    > {
        if (!this.systemRepository) {
            const repo = await this.getRepository({ name: '_index' })
            if (await repo.isDeployed()) {
                this.systemRepository = repo
            }
        }
        return this.systemRepository
    }

    private async _getSystemBlob(filename: string): Promise<string | null> {
        const repository = await this._getSystemRepository()
        if (!repository) {
            return null
        }

        const branch = await repository.getBranch('main')
        const tree = await repository.getTree(branch.commit.name, '')
        const item = tree.items.find((it) => {
            return it.type === 'blob' && it.name.toLowerCase() === filename
        })
        if (!item) {
            return null
        }

        try {
            const fullpath = `${branch.name}/${item.name}`
            const { content } = await repository.getBlob({
                fullpath,
                commit: branch.commit.name,
            })
            if (!Buffer.isBuffer(content)) {
                return content
            }
        } catch (e: any) {
            console.warn(e.message)
        }
        return null
    }

    private async _createLimitedWallet(profile: TAddress): Promise<void> {
        const wallet = await this.getMemberWallet({ profile })
        if (await wallet.isDeployed()) {
            return
        }

        await this.dao.run('deployWalletsOutMember', {
            pubmem: [{ member: profile, count: 0 }],
            index: 0,
        })
        const wait = await whileFinite(async () => {
            return await wallet.isDeployed()
        })
        if (!wait) {
            throw new GoshError('Create DAO wallet timeout reached')
        }
    }

    private async _convertVoting2Regular(amount: number) {
        if (!this.wallet) {
            throw new GoshError(EGoshError.WALLET_UNDEFINED)
        }

        const smv = await this.getSmv()
        const regular = await smv.getWalletBalance(this.wallet)
        if (amount > regular) {
            const delta = amount - regular
            await smv.transferToWallet(delta)

            const check = await whileFinite(async () => {
                const _regular = await smv.getWalletBalance(this.wallet!)
                if (_regular >= amount) {
                    return true
                }
            })
            if (!check) {
                throw new GoshError('Regular tokens topup failed')
            }
        }
    }
}

class GoshRepositoryAdapter implements IGoshRepositoryAdapter {
    private gosh: IGoshAdapter
    private client: TonClient
    name?: string
    private subwallets: IGoshWallet[] = []

    repo: IGoshRepository
    auth?: { username: string; wallet0: IGoshWallet }
    config?: { maxWalletsWrite: number }

    constructor(
        gosh: IGoshAdapter,
        address: TAddress,
        auth?: { username: string; wallet0: IGoshWallet },
        config?: { maxWalletsWrite: number },
    ) {
        this.gosh = gosh
        this.client = gosh.client
        this.repo = new GoshRepository(this.client, address)
        this.auth = auth
        this.config = config
    }

    async isDeployed(): Promise<boolean> {
        return await this.repo.isDeployed()
    }

    getGosh(): IGoshAdapter {
        return this.gosh
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
        const details = await this.repo.runLocal('getDetails', {})
        return {
            address: this.repo.address,
            name: details.name,
            version: this.repo.version,
            branches: details.alladress,
            head: details.head,
            commitsIn: [],
            description: details.description,
            tags: Object.values(details.hashtag),
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
        if (typeof commit === 'string') {
            commit = await this.getCommit({ name: commit })
        }

        let items: TTreeItem[] = []
        if (commit.name !== ZERO_COMMIT) {
            items = await this._getTreeItems({ name: commit.tree })
        }
        if (search !== '') {
            await recursive('', items)
        }

        // Build full tree
        const tree = this._getTreeFromItems(items)
        return { tree, items }
    }

    async getBlob(options: {
        commit?: string
        fullpath?: string
        address?: TAddress
    }): Promise<{
        address: string
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

        return { ...result, address: snapshot.address }
    }

    async getCommit(options: { name?: string; address?: TAddress }): Promise<TCommit> {
        const commit = await this._getCommit(options)
        const details = await commit.runLocal('getCommit', {})
        const { value0: treeaddr } = await commit.runLocal('gettree', {})
        const { branch, sha, parents, content, initupgrade, isCorrectCommit } = details

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
                if (item.search(key) >= 0) {
                    parsed[key] = item.replace(`${key} `, '')
                }
            })
        })

        const _parents = await Promise.all(
            parents.map(async (item: any) => {
                const _commit = await this._getCommit({ address: item.addr })
                const { value0 } = await _commit.runLocal('getNameCommit', {})
                return {
                    address: item.addr,
                    version: item.version,
                    name: value0,
                }
            }),
        )

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
            parents: _parents,
            version: commit.version,
            initupgrade,
            correct: isCorrectCommit,
            treeaddr,
        }
    }

    async getCommitBlob(
        address: string,
        treepath: string,
        commit: string | TCommit,
    ): Promise<{ address: string; previous: string | Buffer; current: string | Buffer }> {
        if (typeof commit === 'string') {
            commit = await this.getCommit({ name: commit })
        }

        let parent: TCommit
        if (commit.parents[0].version !== this.repo.version) {
            const _gosh = GoshAdapterFactory.create(commit.parents[0].version)
            const _dao = await (await this._getDao()).getName()
            const _repo = await this.getName()
            const _adapter = await _gosh.getRepository({ path: `${_dao}/${_repo}` })
            parent = await _adapter.getCommit({ address: commit.parents[0].address })
        } else {
            parent = await this.getCommit({ address: commit.parents[0].address })
        }

        // Get snapshot and read all incoming internal messages
        const snapshot = await this._getSnapshot({ address })
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
        const { content } = await this.getBlob({ commit: commit.name, address })
        const current = await this._getCommitBlob(commit, treepath, content, approved)
        const previous =
            parent.name === ZERO_COMMIT
                ? ''
                : await this._getCommitBlob(parent, treepath, content, approved)

        return { address: snapshot.address, previous, current }
    }

    async getCommitBlobs(
        branch: string,
        commit: string | TCommit,
    ): Promise<{ address: string; treepath: string }[]> {
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

        return await executeByChunk<TAddress, { address: string; treepath: string }>(
            Array.from(new Set(addresses)),
            MAX_PARALLEL_READ,
            async (address) => {
                const snapshot = await this._getSnapshot({ address })
                const name = await snapshot.getName()
                return { address, treepath: name.split('/').slice(1).join('/') }
            },
        )
    }

    async getPullRequestBlob(
        item: { address: string; treepath: string; index: number },
        commit: string | TCommit,
    ): Promise<{ address: string; previous: string | Buffer; current: string | Buffer }> {
        if (typeof commit === 'string') {
            commit = await this.getCommit({ name: commit })
        }

        // If commit was accepted, return blob state at commit
        if (item.index === -1) {
            return await this.getCommitBlob(item.address, item.treepath, commit)
        }

        // Get blob state at parent commit, get diffs and apply
        const parent = await this.getCommit({ address: commit.parents[0].address })

        let previous: string | Buffer
        let current: string | Buffer
        try {
            const state = await this.getCommitBlob(
                item.address,
                item.treepath,
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
        return { address: item.address, previous, current }
    }

    async getPullRequestBlobs(
        commit: string | TCommit,
    ): Promise<{ address: string; treepath: string; index: number }[]> {
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
            return blobs.map(({ address, treepath }) => ({
                address,
                treepath,
                index: -1,
            }))
        }

        // Get blobs list from diffs (if commit is not accepted)
        return await executeByChunk<
            IGoshDiff,
            { address: string; treepath: string; index: number }
        >(diffs, MAX_PARALLEL_READ, async (diff, index) => {
            const subdiffs = await this._getDiffs(diff)
            const snapshot = await this._getSnapshot({ address: subdiffs[0].snap })
            const name = await snapshot.getName()
            const treepath = name.split('/').slice(1).join('/')
            return { address: snapshot.address, treepath, index }
        })
    }

    async getBranch(name: string): Promise<TBranch> {
        const { branchname, commitaddr, commitversion } = await this._getBranch(name)

        // TODO: Make better?
        let adapter: IGoshRepositoryAdapter = this
        if (commitversion !== this.repo.version) {
            const gosh = GoshAdapterFactory.create(commitversion)
            const dao = await (await this._getDao()).getName()
            const name = await this.getName()
            adapter = await gosh.getRepository({ path: `${dao}/${name}` })
        }
        // END TODO

        return {
            name: branchname,
            commit: {
                ...(await adapter.getCommit({ address: commitaddr })),
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

                // TODO: Make better?
                let adapter: IGoshRepositoryAdapter = this
                if (commitversion !== this.repo.version) {
                    const gosh = GoshAdapterFactory.create(commitversion)
                    const dao = await (await this._getDao()).getName()
                    const name = await this.getName()
                    adapter = await gosh.getRepository({ path: `${dao}/${name}` })
                }
                // END TODO

                return {
                    name: branchname,
                    commit: {
                        ...(await adapter.getCommit({ address: commitaddr })),
                        version: commitversion,
                    },
                    isProtected: await this._isBranchProtected(branchname),
                }
            },
        )
    }

    async getCommitTags(): Promise<TCommitTag[]> {
        // Get repo tag code and all tag accounts addresses
        const code = await this.repo.runLocal('getTagCode', {}, undefined, {
            useCachedBoc: true,
        })
        const codeHash = await this.client.boc.get_boc_hash({ boc: code.value0 })
        const accounts = await getAllAccounts({
            filters: [`code_hash: {eq:"${codeHash.hash}"}`],
        })

        // Read each tag account details
        return await executeByChunk<any, TCommitTag>(
            accounts,
            MAX_PARALLEL_READ,
            async ({ id }) => {
                return await this._getCommitTag(id)
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
                    parents: [
                        {
                            address: object.address,
                            version: object.version,
                            name: object.name,
                        },
                    ],
                },
                tree: {},
                blobs: [],
            }
        }

        // Get non-zero commit data
        const { tree, items } = await this.getTree(object)
        const blobs = await this._getTreeBlobs(items, object.branch, commit)
        return {
            commit: {
                ...object,
                parents: [
                    {
                        address: object.address,
                        version: object.version,
                        name: object.name,
                    },
                ],
            },
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

    async getIncomingCommits(): Promise<{ branch: string; commit: TCommit }[]> {
        // Read limited amount of IntIn repo messages
        const { messages } = await this.repo.getMessages(
            {
                msgType: ['IntIn'],
                node: ['block_id', 'src', 'dst_transaction {id out_msgs}'],
                limit: 30,
                allow_latest_inconsistent_data: true,
            },
            true,
        )

        // Remove all messages from tail until `SendDiff` first occurence
        for (let i = messages.length - 1; i >= 0; i--) {
            const { decoded } = messages[i]
            if (decoded && decoded.name === 'SendDiff') {
                break
            }
            messages.splice(i, 1)
        }

        // Get successful `SendDiff` messages
        const sendDiffs = await Promise.all(
            messages
                .filter(({ decoded }) => decoded && decoded.name === 'SendDiff')
                .map(async ({ decoded, message }) => {
                    const { result } = await this.client.net.query_collection({
                        collection: 'messages',
                        filter: {
                            id: { in: message.dst_transaction.out_msgs },
                        },
                        result: 'dst_transaction {id aborted status}',
                    })

                    const txSuccess = result.every(
                        ({ dst_transaction: tx }) => tx.status === 3 && !tx.aborted,
                    )
                    return { decoded, message: { ...message, aborted: !txSuccess } }
                }),
        )
        const incoming = sendDiffs
            .filter(({ message }) => !message.aborted)
            .map(({ decoded }) => decoded.value)

        // Get `setComit` or `commitCanceled` messages and remove corresponding
        // `SendDiff` messages
        const setCommits = messages.filter(({ decoded }) => {
            if (!decoded) {
                return false
            }
            return ['setCommit', 'commitCanceled'].indexOf(decoded.name) >= 0
        })
        for (const { message } of setCommits) {
            const index = incoming.findIndex(({ commit }) => commit === message.src)
            incoming.splice(index, 1)
        }

        return await Promise.all(
            incoming.map(async (item) => {
                const commit = await this.getCommit({ address: item.commit })
                return { ...item, commit }
            }),
        )
    }

    async subscribeIncomingCommits(
        callback: (incoming: { branch: string; commit: TCommit }[]) => void,
    ) {
        await this.repo.account.subscribeMessages('body msg_type', async (message) => {
            const decoded = await this.repo.decodeMessageBody(
                message.body,
                message.msg_type,
            )
            if (
                decoded &&
                ['SendDiff', 'setCommit', 'commitCanceled'].indexOf(decoded.name) >= 0
            ) {
                const incoming = await this.getIncomingCommits()
                callback(incoming)
            }
        })
    }

    async unsubscribe() {
        await this.repo.account.free()
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
                true,
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

        // Delete branch and wait for it to be deleted
        await this.auth.wallet0.run('deleteBranch', {
            repoName: await this.getName(),
            Name: name,
        })
        const wait = await whileFinite(async () => {
            const { branchname } = await this._getBranch(name)
            return !branchname
        })
        if (!wait) {
            throw new GoshError('Delete branch timeout reached')
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

        cb({ completed: true })
    }

    async lockBranch(
        params: TRepositoryChangeBranchProtectionParams,
    ): Promise<TRepositoryChangeBranchProtectionResult> {
        const { repository, branch, comment = '', reviewers = [], cell } = params

        if (!this.auth) {
            throw new GoshError(EGoshError.PROFILE_UNDEFINED)
        }
        if (await this._isBranchProtected(branch)) {
            throw new GoshError('Branch is already protected')
        }

        if (cell) {
            const { value0 } = await this.auth.wallet0.runLocal(
                'getCellAddProtectedBranch',
                {
                    repoName: repository,
                    branchName: branch,
                    comment,
                },
            )
            return value0
        } else {
            const _reviewers = await this._getReviewers(reviewers)
            const smvClientsCount = await this._validateProposalStart()
            await this.auth.wallet0.run('startProposalForAddProtectedBranch', {
                repoName: repository,
                branchName: branch,
                comment,
                reviewers: _reviewers.map(({ wallet }) => wallet),
                num_clients: smvClientsCount,
            })
        }
    }

    async unlockBranch(
        params: TRepositoryChangeBranchProtectionParams,
    ): Promise<TRepositoryChangeBranchProtectionResult> {
        const { repository, branch, comment = '', reviewers = [], cell } = params

        if (!this.auth) {
            throw new GoshError(EGoshError.PROFILE_UNDEFINED)
        }
        if (!(await this._isBranchProtected(branch))) {
            throw new GoshError('Branch is not protected')
        }

        if (cell) {
            const { value0 } = await this.auth.wallet0.runLocal(
                'getCellDeleteProtectedBranch',
                {
                    repoName: repository,
                    branchName: branch,
                    comment,
                },
            )
            return value0
        } else {
            const _reviewers = await this._getReviewers(reviewers)
            const smvClientsCount = await this._validateProposalStart()
            await this.auth.wallet0.run('startProposalForDeleteProtectedBranch', {
                repoName: repository,
                branchName: branch,
                comment,
                reviewers: _reviewers.map(({ wallet }) => wallet),
                num_clients: smvClientsCount,
            })
        }
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
        options: {
            tags?: string
            branchParent?: string
            task?: TTaskCommitConfig
            callback?: IPushCallback
        },
    ): Promise<string | null> {
        if (!this.auth) {
            throw new GoshError(EGoshError.PROFILE_UNDEFINED)
        }
        const { tags, branchParent, callback } = options

        const taglist = tags ? tags.split(' ') : []
        const cb: IPushCallback = (params) => callback && callback(params)

        // Get branch info and get branch tree
        const branchTo = await this.getBranch(branch)
        const { items } = await this.getTree(branchTo.commit)

        // Validation
        const task = await this._getTaskCommitConfig(options.task)
        if (!isPullRequest && branchTo.isProtected) {
            throw new GoshError(EGoshError.PR_BRANCH)
        }
        if (isPullRequest) {
            await this._validateProposalStart(0)
        }

        // Generate blobs push data array
        const blobsData = (
            await executeByChunk(blobs, MAX_PARALLEL_READ, async (blob) => {
                return await this._getBlobPushData(items, branch, blob)
            })
        ).flat()

        // Get updated tree
        const updatedTree = await this._getTreePushData(items, blobsData)
        cb({
            isUpgrade: false,
            treesBuild: true,
            treesDeploy: { count: 0, total: updatedTree.updated.length },
            snapsDeploy: { count: 0, total: blobsData.length },
            diffsDeploy: { count: 0, total: blobsData.length },
            tagsDeploy: { count: 0, total: taglist.length },
            commitDeploy: undefined,
            completed: undefined,
        })

        // Generate commit data
        const { commitHash, commitContent, commitParents } = await this._generateCommit(
            branchTo,
            updatedTree.hash,
            message,
            branchParent,
        )

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
            await this.createCommitTag({
                repository: await this.getName(),
                commit: commitHash,
                tag,
                wallet,
            })
            cb({ tagsDeploy: { count: ++tagsCounter } })
        })

        // Deploy commit
        await this._deployCommit(
            branch,
            commitHash,
            commitContent,
            commitParents,
            updatedTree.hash,
            false,
        )
        cb({ commitDeploy: true })

        // Set commit or start PR proposal
        if (!isPullRequest) {
            await this._setCommit(branch, commitHash, blobsData.length, false, task)
            const wait = await whileFinite(async () => {
                const check = await this.getBranch(branch)
                return check.commit.address !== branchTo.commit.address
            })
            if (!wait) throw new GoshError('Push timeout reached')
        } else {
            await this._startProposalForSetCommit(
                branch,
                commitHash,
                blobsData.length,
                message,
                task,
            )
        }
        cb({ completed: true })
        return null
    }

    async pushUpgrade(
        data: TUpgradeData,
        options: { callback?: IPushCallback },
    ): Promise<void> {
        const { blobs, commit, tree } = data
        const { callback } = options
        const cb: IPushCallback = (params) => callback && callback(params)

        cb({
            isUpgrade: true,
            treesBuild: true,
            treesDeploy: { count: 0, total: Object.keys(tree).length },
            snapsDeploy: { count: 0, total: blobs.length },
            diffsDeploy: { count: 0, total: 0 },
            tagsDeploy: { count: 0, total: 0 },
            commitDeploy: undefined,
            completed: undefined,
        })

        // Deploy trees
        let treeCounter = 0
        await this._runMultiwallet(Object.keys(tree), async (wallet, path) => {
            await this._deployTree(tree[path], wallet)
            cb({ treesDeploy: { count: ++treeCounter } })
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
        cb({ commitDeploy: true })

        // Deploy snapshots
        let snapCounter = 0
        await this._runMultiwallet(blobs, async (wallet, { treepath, content }) => {
            await this._deploySnapshot(
                commit.branch,
                commit.name,
                treepath,
                content,
                wallet,
            )
            cb({ snapsDeploy: { count: ++snapCounter } })
        })

        // Set commit
        await this._setCommit(commit.branch, commit.name, blobs.length, true)
        const wait = await whileFinite(async () => {
            const check = await this.getBranch(commit.branch)
            return check.commit.address !== commit.address
        })
        if (!wait) {
            throw new GoshError('Push upgrade timeout reached')
        }
        cb({ completed: true })
    }

    async createCommitTag(params: TRepositoryCreateCommitTagParams): Promise<void> {
        const { repository, commit, tag, wallet } = params

        if (!this.auth) {
            throw new GoshError(EGoshError.PROFILE_UNDEFINED)
        }

        const commitContract = await this._getCommit({ name: commit })
        const _wallet = wallet || this.auth.wallet0
        await _wallet.run('deployTag', {
            repoName: repository,
            nametag: tag,
            nameCommit: commit,
            content: `tag ${tag}\nobject ${commit}\n`,
            commit: commitContract.address,
        })
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

    async createTag(
        params: TRepositoryTagCreateParams,
    ): Promise<TRepositoryTagCreateResult> {
        const { repository, tags, comment = '', reviewers = [], cell } = params

        if (!this.auth) {
            throw new GoshError(EGoshError.PROFILE_UNDEFINED)
        }

        if (cell) {
            const { value0 } = await this.auth.wallet0.runLocal('getCellAddRepoTag', {
                tag: tags,
                repo: repository,
                comment,
            })
            return value0
        } else {
            const _reviewers = await this._getReviewers(reviewers)
            const smvClientsCount = await this._validateProposalStart()
            await this.auth.wallet0.run('startProposalForAddRepoTag', {
                tag: tags,
                repo: repository,
                comment,
                reviewers: _reviewers.map(({ wallet }) => wallet),
                num_clients: smvClientsCount,
            })
        }
    }

    async deleteTag(
        params: TRepositoryTagDeleteParams,
    ): Promise<TRepositoryTagDeleteResult> {
        const { repository, tags, comment = '', reviewers = [], cell } = params

        if (!this.auth) {
            throw new GoshError(EGoshError.PROFILE_UNDEFINED)
        }

        if (cell) {
            const { value0 } = await this.auth.wallet0.runLocal('getCellDestroyRepoTag', {
                tag: tags,
                repo: repository,
                comment,
            })
            return value0
        } else {
            const _reviewers = await this._getReviewers(reviewers)
            const smvClientsCount = await this._validateProposalStart()
            await this.auth.wallet0.run('startProposalForDestroyRepoTag', {
                tag: tags,
                repo: await this.getName(),
                comment,
                reviewers: _reviewers.map(({ wallet }) => wallet),
                num_clients: smvClientsCount,
            })
        }
    }

    async updateDescription(
        params: TRepositoryUpdateDescriptionParams,
    ): Promise<TRepositoryUpdateDescriptionResult> {
        const { repository, description, comment = '', reviewers = [], cell } = params

        if (!this.auth) {
            throw new GoshError(EGoshError.PROFILE_UNDEFINED)
        }

        if (cell) {
            const { value0 } = await this.auth.wallet0.runLocal(
                'getCellChangeDescription',
                {
                    repoName: repository,
                    descr: description,
                    comment,
                },
            )
            return value0
        } else {
            const _reviewers = await this._getReviewers(reviewers)
            const smvClientsCount = await this._validateProposalStart()
            await this.auth.wallet0.run('startProposalForChangeDescription', {
                repoName: repository,
                descr: description,
                comment,
                reviewers: _reviewers.map(({ wallet }) => wallet),
                num_clients: smvClientsCount,
            })
        }
    }

    private async _isBranchProtected(name: string): Promise<boolean> {
        const { value0 } = await this.repo.runLocal('isBranchProtected', {
            branch: name,
        })
        return value0
    }

    private async _getTask(options: {
        name?: string
        address?: TAddress
    }): Promise<IGoshTask> {
        const { name, address } = options

        if (address) {
            return new GoshTask(this.client, address)
        }
        if (!name) {
            throw new GoshError('Either task address or name should be provided')
        }
        if (!this.auth) {
            throw new GoshError(EGoshError.PROFILE_UNDEFINED)
        }
        const { value0 } = await this.auth.wallet0.runLocal('getTaskAddr', {
            repoName: await this.getName(),
            nametask: name,
        })
        return new GoshTask(this.client, value0)
    }

    private async _getBranches(): Promise<any[]> {
        const { value0 } = await this.repo.runLocal('getAllAddress', {})
        return value0
    }

    async _getBranch(name: string): Promise<any> {
        const { value0 } = await this.repo.runLocal('getAddrBranch', { name })
        return value0
    }

    async _getSnapshot(options: {
        fullpath?: string
        address?: TAddress
    }): Promise<IGoshSnapshot> {
        const { address, fullpath } = options
        if (address) {
            return new GoshSnapshot(this.client, address)
        }

        if (!fullpath) {
            throw new GoshError('Blob name is undefined')
        }
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
            const isOriginalIpfs =
                (flagsOriginal & EBlobFlag.IPFS) === EBlobFlag.IPFS ||
                Buffer.isBuffer(original)

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
                if (Buffer.isBuffer(modified)) {
                    flagsModified |= EBlobFlag.BINARY
                }
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

        // Test cases (add, delete, update, rename)
        if (!aPath && !bPath) throw new GoshError('Blob has no tree path')
        if (!aPath && bPath) {
            if (bItem) {
                throw new GoshError(EGoshError.FILE_EXISTS, { path: bPath })
            }

            const data = await _getData(bPath, { original: '', modified }, bItem)
            return [{ data, status: 0 }]
        }
        if (aPath && !bPath) {
            if (!aItem) {
                throw new GoshError(EGoshError.FILE_NOT_EXIST, { path: aPath })
            }

            const data = await _getData(aPath, { original, modified: '' }, aItem)
            return [{ data, status: 2 }]
        }
        if (aPath === bPath) {
            if (!aItem) {
                throw new GoshError(EGoshError.FILE_NOT_EXIST, { path: aPath })
            }
            if (original === modified) {
                throw new GoshError(EGoshError.FILE_UNMODIFIED)
            }

            const data = await _getData(aPath, { original, modified }, aItem)
            return [{ data, status: 1 }]
        }

        if (bItem) {
            throw new GoshError(EGoshError.FILE_EXISTS, { path: bPath })
        }
        return await Promise.all(
            treepath.map(async (path) => {
                const _content = {
                    original: path === bPath ? '' : original,
                    modified: path === aPath ? '' : modified,
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

    async _getCommit(options: {
        name?: string
        address?: TAddress
    }): Promise<IGoshCommit> {
        const { name, address } = options

        if (address) {
            return new GoshCommit(this.client, address)
        }
        if (!name) {
            throw new GoshError('Commit name is undefined')
        }

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
    ): Promise<{ address: string; treepath: string; content: string | Buffer }[]> {
        const filtered = items.filter(
            (item) => ['blob', 'blobExecutable'].indexOf(item.type) >= 0,
        )
        return await executeByChunk(filtered, MAX_PARALLEL_READ, async (item) => {
            const treepath = getTreeItemFullPath(item)
            const fullpath = `${branch}/${treepath}`
            const { address, content } = await this.getBlob({ commit, fullpath })
            return { address, treepath, content }
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

    private async _getCommitTag(address: TAddress): Promise<TCommitTag> {
        const tag = new GoshCommitTag(this.client, address)
        const { value0, value1, value2, value3, value4 } = await tag.runLocal(
            'getDetails',
            {},
        )
        return {
            repository: value4,
            name: value0,
            content: value3,
            commit: {
                address: value1,
                name: value2,
            },
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
        forceDelete?: boolean,
    ): Promise<IGoshSnapshot> {
        if (!this.auth) {
            throw new GoshError(EGoshError.PROFILE_UNDEFINED)
        }

        wallet = wallet || this.auth.wallet0
        const snapshot = await this._getSnapshot({ fullpath: `${branch}/${treepath}` })
        if (await snapshot.isDeployed()) {
            if (forceDelete) {
                await wallet.run('deleteSnapshot', { snap: snapshot.address })
            } else {
                return snapshot
            }
        }

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

        await wallet.run('deployNewSnapshot', {
            branch,
            commit,
            repo: this.repo.address,
            name: treepath,
            snapshotdata: data.snapshotData,
            snapshotipfs: data.snapshotIpfs,
        })
        const wait = await whileFinite(async () => {
            return await snapshot.isDeployed()
        })
        if (!wait) {
            throw new GoshError('Deploy snapshot timeout reached', {
                branch,
                name: treepath,
                address: snapshot.address,
            })
        }

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
        const wait = await whileFinite(async () => {
            return await tree.isDeployed()
        })
        if (!wait) {
            throw new GoshError('Deploy tree timeout reached', {
                name: hash,
                address: tree.address,
            })
        }
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
        const wait = await whileFinite(async () => {
            return await diffContract.isDeployed()
        })
        if (!wait) {
            throw new GoshError('Deploy diff timeout reached', {
                branch,
                index1,
                address: diffContract.address,
            })
        }
    }

    private async _deployCommit(
        branch: string,
        commit: string,
        content: string,
        parents: { address: TAddress; version: string }[],
        treeHash: string,
        upgrade: boolean,
    ): Promise<void> {
        if (!this.auth) {
            throw new GoshError(EGoshError.PROFILE_UNDEFINED)
        }

        // Check if deployed
        const commitContract = await this._getCommit({ name: commit })
        if (await commitContract.isDeployed()) {
            return
        }

        // Deploy commit
        const tree = await this._getTree({ name: treeHash })
        await this.auth.wallet0.run('deployCommit', {
            repoName: await this.repo.getName(),
            branchName: branch,
            commitName: commit,
            fullCommit: content,
            parents: parents.map(({ address, version }) => ({ addr: address, version })),
            tree: tree.address,
            upgrade,
        })
        const wait = await whileFinite(async () => {
            return await commitContract.isDeployed()
        })
        if (!wait) {
            throw new GoshError('Deploy commit timeout reached', {
                branch,
                name: commit,
                address: commitContract.address,
            })
        }
    }

    private async _setCommit(
        branch: string,
        commit: string,
        numBlobs: number,
        isUpgrade: boolean,
        task?: {
            task: TAddress
            pubaddrassign: { [address: string]: boolean }
            pubaddrreview: { [address: string]: boolean }
            pubaddrmanager: { [address: string]: boolean }
        },
    ): Promise<void> {
        if (!this.auth) {
            throw new GoshError(EGoshError.PROFILE_UNDEFINED)
        }

        await this.auth.wallet0.run('setCommit', {
            repoName: await this.getName(),
            branchName: branch,
            commit,
            numberChangedFiles: numBlobs,
            numberCommits: 1,
            isUpgrade,
            task,
        })
    }

    private async _startProposalForSetCommit(
        branch: string,
        commit: string,
        numBlobs: number,
        comment: string,
        task?: {
            task: TAddress
            pubaddrassign: { [address: string]: boolean }
            pubaddrreview: { [address: string]: boolean }
            pubaddrmanager: { [address: string]: boolean }
        },
    ): Promise<void> {
        if (!this.auth) {
            throw new GoshError(EGoshError.PROFILE_UNDEFINED)
        }

        const dao = await this._getDao()
        const _reviewers = await executeByChunk(
            Object.keys(task?.pubaddrreview || {}),
            MAX_PARALLEL_READ,
            async (profile) => {
                const wallet = await dao.getMemberWallet({ profile, index: 0 })
                return wallet.address
            },
        )

        const smvClientsCount = await this._validateProposalStart(0)
        await this.auth.wallet0.run('startProposalForSetCommit', {
            repoName: await this.getName(),
            branchName: branch,
            commit,
            numberChangedFiles: numBlobs,
            numberCommits: 1,
            task,
            comment,
            num_clients: smvClientsCount,
            reviewers: _reviewers,
        })
    }

    private async _getTaskCommitConfig(config?: TTaskCommitConfig) {
        const _getMapping = async (usernames: string[]) => {
            const clean = usernames.map((item) => item.trim()).filter((item) => !!item)
            const unique = new Set([...clean])
            const validated = await this.gosh.isValidProfile(Array.from(unique))

            const map: { [address: string]: boolean } = {}
            await Promise.all(
                validated.map(async (item) => {
                    await dao.getMemberWallet({ profile: item.address, create: true })
                    map[item.address] = true
                }),
            )
            return map
        }

        if (!config) {
            return undefined
        }
        if (!this.auth) {
            throw new GoshError(EGoshError.PROFILE_UNDEFINED)
        }

        const dao = await this._getDao()
        const task = await this._getTask({ name: config.task })
        if (!(await task.isDeployed())) {
            throw new GoshError('Task does not exist', { name: config.task })
        }

        const assigners = await _getMapping(config.assigners as string[])
        const reviewers = await _getMapping(config.reviewers as string[])
        const managers = await _getMapping(config.managers as string[])

        return {
            task: task.address,
            pubaddrassign: assigners,
            pubaddrreview: reviewers,
            pubaddrmanager: managers,
        }
    }

    private async _runMultiwallet<Input, Output>(
        array: Input[],
        executor: (wallet: IGoshWallet, params: Input, index: number) => Promise<Output>,
    ): Promise<Output[]> {
        if (!this.auth) throw new GoshError(EGoshError.PROFILE_UNDEFINED)
        if (!this.config) throw new GoshError('Repository config is undefined')

        // Get/deploy wallets
        if (this.subwallets.length !== this.config.maxWalletsWrite) {
            const { value0 } = await this.auth.wallet0.runLocal('getWalletsCount', {})
            const counter = parseInt(value0)
            const subwallets = await Promise.all(
                Array.from(new Array(counter)).map(async (_, index) => {
                    if (index === 0) return this.auth!.wallet0
                    try {
                        return await this._getSubwallet(index)
                    } catch (e: any) {
                        console.warn(e.message)
                        return null
                    }
                }),
            )
            this.subwallets = subwallets.filter((item) => !!item) as IGoshWallet[]

            if (counter < this.config.maxWalletsWrite) {
                this.auth.wallet0.run('deployWallet', {})
            }
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
        commitParents: { address: TAddress; version: string }[]
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

        const parentObjects = [branch.commit, parent?.commit].reduce(
            (filtered: { address: TAddress; version: string }[], item) => {
                if (!!item) {
                    filtered.push({ address: item.address, version: item.version })
                }
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
            commitParents: parentObjects,
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
        // TODO: applyPatch can return boolean (false)
        return Diff.applyPatch(content as string, apply) as string
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
        let patch = Diff.createPatch(treepath, original, modified, undefined, undefined, {
            context: 0,
        })

        // Format to GOSH patch
        patch = patch.split('\n').slice(4).join('\n')

        /**
         * Custom patch for delete file (`modified` is empty)
         * If `original` ends with hex byte 0a (int 10, char \n),
         * remove `\ No newline at end of file` line from lib patch
         */
        if (!modified.length) {
            const hasLF = Buffer.from(original).subarray(-1)[0] === 10
            if (hasLF) {
                patch = patch.replace('\\ No newline at end of file\n', '')
            }
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

    private async _getDao(): Promise<IGoshDaoAdapter> {
        const { _goshdao } = await this.repo.runLocal('_goshdao', {}, undefined, {
            useCachedBoc: true,
        })
        return new GoshDaoAdapter(this.gosh, _goshdao)
    }

    private async _getReviewers(user: TUserParam[]) {
        const dao = await this._getDao()
        return await dao.getReviewers(user)
    }

    private async _validateProposalStart(min?: number): Promise<number> {
        if (!this.auth) {
            throw new GoshError(EGoshError.PROFILE_UNDEFINED)
        }
        if (this.auth.wallet0.account.signer.type !== 'Keys') {
            throw new GoshError(EGoshError.PROFILE_UNDEFINED)
        }

        const dao = await this._getDao()
        await dao.setAuth(this.auth.username, this.auth.wallet0.account.signer.keys)

        const smv = await dao.getSmv()
        await smv.validateProposalStart(min)
        return await smv.getClientsCount()
    }

    async getBlobPushDataOut(
        tree: TTreeItem[],
        blob: {
            treepath: string[]
            original: string | Buffer
            modified: string | Buffer
        },
    ): Promise<TPushBlobData[]> {
        throw new Error('Method is unavailable in current version')
    }

    async getTreePushDataOut(
        treeitems: TTreeItem[],
        blobsData: TPushBlobData[],
    ): Promise<{ tree: TTree; updated: string[]; sha1: string; sha256: string }> {
        throw new Error('Method is unavailable in current version')
    }

    async generateCommitOut(
        branch: TBranch,
        treeHash: string,
        message: string,
        branchParent?: string,
    ): Promise<{
        commitHash: string
        commitContent: string
        commitParents: { address: TAddress; version: string }[]
    }> {
        throw new Error('Method is unavailable in current version')
    }

    async updateSubtreesHashOut(tree: TTree): Promise<TTree> {
        throw new Error('Method is unavailable in current version')
    }

    async getTreeSha256Out(params: {
        mapping?: any
        items?: TTreeItem[]
    }): Promise<string> {
        throw new Error('Method is unavailable in current version')
    }

    async deployCommitOut(
        branch: string,
        commit: string,
        content: string,
        parents: { address: TAddress; version: string }[],
        treesha256: string,
        upgrade: boolean,
    ): Promise<void> {
        throw new Error('Method is unavailable in current version')
    }

    async deployTreeOut(items: TTreeItem[], wallet?: IGoshWallet): Promise<void> {
        throw new Error('Method is unavailable in current version')
    }

    async deploySnapshotOut(
        commit: string,
        treepath: string,
        content?: string | Buffer,
        wallet?: IGoshWallet,
        forceDelete?: boolean,
        isPin?: boolean,
    ): Promise<IGoshSnapshot> {
        throw new Error('Method is unavailable in current version')
    }

    async deployDiffOut(
        branch: string,
        commit: string,
        data: {
            snapshot: string
            treepath: string
            treeItem?: TTreeItem | undefined
            compressed: string
            patch: string | null
            flags: number
            hashes: { sha1: string; sha256: string }
            isGoingOnchain: boolean
            isGoingIpfs: boolean
        },
        index1: number,
        wallet?: IGoshWallet | undefined,
    ): Promise<void> {
        throw new Error('Method is unavailable in current version')
    }
}

/**
 * TODO: Move this adapter to DAO adapter
 */
class GoshSmvAdapter implements IGoshSmvAdapter {
    private dao: IGoshDao
    private client: TonClient
    private wallet?: IGoshWallet

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

    async getDetails(wallet?: IGoshWallet): Promise<TSmvDetails> {
        wallet = wallet || this.wallet
        if (!wallet) {
            throw new GoshError(EGoshError.PROFILE_UNDEFINED)
        }

        const smvBalance = await this._getLockerBalance(wallet)
        return {
            smvBalance: await this.getWalletBalance(wallet),
            smvAvailable: smvBalance.total,
            smvLocked: smvBalance.locked,
            isLockerBusy: await this._isLockerBusy(wallet),
            allowance: await this._getAuthAllowance(wallet),
        }
    }

    async getClientsCount(): Promise<number> {
        const locker = await this.getLocker()
        const { m_num_clients } = await locker.runLocal('m_num_clients', {})
        return parseInt(m_num_clients)
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
        const details = await event.runLocal('getDetails', {})

        const kind = parseInt(details.value0)
        const minimal = {
            address,
            type: { kind, name: SmvEventTypes[kind] },
            status: {
                completed: details.value1 !== null,
                accepted: !!details.value1,
            },
            time: {
                start: parseInt(details.value2) * 1000,
                finish: parseInt(details.value3) * 1000,
                finishReal: parseInt(details.value4) * 1000,
            },
            votes: {
                yes: parseInt(details.value5),
                no: parseInt(details.value6),
                yours: await this._getEventUserVotes(details.value8),
                total: parseInt(details.value7),
            },
        }

        if (!isDetailed) {
            return minimal
        }

        return {
            ...minimal,
            data: await this._getEventData(event, kind),
            reviewers: await this.getEventReviewers({ event }),
        }
    }

    async getEventReviewers(params: {
        address?: string | undefined
        event?: IGoshSmvProposal | undefined
    }): Promise<string[]> {
        const event = !params.address
            ? params.event
            : await this._getEvent(params.address)
        if (!event) {
            throw new GoshError('Event address or object should be provided')
        }

        const { reviewers } = await event.runLocal('reviewers', {})
        const wallets = Object.keys(reviewers).map((address) => {
            return new GoshWallet(this.client, address)
        })
        const usernames = await executeByChunk(
            wallets,
            MAX_PARALLEL_READ,
            async (wallet) => {
                const { value0 } = await wallet.runLocal(
                    'getWalletOwner',
                    {},
                    undefined,
                    { useCachedBoc: true },
                )
                const profile = new GoshProfile(this.client, value0)
                return await profile.getName()
            },
        )
        return usernames
    }

    async getEventVotes(params: {
        address?: TAddress
        event?: IGoshSmvProposal
    }): Promise<TSmvEventVotes> {
        const event = !params.address
            ? params.event
            : await this._getEvent(params.address)
        if (!event) {
            throw new GoshError('Event address or object should be provided')
        }

        const { platform_id } = await event.runLocal('platform_id', {})
        const { votesYes } = await event.runLocal('votesYes', {})
        const { votesNo } = await event.runLocal('votesNo', {})
        const { totalSupply } = await event.runLocal('totalSupply', {}, undefined, {
            useCachedBoc: true,
        })
        return {
            yes: parseInt(votesYes),
            no: parseInt(votesNo),
            yours: await this._getEventUserVotes(platform_id),
            total: parseInt(totalSupply),
        }
    }

    async getEventStatus(params: {
        address?: TAddress
        event?: IGoshSmvProposal
    }): Promise<TSmvEventStatus> {
        const event = !params.address
            ? params.event
            : await this._getEvent(params.address)
        if (!event) {
            throw new GoshError('Event address or object should be provided')
        }

        const { value0: isCompleted } = await event.runLocal('_isCompleted', {})
        return {
            completed: isCompleted !== null,
            accepted: !!isCompleted,
        }
    }

    async getEventTime(params: {
        address?: TAddress
        event?: IGoshSmvProposal
    }): Promise<TSmvEventTime> {
        const event = !params.address
            ? params.event
            : await this._getEvent(params.address)
        if (!event) {
            throw new GoshError('Event address or object should be provided')
        }

        const { startTime } = await event.runLocal('startTime', {}, undefined, {
            useCachedBoc: true,
        })
        const { finishTime } = await event.runLocal('finishTime', {}, undefined, {
            useCachedBoc: true,
        })
        const { realFinishTime } = await event.runLocal('realFinishTime', {}, undefined, {
            useCachedBoc: true,
        })
        return {
            start: parseInt(startTime) * 1000,
            finish: parseInt(finishTime) * 1000,
            finishReal: parseInt(realFinishTime) * 1000,
        }
    }

    async getWalletBalance(wallet: IGoshWallet): Promise<number> {
        const { m_pseudoDAOBalance } = await wallet.runLocal('m_pseudoDAOBalance', {})
        return parseInt(m_pseudoDAOBalance)
    }

    async validateProposalStart(min?: number): Promise<void> {
        if (!this.wallet) {
            throw new GoshError(EGoshError.PROFILE_UNDEFINED)
        }
        if (await this._isLockerBusy()) {
            throw new GoshError(EGoshError.SMV_LOCKER_BUSY)
        }

        min = min ?? 20
        if (min === 0) {
            return
        }

        // Convert regular tokens to voting
        const { total, locked } = await this._getLockerBalance()
        if (total >= min || locked >= min) {
            return
        }

        const allowance = await this._getAuthAllowance()
        if (allowance < min) {
            throw new GoshError('Allowance too low to start proposal', {
                yours: allowance,
                min,
            })
        }

        const regular = await this.getWalletBalance(this.wallet)
        if (regular >= min - total) {
            await this.transferToSmv(0)
            const check = await whileFinite(async () => {
                const { total } = await this._getLockerBalance()
                if (total >= min!) {
                    return true
                }
            })
            if (!check) {
                throw new GoshError('Topup for start proposal failed')
            }
            return
        }

        throw new GoshError(EGoshError.SMV_NO_BALANCE)
    }

    async transferToSmv(amount: number): Promise<void> {
        if (!this.wallet) {
            throw new GoshError(EGoshError.PROFILE_UNDEFINED)
        }
        if (await this._isLockerBusy()) {
            throw new GoshError(EGoshError.SMV_LOCKER_BUSY)
        }
        await this.wallet.run('lockVoting', { amount })
    }

    async transferToWallet(amount: number): Promise<void> {
        if (!this.wallet) {
            throw new GoshError(EGoshError.PROFILE_UNDEFINED)
        }
        if (await this._isLockerBusy()) {
            throw new GoshError(EGoshError.SMV_LOCKER_BUSY)
        }
        await this.wallet.run('unlockVoting', { amount })
    }

    async releaseAll(): Promise<void> {
        if (!this.wallet) {
            throw new GoshError(EGoshError.PROFILE_UNDEFINED)
        }
        if (await this._isLockerBusy()) {
            throw new GoshError(EGoshError.SMV_LOCKER_BUSY)
        }

        const balance = await this.wallet.account.getBalance()
        if (parseInt(balance, 16) > 5000 * 10 ** 9) {
            await this.wallet.run('updateHead', {})
        }
    }

    async vote(
        event: TAddress,
        choice: boolean,
        amount: number,
        note?: string,
    ): Promise<void> {
        if (!this.wallet) {
            throw new GoshError(EGoshError.PROFILE_UNDEFINED)
        }
        if (await this._isLockerBusy()) {
            throw new GoshError(EGoshError.SMV_LOCKER_BUSY)
        }

        const instance = await this._getEvent(event)
        const { platform_id } = await instance.runLocal('platform_id', {})

        // Check available balance and convert regular tokens to voting if needed
        const allowance = await this._getAuthAllowance()
        if (allowance < amount) {
            throw new GoshError('Allowance is less than amount', {
                allowance,
                amount,
            })
        }

        const votesIn = await this._getEventUserVotes(platform_id)
        const { total } = await this._getLockerBalance()
        const voting = total - votesIn
        if (voting < amount) {
            const regular = await this.getWalletBalance(this.wallet)
            const delta = amount - voting
            if (regular < delta) {
                throw new GoshError('Not enough tokens to vote')
            }

            await this.transferToSmv(delta)
            const check = await whileFinite(async () => {
                const { total } = await this._getLockerBalance()
                if (total >= amount) {
                    return true
                }
            })
            if (!check) {
                throw new GoshError('Topup voting tokens failed')
            }
        }

        await this.wallet.run('voteFor', {
            platform_id,
            choice,
            amount,
            note: note ?? '',
            num_clients: await this.getClientsCount(),
        })
    }

    private async _getAuthAllowance(wallet?: IGoshWallet) {
        wallet = wallet || this.wallet
        if (!wallet) {
            return 0
        }
        const { value0 } = await this.dao.runLocal('getWalletsToken', {})
        const member = value0.find((item: any) => item.member === wallet!.address)
        return member ? parseInt(member.count) : 0
    }

    private async _isLockerBusy(wallet?: IGoshWallet): Promise<boolean> {
        const locker = await this.getLocker(wallet)
        const { lockerBusy } = await locker.runLocal('lockerBusy', {})
        return lockerBusy
    }

    private async _getLockerAddress(wallet?: IGoshWallet): Promise<TAddress> {
        wallet = wallet || this.wallet
        if (!wallet) {
            throw new GoshError(EGoshError.PROFILE_UNDEFINED)
        }
        const { tip3VotingLocker } = await wallet.runLocal('tip3VotingLocker', {})
        return tip3VotingLocker
    }

    async getLocker(wallet?: IGoshWallet): Promise<IGoshSmvLocker> {
        const address = await this._getLockerAddress(wallet)
        return new GoshSmvLocker(this.client, address)
    }

    private async _getLockerBalance(
        wallet?: IGoshWallet,
    ): Promise<{ total: number; locked: number }> {
        const locker = await this.getLocker(wallet)
        const { m_tokenBalance } = await locker.runLocal('m_tokenBalance', {})
        const { votes_locked } = await locker.runLocal('votes_locked', {})
        return { total: parseInt(m_tokenBalance), locked: parseInt(votes_locked) }
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
        } else if (type === ESmvEventType.PULL_REQUEST) {
            fn = 'getGoshSetCommitProposalParams'
        } else if (type === ESmvEventType.DAO_CONFIG_CHANGE) {
            fn = 'getGoshSetConfigDaoProposalParams'
        } else if (type === ESmvEventType.TASK_DELETE) {
            fn = 'getGoshDestroyTaskProposalParams'
        } else if (type === ESmvEventType.TASK_CREATE) {
            fn = 'getGoshDeployTaskProposalParams'
        } else if (type === ESmvEventType.REPO_CREATE) {
            fn = 'getGoshDeployRepoProposalParams'
        } else if (type === ESmvEventType.DAO_TOKEN_VOTING_ADD) {
            fn = 'getGoshAddVoteTokenProposalParams'
        } else if (type === ESmvEventType.DAO_TOKEN_REGULAR_ADD) {
            fn = 'getGoshAddRegularTokenProposalParams'
        } else if (type === ESmvEventType.DAO_TOKEN_MINT) {
            fn = 'getGoshMintTokenProposalParams'
        } else if (type === ESmvEventType.DAO_TAG_ADD) {
            fn = 'getGoshDaoTagProposalParams'
        } else if (type === ESmvEventType.DAO_TAG_REMOVE) {
            fn = 'getGoshDaoTagProposalParams'
        } else if (type === ESmvEventType.DAO_TOKEN_MINT_DISABLE) {
            fn = 'getNotAllowMintProposalParams'
        } else if (type === ESmvEventType.DAO_ALLOWANCE_CHANGE) {
            fn = 'getChangeAllowanceProposalParams'
        } else if (type === ESmvEventType.REPO_TAG_ADD) {
            fn = 'getGoshRepoTagProposalParams'
        } else if (type === ESmvEventType.REPO_TAG_REMOVE) {
            fn = 'getGoshRepoTagProposalParams'
        } else if (type === ESmvEventType.REPO_UPDATE_DESCRIPTION) {
            fn = 'getChangeDescriptionProposalParams'
        } else if (type === ESmvEventType.DAO_EVENT_HIDE_PROGRESS) {
            fn = 'getChangeHideVotingResultProposalParams'
        } else if (type === ESmvEventType.DAO_EVENT_ALLOW_DISCUSSION) {
            fn = 'getChangeAllowDiscussionProposalParams'
        } else if (type === ESmvEventType.DAO_ASK_MEMBERSHIP_ALLOWANCE) {
            fn = 'getAbilityInviteProposalParams'
        } else if (type === ESmvEventType.MULTI_PROPOSAL) {
            const { num, data0 } = await event.runLocal('getDataFirst', {}, undefined, {
                useCachedBoc: true,
            })
            const count = parseInt(num)
            const items = []

            let rest = data0
            for (let i = 0; i < count; i++) {
                const { data1: curr, data2: next } = await event.runLocal(
                    'getHalfData',
                    { Data: rest },
                    undefined,
                    { useCachedBoc: true },
                )
                items.push(await this._getMultiEventData(event, curr))

                if (i === count - 2) {
                    items.push(await this._getMultiEventData(event, next))
                    break
                }
                rest = next
                await sleep(300)
            }

            return { details: null, items }
        } else {
            throw new GoshError(`Event type "${type}" is unknown`)
        }

        const decoded = await event.runLocal(fn, {}, undefined, { useCachedBoc: true })
        delete decoded.proposalKind
        return decoded
    }

    private async _getMultiEventData(event: IGoshSmvProposal, data: string) {
        const { proposalKind } = await event.runLocal(
            'getGoshProposalKindData',
            { Data: data },
            undefined,
            { useCachedBoc: true },
        )
        const kind = parseInt(proposalKind)
        const type = { kind, name: SmvEventTypes[kind] }

        let fn = ''
        if (kind === ESmvEventType.REPO_CREATE) {
            fn = 'getGoshDeployRepoProposalParamsData'
        } else if (kind === ESmvEventType.BRANCH_LOCK) {
            fn = 'getGoshAddProtectedBranchProposalParamsData'
        } else if (kind === ESmvEventType.BRANCH_UNLOCK) {
            fn = 'getGoshDeleteProtectedBranchProposalParamsData'
        } else if (kind === ESmvEventType.DAO_MEMBER_ADD) {
            fn = 'getGoshDeployWalletDaoProposalParamsData'
        } else if (kind === ESmvEventType.DAO_MEMBER_DELETE) {
            fn = 'getGoshDeleteWalletDaoProposalParamsData'
        } else if (kind === ESmvEventType.DAO_UPGRADE) {
            fn = 'getGoshUpgradeDaoProposalParamsData'
        } else if (kind === ESmvEventType.TASK_CREATE) {
            fn = 'getGoshDeployTaskProposalParamsData'
        } else if (kind === ESmvEventType.TASK_DELETE) {
            fn = 'getGoshDestroyTaskProposalParamsData'
        } else if (kind === ESmvEventType.DAO_TOKEN_VOTING_ADD) {
            fn = 'getGoshAddVoteTokenProposalParamsData'
        } else if (kind === ESmvEventType.DAO_TOKEN_REGULAR_ADD) {
            fn = 'getGoshAddRegularTokenProposalParamsData'
        } else if (kind === ESmvEventType.DAO_TOKEN_MINT) {
            fn = 'getGoshMintTokenProposalParamsData'
        } else if (kind === ESmvEventType.DAO_TAG_ADD) {
            fn = 'getGoshDaoTagProposalParamsData'
        } else if (kind === ESmvEventType.DAO_TAG_REMOVE) {
            fn = 'getGoshDaoTagProposalParamsData'
        } else if (kind === ESmvEventType.DAO_TOKEN_MINT_DISABLE) {
            fn = 'getNotAllowMintProposalParamsData'
        } else if (kind === ESmvEventType.DAO_ALLOWANCE_CHANGE) {
            fn = 'getChangeAllowanceProposalParamsData'
        } else if (kind === ESmvEventType.REPO_TAG_ADD) {
            fn = 'getGoshRepoTagProposalParamsData'
        } else if (kind === ESmvEventType.REPO_TAG_REMOVE) {
            fn = 'getGoshRepoTagProposalParamsData'
        } else if (kind === ESmvEventType.REPO_UPDATE_DESCRIPTION) {
            fn = 'getChangeDescriptionProposalParamsData'
        } else if (kind === ESmvEventType.DAO_EVENT_ALLOW_DISCUSSION) {
            fn = 'getChangeAllowDiscussionProposalParamsData'
        } else if (kind === ESmvEventType.DAO_EVENT_HIDE_PROGRESS) {
            fn = 'getChangeHideVotingResultProposalParamsData'
        } else if (kind === ESmvEventType.REPO_TAG_UPGRADE) {
            fn = 'getTagUpgradeProposalParamsData'
        } else if (kind === ESmvEventType.DAO_ASK_MEMBERSHIP_ALLOWANCE) {
            fn = 'getAbilityInviteProposalParamsData'
        } else {
            throw new GoshError(`Multi event type "${type}" is unknown`)
        }

        const decoded = await event.runLocal(fn, { Data: data }, undefined, {
            useCachedBoc: true,
        })
        delete decoded.proposalKind
        return { type, ...decoded }
    }

    private async _getEventUserVotes(platformId: string): Promise<number> {
        if (!this.wallet) {
            return 0
        }
        if (!(await this.wallet.isDeployed())) {
            return 0
        }

        const { value0 } = await this.wallet.runLocal('clientAddressForProposal', {
            _tip3VotingLocker: await this._getLockerAddress(),
            _platform_id: platformId,
        })
        const client = new GoshSmvClient(this.client, value0)
        if (!(await client.isDeployed())) {
            return 0
        }

        const { value0: locked } = await client.runLocal('amount_locked', {})
        return parseInt(locked)
    }
}

export { GoshAdapter_2_0_0 }
