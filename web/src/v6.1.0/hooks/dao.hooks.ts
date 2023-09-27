import { useCallback, useEffect, useState } from 'react'
import _, { sum } from 'lodash'
import { useProfile, useUser } from './user.hooks'
import { EGoshError, GoshError } from '../../errors'
import { AppConfig } from '../../appconfig'
import { getSystemContract } from '../blockchain/helpers'
import { supabase } from '../../supabase'
import { Buffer } from 'buffer'
import {
    executeByChunk,
    setLockableInterval,
    sleep,
    splitByChunk,
    whileFinite,
} from '../../utils'
import {
    DAO_TOKEN_TRANSFER_TAG,
    DISABLED_VERSIONS,
    MAX_PARALLEL_READ,
    MAX_PARALLEL_WRITE,
    PARTNER_DAO_NAMES,
    MILESTONE_TAG,
    MILESTONE_TASK_TAG,
    SYSTEM_TAG,
} from '../../constants'
import { useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil'
import {
    daoDetailsSelector,
    daoEventListSelector,
    daoEventSelector,
    daoInviteListAtom,
    daoMemberListSelector,
    daoMemberSelector,
    daoTaskListSelector,
    daoTaskSelector,
    partnerDaoListAtom,
    userDaoListAtom,
} from '../store/dao.state'
import {
    EDaoMemberType,
    EDaoInviteStatus,
    TDaoDetailsMemberItem,
    TDaoEventDetails,
    TDaoInviteListItem,
    TDaoListItem,
    TDaoMemberListItem,
    TTaskDetails,
    TTaskGrant,
    TTaskGrantPair,
} from '../types/dao.types'
import { Dao } from '../blockchain/dao'
import { UserProfile } from '../../blockchain/userprofile'
import { DaoWallet } from '../blockchain/daowallet'
import { EDaoEventType, TToastStatus } from '../../types/common.types'
import { getAllAccounts, getPaginatedAccounts } from '../../blockchain/utils'
import { DaoEvent } from '../blockchain/daoevent'
import { GoshAdapterFactory } from 'react-gosh'
import { TSystemContract } from '../../types/blockchain.types'
import { TGoshCommitTag } from '../types/repository.types'
import { GoshRepository } from '../blockchain/repository'
import { Task } from '../blockchain/task'
import { AggregationFn } from '@eversdk/core'
import { SystemContract } from '../blockchain/systemcontract'
import { appContextAtom, appToastStatusSelector } from '../../store/app.state'
import { Milestone } from '../blockchain/milestone'
import { getGrantMapping } from '../components/Task'

export function usePartnerDaoList(params: { initialize?: boolean } = {}) {
    const { initialize } = params
    const [data, setData] = useRecoilState(partnerDaoListAtom)

    const getDaoList = useCallback(async () => {
        try {
            setData((state) => ({ ...state, isFetching: true }))

            const items: TDaoListItem[] = []
            for (const ver of Object.keys(AppConfig.getVersions({ reverse: true }))) {
                const sc = AppConfig.goshroot.getSystemContract(ver)
                await Promise.all(
                    PARTNER_DAO_NAMES.map(async (name) => {
                        const account = (await sc.getDao({ name })) as Dao
                        if (await account.isDeployed()) {
                            const members = await account.getMembers({})
                            items.push({
                                account,
                                name,
                                address: account.address,
                                version: ver,
                                supply: _.sum(members.map(({ allowance }) => allowance)),
                                members: members.length,
                            })
                        }
                    }),
                )

                if (items.length === PARTNER_DAO_NAMES.length) {
                    break
                }
            }

            setData((state) => ({ ...state, items }))
        } catch (e: any) {
            setData((state) => ({ ...state, error: e }))
        } finally {
            setData((state) => ({ ...state, isFetching: false }))
        }
    }, [])

    useEffect(() => {
        if (initialize && PARTNER_DAO_NAMES.length) {
            getDaoList()
        }
    }, [initialize, getDaoList])

    return {
        ...data,
        items: [...data.items].sort((a, b) => (a.name > b.name ? 1 : -1)),
        isEmpty: !data.isFetching && !data.items.length,
    }
}

export function useCreateDao() {
    const profile = useProfile()
    const { user } = useUser()
    const setUserDaoList = useSetRecoilState(userDaoListAtom)
    const [status, setStatus] = useRecoilState(appToastStatusSelector('__createdao'))

    const createDao = async (params: {
        name: string
        tags: string[]
        supply: number
        isMintOn: boolean
        description?: string
    }) => {
        const { name, tags, supply, isMintOn, description } = params

        try {
            const sc = getSystemContract()

            if (!profile || !user.keys) {
                throw new GoshError('Access error', {
                    message: 'You might not be authenticated',
                })
            }

            // Create DAO
            setStatus((state) => ({ ...state, type: 'pending', data: 'Create DAO' }))
            const dao = (await profile.createDao(sc, name, [profile.address])) as Dao
            const version = await dao.getVersion()

            // Authorize DAO wallet
            setStatus((state) => ({ ...state, type: 'pending', data: 'Authorize DAO' }))
            const wallet = (await dao.getMemberWallet({
                data: { profile: profile.address },
                keys: user.keys,
            })) as DaoWallet
            await profile.turnOn(wallet.address, user.keys.public)

            // Mint tokens
            if (supply > 20) {
                setStatus((state) => ({
                    ...state,
                    type: 'pending',
                    data: 'Minting tokens',
                }))
                await wallet.mintDaoTokens({ amount: supply - 20, alone: true })
            }

            // Update minting policy
            if (!isMintOn) {
                setStatus((state) => ({
                    ...state,
                    type: 'pending',
                    data: 'Disable minting',
                }))
                await wallet.disableMintDaoTokens({ alone: true })
            }

            // Create DAO tags
            if (tags.length) {
                setStatus((state) => ({
                    ...state,
                    type: 'pending',
                    data: 'Create DAO tags',
                }))
                await wallet.createDaoTag({ tags, alone: true })
            }

            // Create DAO system repository
            setStatus((state) => ({
                ...state,
                type: 'pending',
                data: 'Create DAO system repository',
            }))
            const repository = (await sc.getRepository({
                path: `${name}/_index`,
            })) as GoshRepository
            await wallet.createRepository({
                name: '_index',
                description: 'DAO system repository',
                alone: true,
            })
            const wait = await whileFinite(async () => {
                return await repository.isDeployed()
            })
            if (!wait) {
                throw new GoshError(
                    'Timeout error',
                    'Create DAO reposirory timeout reached',
                )
            }

            // Push description blob to DAO service repository
            if (description) {
                setStatus((state) => ({
                    ...state,
                    type: 'pending',
                    data: 'Update DAO description',
                }))
                // TODO: Update this part after git part refactor
                const _gosh = GoshAdapterFactory.create(version)
                await _gosh.setAuth(user.username!, user.keys)
                const _dao = await _gosh.getDao({ address: dao.address, useAuth: true })
                const _repo = await _dao.getRepository({ address: repository.address })
                const blobs = [
                    {
                        treepath: ['', 'description.txt'],
                        original: '',
                        modified: description,
                    },
                ]
                await _repo.push('main', blobs, 'Initial commit', false, {})
                // TODO: /Update this part after git part refactor
            }

            // Set upgrade repos flag
            setStatus((state) => ({
                ...state,
                type: 'pending',
                data: 'Update DAO flags',
            }))
            await wallet.setRepositoriesUpgraded()

            setStatus((state) => ({
                ...state,
                type: 'success',
                data: { title: 'Create DAO', content: 'DAO created' },
            }))
            setUserDaoList((state) => ({
                ...state,
                items: [
                    {
                        account: dao as Dao,
                        address: dao.address,
                        name,
                        version,
                        supply,
                        members: 1,
                    },
                    ...state.items,
                ],
            }))
        } catch (e: any) {
            setStatus((state) => ({ ...state, type: 'error', data: e }))
            throw e
        }
    }

    return { createDao, status }
}

export function useUserDaoList(params: { count?: number; initialize?: boolean } = {}) {
    const { count = 10, initialize } = params
    const { user } = useUser()
    const profile = useProfile()
    const [data, setData] = useRecoilState(userDaoListAtom)

    const getOnboardingItems = async (username: string) => {
        const { data, error } = await supabase.client
            .from('users')
            .select(`*, github (updated_at, gosh_url)`)
            .eq('gosh_username', username)
            .not('auth_user', 'is', null)
        if (error) {
            throw new GoshError('Get onboarding data', error.message)
        }
        if (!data?.length) {
            return []
        }

        const imported: { [name: string]: string[] } = {}
        for (const item of data[0].github) {
            if (item.updated_at) {
                continue
            }

            const splitted = item.gosh_url.split('/')
            const dao = splitted[splitted.length - 2]
            const repo = splitted[splitted.length - 1]
            if (Object.keys(imported).indexOf(dao) < 0) {
                imported[dao] = []
            }
            if (imported[dao].indexOf(repo) < 0) {
                imported[dao].push(repo)
            }
        }

        return Object.keys(imported).map((key) => ({
            name: key,
            repos: imported[key],
        }))
    }

    const getBlockchainItems = async (params: {
        profile: UserProfile
        limit: number
        cursor?: string
        _items?: TDaoListItem[]
    }): Promise<{ items: TDaoListItem[]; cursor?: string; hasNext?: boolean }> => {
        const { profile, limit, cursor, _items = [] } = params
        const {
            messages,
            cursor: _cursor,
            hasNext,
        } = await profile.getMessages(
            {
                msgType: ['IntIn'],
                node: ['created_at'],
                cursor,
                allow_latest_inconsistent_data: true,
            },
            true,
        )

        const items = await executeByChunk(
            messages.filter(({ decoded }) => {
                if (!decoded) {
                    return false
                }
                const { name, value } = decoded
                return name === 'deployedWallet' && parseInt(value.index) === 0
            }),
            MAX_PARALLEL_READ,
            async ({ decoded }) => {
                const { goshdao, ver } = decoded.value
                const sc = AppConfig.goshroot.getSystemContract(ver)
                const account = (await sc.getDao({ address: goshdao })) as Dao
                const members = await account.getMembers({})
                return {
                    account,
                    name: await account.getName(),
                    address: goshdao,
                    version: ver,
                    supply: _.sum(members.map(({ allowance }) => allowance)),
                    members: members.length,
                }
            },
        )

        // Avoid duplicates of the same DAO by unique name
        for (const item of items) {
            if (_items.findIndex((_item) => _item.name === item.name) < 0) {
                _items.push(item)
            }
        }

        if (_items.length < limit && hasNext) {
            return await getBlockchainItems({ profile, limit, cursor: _cursor, _items })
        }
        return { items: _items, cursor: _cursor, hasNext }
    }

    const getNext = useCallback(async () => {
        try {
            setData((state) => ({ ...state, isFetching: true }))
            const blockchain = await getBlockchainItems({
                profile: profile!,
                limit: data.items.length + count,
                cursor: data.cursor,
                _items: [...data.items],
            })
            setData((state) => ({
                ...state,
                items: blockchain.items,
                cursor: blockchain.cursor,
                hasNext: blockchain.hasNext,
            }))
        } catch (e: any) {
            throw e
        } finally {
            setData((state) => ({ ...state, isFetching: false }))
        }
    }, [profile, data.cursor])

    const getUserDaoList = useCallback(async () => {
        try {
            setData((state) => ({ ...state, isFetching: true }))
            if (!profile || !user.username) {
                throw new GoshError(EGoshError.PROFILE_UNDEFINED)
            }

            // Get onboarding items
            const onboarding = (await getOnboardingItems(user.username)).map((item) => ({
                account: null,
                name: item.name,
                address: '',
                version: '',
                supply: -1,
                members: -1,
                onboarding: item.repos,
            }))

            /**
             * Get blockchain items
             * If there are items in state limit should be
             * equal to `items.length` otherwise `count` per page
             */
            const blockchain = await getBlockchainItems({
                profile,
                limit: data.items.length || count,
            })

            // Compose all items together
            const different = _.differenceWith(onboarding, blockchain.items, (a, b) => {
                return a.name === b.name
            })
            const composed = [
                ...different,
                ...blockchain.items.map((item) => {
                    const gh = onboarding.find((ghitem) => ghitem.name === item.name)
                    if (gh) {
                        return { ...item, onboarding: gh.onboarding }
                    }
                    return item
                }),
            ]

            // Update state
            setData((state) => {
                const different = _.differenceWith(composed, state.items, (a, b) => {
                    return a.name === b.name
                })
                const intersect = _.intersectionWith(composed, state.items, (a, b) => {
                    return a.name === b.name
                })
                return {
                    ...state,
                    items: [...state.items, ...different].map((item) => {
                        const found = intersect.find((_item) => _item.name === item.name)
                        return found || item
                    }),
                    cursor: blockchain.cursor,
                    hasNext: blockchain.hasNext,
                }
            })
        } catch (e: any) {
            setData((state) => ({ ...state, error: e }))
        } finally {
            setData((state) => ({ ...state, isFetching: false }))
        }
    }, [profile])

    useEffect(() => {
        if (initialize) {
            getUserDaoList()
        }
    }, [getUserDaoList, initialize])

    return {
        ...data,
        items: [...data.items].sort((a, b) => (a.name > b.name ? 1 : -1)),
        isEmpty: !data.isFetching && !data.items.length,
        getNext,
    }
}

export function useDao(params: { initialize?: boolean; subscribe?: boolean } = {}) {
    const { initialize, subscribe } = params
    const { daoname } = useRecoilValue(appContextAtom)
    const [data, setData] = useRecoilState(daoDetailsSelector(daoname))

    const getDao = useCallback(async () => {
        try {
            if (!daoname) {
                return
            }

            setData((state) => ({ ...state, isFetching: true }))
            const sc = getSystemContract()
            const dao = await sc.getDao({ name: daoname })
            if (!(await dao.isDeployed())) {
                throw new GoshError('DAO does not exist', { name: daoname })
            }
            const version = await dao.getVersion()
            const repository = await sc.getRepository({
                path: `${daoname}/_index`,
            })

            // TODO: Remove this after git part refactor
            const _gosh = GoshAdapterFactory.create(version)
            const _adapter = await _gosh.getDao({ address: dao.address })
            // TODO: /Remove this after git part refactor

            setData((state) => ({
                ...state,
                details: {
                    ...state.details,
                    account: dao as Dao,
                    _adapter,
                    name: daoname,
                    address: dao.address,
                    version,
                    repository,
                },
                error: undefined,
            }))
            getDetailsSubscription(dao)
            getDetailsInterval({ dao, repository })
        } catch (e) {
            setData((state) => ({ ...state, error: e }))
            throw e
        } finally {
            setData((state) => ({ ...state, isFetching: false }))
        }
    }, [daoname])

    const getDetailsSubscription = async (dao: Dao) => {
        try {
            setData((state) => ({ ...state, isFetchingData: true }))

            const details = await dao.getDetails()
            const members = await dao.getMembers({
                parse: { wallets: details.wallets, daomembers: details.daoMembers },
            })
            const isMemberOf = await dao.getMembers({
                parse: { wallets: details.my_wallets, daomembers: {} },
                isDaoMemberOf: true,
            })

            setData((state) => {
                const membersCurrent = state.details.members || []
                const membersDifferent = _.differenceWith(
                    members,
                    state.details.members || [],
                    (a, b) => a.profile.address === b.profile.address,
                )
                const membersIntersect = _.intersectionWith(
                    members,
                    state.details.members || [],
                    (a, b) => a.profile.address === b.profile.address,
                )

                return {
                    ...state,
                    details: {
                        ...state.details,
                        members: [...membersCurrent, ...membersDifferent].map((item) => {
                            const found = membersIntersect.find((_item) => {
                                return _item.profile.address === item.profile.address
                            })
                            return found ? { ...item, ...found } : item
                        }),
                        supply: {
                            reserve: parseInt(details.reserve),
                            voting: parseInt(details.allbalance),
                            total: parseInt(details.totalsupply),
                        },
                        owner: details.pubaddr,
                        tags: Object.values(details.hashtag),
                        isMemberOf,
                        isMintOn: details.allowMint,
                        isAskMembershipOn: details.abilityInvite,
                        isEventDiscussionOn: details.allow_discussion_on_proposals,
                        isEventProgressOn: !details.hide_voting_results,
                        isRepoUpgraded: details.isRepoUpgraded,
                        isTaskUpgraded: details.isTaskUpgraded,
                        isUpgraded: details.isRepoUpgraded && details.isTaskUpgraded,
                        isReady: details.isUpgraded,
                    },
                }
            })
        } catch (e: any) {
            console.error(e.message)
        } finally {
            setData((state) => ({ ...state, isFetchingData: false }))
        }
    }

    const getDetailsInterval = async (params: {
        dao: Dao
        repository: GoshRepository
    }) => {
        const { dao, repository } = params

        try {
            setData((state) => ({ ...state, isFetchingData: true }))

            const name = await dao.getName()
            const tasks = await getTaskCount(dao)
            const { summary, description } = await getDescription(name, repository)

            setData((state) => ({
                ...state,
                details: { ...state.details, tasks, summary, description },
            }))
        } catch (e: any) {
            console.error(e.message)
        } finally {
            setData((state) => ({ ...state, isFetchingData: false }))
        }
    }

    const getDescription = async (daoname: string, repository: GoshRepository) => {
        if (!(await repository.isDeployed())) {
            return { summary: '', description: '' }
        }

        // Get DAO description
        const { commit } = await repository.getBranch('main')
        const repover = await repository.getVersion()
        if (commit.version !== repover) {
            const reponame = await repository.getName()
            repository = (await AppConfig.goshroot
                .getSystemContract(commit.version)
                .getRepository({ path: `${daoname}/${reponame}` })) as GoshRepository
        }

        // TODO: Remove/refactor this after git part refactored
        const _commitacc = await repository.getCommit({ address: commit.address })
        const _commit = await _commitacc.getDetails()
        const _sc = GoshAdapterFactory.create(commit.version)
        const _adapter = await _sc.getRepository({ address: repository.address })
        const _tree = await _adapter.getTree(_commit.name, '')
        // TODO: /Remove/refactor this after git part refactored

        // TODO: Refactor this after git part refactored
        const [summary, description] = await Promise.all(
            ['description.txt', 'README.md'].map(async (filename) => {
                if (commit.version < '6.0.0') {
                    const snapshot = await repository.getSnapshot({
                        data: { branch: 'main', filename, commitname: '' },
                    })

                    if (await snapshot.isDeployed()) {
                        const result = await snapshot.getContent()
                        if (!Buffer.isBuffer(result.content)) {
                            return result.content
                        }
                    }
                } else {
                    const treeitem = _tree.items.find(
                        ({ path, name }) => `${path}/${name}` === `/${filename}`,
                    )
                    if (treeitem?.commit) {
                        const snapshot = await repository.getSnapshot({
                            data: { filename, commitname: treeitem.commit },
                        })
                        const { current } = await _adapter.getCommitBlob(
                            snapshot.address,
                            filename,
                            _commit.name,
                        )
                        if (!Buffer.isBuffer(current)) {
                            return current
                        }
                    }
                }

                return ''
            }),
        )
        return { summary, description }
    }

    const getTaskCount = async (dao: Dao) => {
        const sc = getSystemContract()
        const codes = [
            await sc.getDaoTaskTagCodeHash(dao.address, SYSTEM_TAG),
            await sc.getDaoTaskTagCodeHash(dao.address, MILESTONE_TAG),
            await sc.getDaoTaskTagCodeHash(dao.address, MILESTONE_TASK_TAG),
        ]
        const { values } = await dao.account.client.net.aggregate_collection({
            collection: 'accounts',
            filter: { code_hash: { in: codes } },
            fields: [{ field: 'id', fn: AggregationFn.COUNT }],
        })
        return parseInt(values[0])
    }

    const getMembersVesting = async (dao: Dao) => {
        const sc = getSystemContract()
        const codes = [
            await sc.getDaoTaskTagCodeHash(dao.address, SYSTEM_TAG),
            await sc.getDaoTaskTagCodeHash(dao.address, MILESTONE_TAG),
            await sc.getDaoTaskTagCodeHash(dao.address, MILESTONE_TASK_TAG),
        ]
        const result = await getAllAccounts({
            filters: [`code_hash: {in: ${JSON.stringify(codes)}}`],
            result: ['code_hash'],
        })
        const tasks = await executeByChunk(result, 30, async ({ id, code_hash }) => {
            const tag = await sc.getGoshTag({ address: id })
            const data = await tag.getDetails()

            const isMilestone = code_hash === codes[1]
            const task = isMilestone
                ? await sc.getMilestone({ address: data.task })
                : await sc.getTask({ address: data.task })
            return await task.getRawDetails()
        })

        const mapping: { [profile: string]: number } = {}
        for (const task of tasks) {
            if (task.candidates.length === 0) {
                continue
            }

            for (const key of ['assign', 'review', 'manager']) {
                const profiles = Object.keys(task.candidates[0][`pubaddr${key}`])
                for (const profile of profiles) {
                    if (Object.keys(mapping).indexOf(profile) < 0) {
                        mapping[profile] = 0
                    }
                    for (const { grant } of task.grant[key]) {
                        mapping[profile] += Math.floor(parseInt(grant) / profiles.length)
                    }
                }
            }
        }

        setData((state) => ({
            ...state,
            details: {
                ...state.details,
                members: state.details.members?.map((item) => {
                    return { ...item, vesting: mapping[item.profile.address] }
                }),
            },
        }))
    }

    useEffect(() => {
        if (initialize) {
            getDao()
        }
    }, [getDao, initialize])

    useEffect(() => {
        if (!subscribe || !data.details.address) {
            return
        }

        // Subscribe for DAO incoming messages
        const triggers = [
            'addRegularTokenPub',
            'addVoteTokenPub',
            'addVoteTokenPub3',
            'calculateBalanceManager',
            'changeAllowDiscussion',
            'changeAllowanceIn',
            'changeAllowanceIn2',
            'changeHideVotingResult',
            'deleteWallet',
            'deployWallets',
            'deployedWallet',
            'destroyedWallet',
            'isAlone',
            'mintReserve',
            'receiveTokentoReserve',
            'redeployedTask',
            'returnAllowance',
            'returnTaskToken',
            'returnTaskTokenBig',
            'returnWalletsVersion',
            'returnWalletsVersionv4',
            'setAbilityInvite',
            'setRepoUpgraded',
            'smvdeploytag',
            'smvdeploytagin',
            'smvdestroytag',
            'smvnotallowmint',
        ]
        data.details.account?.account.subscribeMessages(
            'msg_type body',
            async (message) => {
                const decoded = await data.details.account?.decodeMessageBody(
                    message.body,
                    message.msg_type,
                )
                if (decoded && triggers.indexOf(decoded.name) >= 0) {
                    await getDetailsSubscription(data.details.account!)
                }
            },
        )

        // Updates by interval
        const interval = setLockableInterval(async () => {
            await getDetailsInterval({
                dao: data.details.account!,
                repository: data.details.repository!,
            })
        }, 15000)

        return () => {
            clearInterval(interval)
            data.details.account?.account.free()
        }
    }, [subscribe, data.details.address])

    useEffect(() => {
        if (subscribe && data.details.address) {
            getMembersVesting(data.details.account!)
        }
    }, [subscribe, data.details.address, data.details.tasks])

    return data
}

export function useDaoMember(params: { initialize?: boolean; subscribe?: boolean } = {}) {
    const { initialize, subscribe } = params
    const { user } = useUser()
    const { details: dao } = useDao()
    const [data, setData] = useRecoilState(daoMemberSelector(dao.name))
    const [_wallet, _setWallet] = useState<DaoWallet | null>(null)
    const setStatus0 = useSetRecoilState(appToastStatusSelector('__activatedaowallet'))
    const setStatus1 = useSetRecoilState(
        appToastStatusSelector('__transferprevdaotokens'),
    )
    const setStatus2 = useSetRecoilState(appToastStatusSelector('__waitdaoready'))

    const activate = async (profile: UserProfile, wallet: DaoWallet) => {
        try {
            // Deploy limited wallet
            if (!(await wallet.isDeployed())) {
                setStatus0((state) => ({
                    ...state,
                    type: 'pending',
                    data: 'Create DAO wallet',
                }))

                await dao.account!.createLimitedWallet(profile.address)
                const wait = await whileFinite(async () => {
                    return await wallet.isDeployed()
                })
                if (!wait) {
                    throw new GoshError(
                        'Timeout error',
                        'Create DAO wallet timeout reached',
                    )
                }
            }

            // Activate wallet
            if (!(await wallet.isTurnedOn())) {
                setStatus0((state) => ({
                    ...state,
                    type: 'pending',
                    data: 'Activating DAO wallet',
                }))
                await profile.turnOn(wallet.address, user.keys!.public)
            }

            setStatus0((state) => ({ ...state, type: 'dismiss' }))
            setData((state) => ({ ...state, wallet, isReady: true }))
        } catch (e: any) {
            setStatus0((state) => ({
                ...state,
                type: 'error',
                data: new GoshError('Activate account failed', {
                    message: e.message,
                    retry: 'Retrying after 15s',
                }),
            }))
            setTimeout(activate, 15000)
        }
    }

    const getDetails = useCallback(async () => {
        if (!data.isReady || !data.wallet) {
            return
        }

        try {
            const balance = await data.wallet.getBalance()
            const limited = await data.wallet.isLimited()
            setData((state) => ({
                ...state,
                balance,
                allowance: balance.allowance,
                isLimited: limited,
            }))
        } catch (e: any) {
            console.error(e.message)
        }
    }, [data.isReady])

    const getBaseDetails = useCallback(async () => {
        if (!dao.members?.length || !dao.account) {
            return
        }
        if (!user.profile) {
            setData((state) => ({ ...state, isFetched: true }))
            return
        }

        const client = getSystemContract().client
        const found = dao.members.find(({ profile }) => profile.address === user.profile)
        const wallet = await dao.account.getMemberWallet({
            data: { profile: user.profile },
            keys: user.keys,
        })
        const walletDeployed = await wallet.isDeployed()
        const profile = new UserProfile(client, user.profile!, user.keys)
        _setWallet(wallet)
        setData((state) => ({
            ...state,
            profile,
            wallet: walletDeployed ? wallet : null,
            allowance: found?.allowance || 0,
            isMember: !!found,
            isFetched: true,
        }))
    }, [user.profile, dao.members?.length, dao.address])

    const transferTokensFromPrevDao = useCallback(async () => {
        if (
            !dao.name ||
            !dao.version ||
            !dao.account ||
            !user.profile ||
            !user.keys ||
            !data.isReady
        ) {
            return { retry: false }
        }

        // Extra check for member DAO wallet to be deployed
        // `data.details.isReady` checks it, but check twice better
        if (!data.wallet?.isDeployed()) {
            return { retry: false }
        }

        const sc = getSystemContract()
        const tagname = `${DAO_TOKEN_TRANSFER_TAG}:${user.username}`

        // Check if stoptag exists
        const stoptag = await sc.getCommitTag({
            data: { daoname: dao.name, reponame: DAO_TOKEN_TRANSFER_TAG, tagname },
        })
        if (await stoptag.isDeployed()) {
            return { retry: false }
        }

        // Go by prev DAO one by one and calculate untransferred balances
        setStatus1((state) => ({
            ...state,
            type: 'pending',
            data: 'Transferring tokens',
        }))
        const transfer: { wallet: DaoWallet; amount: number }[] = []
        let daoaddrPrev = await dao.account.getPrevious()
        while (daoaddrPrev) {
            let daoPrev = await sc.getDao({ address: daoaddrPrev })
            const daoverPrev = await daoPrev.getVersion()
            if (daoverPrev === '1.0.0') {
                break
            }

            const scPrev = AppConfig.goshroot.getSystemContract(daoverPrev)
            daoPrev = (await scPrev.getDao({ address: daoPrev.address })) as Dao
            const walletPrev = await daoPrev.getMemberWallet({
                data: { profile: user.profile },
                keys: user.keys,
            })

            if (await walletPrev.isDeployed()) {
                const { voting, locked, regular } = await walletPrev.getBalance()
                const untransferred = Math.max(voting, locked) + regular
                if (untransferred > 0) {
                    transfer.push({ wallet: walletPrev, amount: untransferred })
                }
            }

            daoaddrPrev = await daoPrev.getPrevious()
        }

        // Transfer tokens to current DAO
        await Promise.all(
            transfer.map(async ({ wallet, amount }) => {
                await wallet.smvReleaseTokens()
                await wallet.smvUnlockTokens(0)

                await wallet.sendTokensToUpgradedDao(amount, dao.version!)
                await sleep(10000)
                await wallet.sendTokensToUpgradedDao(amount, dao.version!)
            }),
        )

        // Deploy stop transfer tag
        if (transfer.length === 0) {
            await data.wallet.createCommitTag({
                reponame: DAO_TOKEN_TRANSFER_TAG,
                name: tagname,
                content: '',
                commit: { address: user.profile, name: user.username! },
            })
        }

        setStatus1((state) => ({ ...state, type: 'dismiss' }))
        return { retry: transfer.length > 0 }
    }, [dao.name, dao.version, user.profile, user.keys, data.isReady])

    useEffect(() => {
        if (initialize) {
            getBaseDetails()
        }
    }, [getBaseDetails, initialize])

    useEffect(() => {
        if (initialize) {
            getDetails()
        }
    }, [getDetails, initialize])

    useEffect(() => {
        let interval: NodeJS.Timer

        if (initialize) {
            transferTokensFromPrevDao()
            interval = setLockableInterval(async () => {
                const { retry } = await transferTokensFromPrevDao()
                if (!retry) {
                    clearInterval(interval)
                }
            }, 20000)
        }

        return () => {
            clearInterval(interval)
        }
    }, [transferTokensFromPrevDao, initialize])

    useEffect(() => {
        // Wait for DAO details to be fetched
        if (!Object.keys(dao).length) {
            setStatus2((state) => ({ ...state, type: 'dismiss' }))
            return
        }

        if (!dao.isReady) {
            setStatus2((state) => ({
                ...state,
                type: 'pending',
                data: 'Wait for DAO. It can take a while',
            }))
        } else {
            setStatus2((state) => ({ ...state, type: 'dismiss' }))
            if (data.profile && _wallet) {
                activate(data.profile, _wallet)
            }
        }
    }, [dao.isReady, data.profile?.address, _wallet?.address])

    useEffect(() => {
        if (!subscribe) {
            return
        }

        // Subscribe for DAO wallet messages
        const triggers = [
            'acceptUnlock',
            'addAllowance',
            'addAllowanceC',
            'addRegularToken',
            'addVoteToken',
            'askForLimited',
            'askForLimitedBasic',
            'daoSendTokenToNewVersionAfter5',
            'grantToken',
            'grantTokenBig',
            'lockVoting',
            'lockVotingInDao',
            'receiveToken',
            'returnDaoBalance',
            'sendTokenToDaoReserve',
            'sendTokenToDaoReserveIn',
            'sendToken',
            'sendTokenIn',
            'sendTokenToNewVersion',
            'sendTokenToNewVersionAfter5',
            'sendTokenToNewVersionIn',
            'sendTokenToNewVersion5',
            'setLimitedWallet',
        ]
        data.wallet?.account.subscribeMessages('msg_type body', async (message) => {
            const decoded = await data.wallet?.decodeMessageBody(
                message.body,
                message.msg_type,
            )
            if (decoded && triggers.indexOf(decoded.name) >= 0) {
                await getDetails()
            }
        })

        return () => {
            data.wallet?.account.free()
        }
    }, [getDetails, data.wallet, subscribe])

    return {
        ...data,
        vesting: dao.members?.find((item) => {
            return item.profile.address === user.profile
        })?.vesting,
    }
}

export function useDaoMemberList(
    params: { count?: number; search?: string; initialize?: boolean } = {},
) {
    const { count = 10, search, initialize } = params
    const { details: dao } = useDao()
    const [data, setData] = useRecoilState(
        daoMemberListSelector({ daoname: dao.name, search }),
    )

    const getMemberList = useCallback(
        async (from: number, to?: number) => {
            try {
                setData((state) => ({ ...state, isFetching: true }))

                to = to || from + count
                const items = await executeByChunk<
                    TDaoDetailsMemberItem,
                    TDaoMemberListItem
                >(dao.members?.slice(from, to) || [], MAX_PARALLEL_READ, async (item) => {
                    const { profile, daomembers } = item

                    const name = daomembers[profile.address] || (await profile.getName())
                    const { voting, locked, regular } = await item.wallet.getBalance()
                    return {
                        ...item,
                        username: name,
                        balance: Math.max(voting, locked) + regular,
                        isFetching: false,
                    }
                })

                setData((state) => {
                    const different = _.differenceWith(
                        items,
                        state.items,
                        (a, b) => a.profile.address === b.profile.address,
                    )
                    const intersect = _.intersectionWith(
                        items,
                        state.items,
                        (a, b) => a.profile.address === b.profile.address,
                    )

                    return {
                        ...state,
                        items: [...different, ...state.items].map((item) => {
                            const found = intersect.find(
                                (_item) => _item.profile.address === item.profile.address,
                            )
                            return { ...item, ...found } || item
                        }),
                    }
                })
            } catch (e: any) {
                setData((state) => ({ ...state, error: e }))
            } finally {
                setData((state) => ({ ...state, isFetching: false }))
            }
        },
        [
            dao.address,
            dao.members?.length,
            count,
            sum(dao.members?.map((item) => item.vesting)),
        ],
    )

    const getNext = useCallback(async () => {
        await getMemberList(data.items.length)
    }, [getMemberList, data.items.length])

    useEffect(() => {
        if (initialize) {
            getMemberList(0, data.items.length)
        }
    }, [getMemberList, initialize])

    return {
        ...data,
        hasNext: data.items.length < (dao.members?.length || 1),
        getNext,
    }
}

export function useDaoHelpers() {
    const { details: dao } = useDao()
    const member = useDaoMember()

    const nocallback = () => {}

    const beforeCreateEvent = async (
        min: number,
        options: {
            onPendingCallback?: (status: TToastStatus) => void
            onSuccessCallback?: (status: TToastStatus) => void
            onErrorCallback?: (status: TToastStatus) => void
        },
    ) => {
        const {
            onPendingCallback = nocallback,
            onSuccessCallback = nocallback,
            onErrorCallback = nocallback,
        } = options

        try {
            onPendingCallback({ type: 'pending', data: 'Prepare balances' })

            // Check wallet readyness
            if (!member.wallet || !member.isReady) {
                throw new GoshError(
                    'Access error',
                    'Wallet does not exist or not activated',
                )
            }

            // Check for minimum tokens needed to create event
            if (min === 0) {
                return
            }

            // Check for member allowance
            if (member.allowance! < min) {
                throw new GoshError('Karma error', {
                    message: 'Not enough karma',
                    yours: member.allowance,
                    needed: min,
                })
            }

            // Check locker status
            if (await member.wallet.smvLockerBusy()) {
                onPendingCallback({ type: 'pending', data: 'Wait for locker' })

                const wait = await whileFinite(async () => {
                    return !(await member.wallet!.smvLockerBusy())
                })
                if (!wait) {
                    throw new GoshError('Timeout error', 'Wait for locker ready timeout')
                }
            }

            // Convert regular tokens to voting
            onPendingCallback({ type: 'pending', data: 'Moving tokens' })
            const { voting, locked, regular } = await member.wallet.getBalance()
            if (voting >= min || locked >= min) {
                return
            }

            if (regular >= min - voting) {
                await member.wallet.smvLockTokens(0)
                const check = await whileFinite(async () => {
                    const { voting } = await member.wallet!.getBalance()
                    return voting >= min
                })
                if (!check) {
                    throw new GoshError('Timeout error', 'Lock tokens error')
                }

                onSuccessCallback({ type: 'success', data: 'Prepare balances completed' })
                return
            }

            throw new GoshError('Balance error', {
                needed: min,
                message: "You don't have enough tokens to create event",
            })
        } catch (e: any) {
            onErrorCallback({ type: 'error', data: e })
            throw e
        }
    }

    const beforeVote = async (
        amount: number,
        platformId: string,
        options: {
            onPendingCallback?: (status: TToastStatus) => void
            onSuccessCallback?: (status: TToastStatus) => void
            onErrorCallback?: (status: TToastStatus) => void
        },
    ) => {
        const {
            onPendingCallback = nocallback,
            onSuccessCallback = nocallback,
            onErrorCallback = nocallback,
        } = options

        try {
            onPendingCallback({ type: 'pending', data: 'Prepare balances' })

            // Check wallet readyness
            if (!member.wallet || !member.isReady) {
                throw new GoshError(
                    'Access error',
                    'Wallet does not exist or not activated',
                )
            }

            // Check for member allowance
            if (member.allowance! < amount) {
                throw new GoshError('Karma error', {
                    message: 'Not enough karma',
                    yours: member.allowance,
                    wanted: amount,
                })
            }

            // Check locker status
            if (await member.wallet.smvLockerBusy()) {
                onPendingCallback({ type: 'pending', data: 'Wait for locker' })

                const wait = await whileFinite(async () => {
                    return !(await member.wallet!.smvLockerBusy())
                })
                if (!wait) {
                    throw new GoshError('Timeout error', 'Wait for locker ready timeout')
                }
            }

            // Convert regular tokens to voting
            onPendingCallback({ type: 'pending', data: 'Moving tokens' })
            const { voting, regular } = await member.wallet.getBalance()
            const locked = await member.wallet.smvEventVotes(platformId)
            const unlocked = voting - locked
            if (unlocked < amount) {
                const delta = amount - unlocked
                if (regular < delta) {
                    throw new GoshError('Balance error', {
                        message: "You don't have enough tokens to vote",
                    })
                }

                await member.wallet.smvLockTokens(delta)
                const check = await whileFinite(async () => {
                    const { voting } = await member.wallet!.getBalance()
                    return voting >= amount
                })
                if (!check) {
                    throw new GoshError('Timeout error', 'Lock tokens error')
                }
            }

            onSuccessCallback({ type: 'success', data: 'Prepare balances completed' })
        } catch (e: any) {
            onErrorCallback({ type: 'error', data: e })
            throw e
        }
    }

    const voting2regular = async (
        needed: number,
        options: {
            onPendingCallback?: (status: TToastStatus) => void
            onSuccessCallback?: (status: TToastStatus) => void
            onErrorCallback?: (status: TToastStatus) => void
        },
    ) => {
        const {
            onPendingCallback = nocallback,
            onSuccessCallback = nocallback,
            onErrorCallback = nocallback,
        } = options

        try {
            // Check wallet readyness
            if (!member.wallet || !member.isReady) {
                throw new GoshError(
                    'Access error',
                    'Wallet does not exist or not activated',
                )
            }

            // Check locker status
            if (await member.wallet.smvLockerBusy()) {
                onPendingCallback({ type: 'pending', data: 'Wait for locker' })

                const wait = await whileFinite(async () => {
                    return !(await member.wallet!.smvLockerBusy())
                })
                if (!wait) {
                    throw new GoshError('Timeout error', 'Wait for locker ready timeout')
                }
            }

            const regular = member.balance?.regular || 0
            if (needed > regular) {
                const delta = needed - regular
                await member.wallet.smvReleaseTokens()
                await member.wallet.smvUnlockTokens(delta)
                const check = await whileFinite(async () => {
                    const { regular } = await member.wallet!.getBalance()
                    return regular >= needed
                })
                if (!check) {
                    throw new GoshError('Regular tokens topup failed')
                }
            }

            onSuccessCallback({ type: 'success', data: 'Prepare balances completed' })
        } catch (e: any) {
            onErrorCallback({ type: 'error', data: e })
            throw e
        }
    }

    const checkDaoWallet = async (profile: string) => {
        const isMember = await dao.account!.isMember(profile)
        if (!isMember) {
            const wallet = await dao.account!.getMemberWallet({ data: { profile } })
            await dao.account!.createLimitedWallet(profile)
            const wait = await whileFinite(async () => {
                return await wallet.isDeployed()
            })
            if (!wait) {
                throw new GoshError('Timeout error', 'Create DAO wallet timeout reached')
            }
        }

        return { isMember }
    }

    return {
        beforeCreateEvent,
        beforeVote,
        voting2regular,
        checkDaoWallet,
    }
}

export function useCreateDaoMember() {
    const { user } = useUser()
    const { details: dao } = useDao()
    const member = useDaoMember()
    const setInviteList = useSetRecoilState(daoInviteListAtom)
    const { beforeCreateEvent } = useDaoHelpers()
    const [status, setStatus] = useRecoilState(
        appToastStatusSelector('__createdaomember'),
    )

    const getInvitationToken = useCallback(() => {
        if (!dao.name) {
            throw new GoshError('Generate token error', 'DAO name is undefined')
        }

        const data = {
            dao: dao.name,
            nonce: Date.now() + Math.round(Math.random() * 1000),
        }
        return Buffer.from(JSON.stringify(data)).toString('base64')
    }, [dao.name])

    const createInvitation = useCallback(
        async (extra?: any) => {
            if (!user.username) {
                throw new GoshError('Create link error', 'Username is undefined')
            }

            // Generate token and write to db
            const token = getInvitationToken()
            const { data, error } = await supabase.client
                .from('dao_invite')
                .insert({
                    dao_name: dao.name,
                    sender_username: user.username,
                    is_recipient_sent: true,
                    token,
                    token_expired: false,
                    ...extra,
                })
                .select()
            if (error) {
                throw new GoshError('Create link error', error.message)
            }

            // Update DAO invite list state
            setInviteList((state) => ({
                ...state,
                items: [
                    {
                        id: data![0].id,
                        token,
                        email: extra?.recipient_email,
                        allowance: extra?.recipient_allowance,
                        comment: extra?.recipient_comment,
                    },
                    ...state.items,
                ],
            }))

            return token
        },
        [getInvitationToken],
    )

    const createMember = useCallback(
        async (
            items: {
                user: { name: string; type: 'user' | 'dao' | 'email' }
                allowance: number
                comment?: string
            }[],
            requestMembership?: boolean,
        ) => {
            try {
                const sc = getSystemContract()

                // Check total allowance against reserve
                const allowance = _.sum(items.map(({ allowance }) => allowance))
                const reserve = dao.supply?.reserve || 0
                if (allowance > reserve) {
                    throw new GoshError('DAO reserve error', {
                        karma: allowance,
                        reserve,
                        message:
                            'Members total karma can not be greater than DAO reserve',
                    })
                }

                // Create invite links for user type `email`
                const invites = items
                    .filter(({ user }) => user.type === 'email')
                    .map((item) => ({
                        recipient_email: item.user.name,
                        recipient_allowance: item.allowance,
                        recipient_comment: item.comment,
                        is_recipient_sent: false,
                    }))
                const invitesEmailList = invites.map((item) => item.recipient_email)
                const invitesUnique = invites.filter((item, index) => {
                    return invitesEmailList.indexOf(item.recipient_email) === index
                })
                await Promise.all(
                    invitesUnique.map(async (item) => {
                        await createInvitation(item)
                    }),
                )

                // Add DAO members by username
                const users = items.filter(({ user }) => user.type !== 'email')
                const usersList = users.map(({ user }) => {
                    return `${user.name}.${user.type}`
                })
                const usersUnique = users.filter(({ user }, index) => {
                    return usersList.indexOf(`${user.name}.${user.type}`) === index
                })

                // Resolve username -> profile
                setStatus((state) => ({
                    ...state,
                    type: 'pending',
                    data: 'Resolve user profiles',
                }))
                const profiles = await executeByChunk(
                    usersUnique,
                    MAX_PARALLEL_READ,
                    async ({ user, allowance }) => {
                        const username = user.name.toLowerCase()

                        let profile
                        const daonames = []
                        if (user.type === EDaoMemberType.User) {
                            profile = await AppConfig.goshroot.getUserProfile({
                                username,
                            })
                            daonames.push(null)
                        } else if (user.type === EDaoMemberType.Dao) {
                            profile = await sc.getDao({ name: username })
                            daonames.push(username)
                        }

                        if (!profile || !(await profile.isDeployed())) {
                            throw new GoshError('Profile error', {
                                message: 'Profile does not exist',
                                username: user.name,
                            })
                        }
                        return { profile: profile.address, allowance, daonames }
                    },
                )
                const comment = usersUnique
                    .map(({ comment, user, allowance }) => {
                        return comment || `Add ${user.name} with ${allowance} karma`
                    })
                    .join('\n\n')

                // Create add DAO members multi event
                // Skip `member.wallet` check, because `beforeCreate` checks it
                // Prepare balance for create event
                await beforeCreateEvent(0, { onPendingCallback: setStatus })

                if (requestMembership) {
                    const members = profiles.map(({ profile }) => {
                        return { profile, allowance: 0, expired: 0 }
                    })
                    const daonames = _.flatten(profiles.map(({ daonames }) => daonames))
                    await member.wallet!.createDaoMember({ members, daonames, comment })
                } else if (profiles.length > 0) {
                    const memberAddCells = profiles.map(({ profile, daonames }) => ({
                        type: EDaoEventType.DAO_MEMBER_ADD,
                        params: {
                            members: [{ profile, allowance: 0, expired: 0 }],
                            daonames,
                        },
                    }))
                    const memberAddVotingCells = profiles.map(
                        ({ profile, allowance }) => ({
                            type: EDaoEventType.DAO_TOKEN_VOTING_ADD,
                            params: { profile, amount: allowance },
                        }),
                    )
                    await member.wallet!.createMultiEvent({
                        proposals: [
                            ...memberAddCells,
                            { type: EDaoEventType.DELAY, params: {} },
                            ...memberAddVotingCells,
                        ],
                        comment,
                    })
                }

                setStatus((state) => ({
                    ...state,
                    type: 'success',
                    data: {
                        title: 'Add DAO members',
                        content: 'Members add event created',
                    },
                }))
            } catch (e: any) {
                setStatus((state) => ({ ...state, type: 'error', data: e }))
                throw e
            }
        },
        [
            dao.members?.length,
            dao.supply?.reserve,
            member.isMember,
            member.isReady,
            createInvitation,
        ],
    )

    return {
        status,
        createMember,
        getInvitationToken,
        createInvitation,
    }
}

export function useDeleteDaoMember() {
    const { details: dao } = useDao()
    const member = useDaoMember()
    const setMemberList = useSetRecoilState(daoMemberListSelector({ daoname: dao.name }))
    const { beforeCreateEvent } = useDaoHelpers()
    const [status, setStatus] = useRecoilState(
        appToastStatusSelector('__deletedaomember'),
    )

    const deleteMember = async (
        users: { username: string; usertype: EDaoMemberType }[],
        comment?: string,
    ) => {
        try {
            setMemberList((state) => ({
                ...state,
                items: state.items.map((item) => ({
                    ...item,
                    isFetching:
                        users.findIndex((u) => {
                            return (
                                u.username.toLowerCase() === item.username.toLowerCase()
                            )
                        }) >= 0,
                })),
            }))

            // Resolve username -> profile
            setStatus((state) => ({
                ...state,
                type: 'pending',
                data: 'Resolve user profiles',
            }))
            const sc = getSystemContract()
            const profiles = await executeByChunk(
                users,
                MAX_PARALLEL_READ,
                async (item) => {
                    const { username, usertype } = item

                    // Resolve profile by username and type
                    let profile
                    if (usertype === EDaoMemberType.Dao) {
                        profile = await sc.getDao({ name: username.toLowerCase() })
                    } else if (usertype === EDaoMemberType.User) {
                        profile = await AppConfig.goshroot.getUserProfile({
                            username: username.toLowerCase(),
                        })
                    }

                    if (!profile || !(await profile.isDeployed())) {
                        throw new GoshError('Profile error', {
                            message: 'Profile does not exist',
                            username,
                        })
                    }

                    // Find profile in DAO members for allowance data
                    const address = profile.address
                    const member = dao.members?.find((v) => v.profile.address === address)
                    if (!member) {
                        throw new GoshError('Profile error', {
                            message: 'Member not found',
                            username,
                        })
                    }

                    return { profile: address, allowance: member.allowance }
                },
            )

            // Create delete DAO members multi event
            // Skip `member.wallet` check, because `beforeCreate` checks it
            // Prepare balance for create event
            await beforeCreateEvent(20, { onPendingCallback: setStatus })

            const memberDeleteAllowanceCells = profiles.map(({ profile, allowance }) => ({
                type: EDaoEventType.DAO_ALLOWANCE_CHANGE,
                params: { members: [{ profile, increase: false, amount: allowance }] },
            }))
            const memberDeleteCells = profiles.map(({ profile }) => ({
                type: EDaoEventType.DAO_MEMBER_DELETE,
                params: { profile: [profile] },
            }))
            await member.wallet!.createMultiEvent({
                proposals: [...memberDeleteAllowanceCells, ...memberDeleteCells],
                comment:
                    comment ||
                    `Delete members ${users.map(({ username }) => username).join(', ')}`,
            })

            setStatus((state) => ({
                ...state,
                type: 'success',
                data: { title: 'Remove DAO members', content: 'Event created' },
            }))
        } catch (e: any) {
            setStatus((state) => ({ ...state, type: 'error', data: e }))
            throw e
        } finally {
            setMemberList((state) => ({
                ...state,
                items: state.items.map((item) => ({ ...item, isFetching: false })),
            }))
        }
    }

    return {
        status,
        deleteMember,
    }
}

export function useUpdateDaoMember() {
    const { details: dao } = useDao()
    const member = useDaoMember()
    const { beforeCreateEvent } = useDaoHelpers()
    const [status, setStatus] = useRecoilState(
        appToastStatusSelector('__updatedaomember'),
    )

    const updateMember = useCallback(
        async (
            items: {
                username: string
                usertype: string
                allowance: number
                _allowance: number
                balance: number
                _balance: number
            }[],
            comment?: string,
        ) => {
            const sc = getSystemContract()
            try {
                setStatus((state) => ({
                    ...state,
                    type: 'pending',
                    data: 'Validating changes',
                }))
                // Check total allowance against DAO total supply
                const allowance = _.sum(items.map(({ allowance }) => allowance))
                const supply = dao.supply?.total || 0
                if (allowance > supply) {
                    throw new GoshError('DAO supply error', {
                        karma: allowance,
                        supply,
                        message:
                            'Members total karma can not be greater than DAO total supply',
                    })
                }

                // Check total balance against DAO reserve
                const balance = _.sum(items.map(({ balance }) => balance))
                const reserve = dao.supply?.reserve || 0
                if (balance > reserve) {
                    throw new GoshError('DAO reserve error', {
                        balance,
                        reserve,
                        message:
                            'Members total balance can not be greater than DAO reserve',
                    })
                }

                // Check allowance against balance
                for (const item of items) {
                    if (item.allowance > item.balance) {
                        throw new GoshError('Value error', {
                            message: 'Member karma can not be greater than token balance',
                            username: item.username,
                            karma: item.allowance,
                            balance: item.balance,
                        })
                    }
                }

                // Resolve username -> profile
                setStatus((state) => ({
                    ...state,
                    type: 'pending',
                    data: 'Resolve user profiles',
                }))
                const profiles = await executeByChunk(
                    items,
                    MAX_PARALLEL_READ,
                    async (item) => {
                        const username = item.username.toLowerCase()

                        let profile
                        if (item.usertype === EDaoMemberType.Dao) {
                            profile = await sc.getDao({ name: username })
                        } else if (item.usertype === EDaoMemberType.User) {
                            profile = await AppConfig.goshroot.getUserProfile({
                                username,
                            })
                        }
                        if (!profile || !(await profile.isDeployed())) {
                            throw new GoshError('Profile error', {
                                message: 'Profile does not exist',
                                username,
                            })
                        }
                        return { ...item, profile: profile.address }
                    },
                )

                // Prepare event data
                const events = []
                for (const item of profiles) {
                    // Balance change
                    if (item.balance > item._balance) {
                        const delta = item.balance - item._balance
                        events.push({
                            type: EDaoEventType.DAO_TOKEN_REGULAR_ADD,
                            params: {
                                profile: item.profile,
                                amount: delta,
                                comment: `Add ${delta} regular tokens to ${item.username}`,
                            },
                            fn: 'addDaoRegularTokens',
                        })
                    }

                    // Allowance change
                    if (item.allowance - item._allowance !== 0) {
                        const delta = Math.abs(item.allowance - item._allowance)
                        events.push({
                            type: EDaoEventType.DAO_ALLOWANCE_CHANGE,
                            params: {
                                members: [
                                    {
                                        profile: item.profile,
                                        increase: item.allowance > item._allowance,
                                        amount: delta,
                                    },
                                ],
                                comment: `Change member karma from ${item._allowance} to ${item.allowance}`,
                            },
                            fn: 'updateDaoMemberAllowance',
                        })
                    }
                }

                // Prepare balance for create event
                await beforeCreateEvent(20, { onPendingCallback: setStatus })

                // Create update DAO member event
                // Skip `member.wallet` check, because `beforeCreate` checks it
                if (events.length === 0) {
                    throw new GoshError('Value error', 'Nothing was changed')
                } else if (events.length === 1) {
                    // TODO: Think how to make better
                    // @ts-ignore
                    await member.wallet[events[0].fn](events[0].params)
                } else {
                    await member.wallet!.createMultiEvent({
                        proposals: events,
                        comment: comment || 'Update DAO members',
                    })
                }

                setStatus((state) => ({
                    ...state,
                    type: 'success',
                    data: {
                        title: 'Update DAO members',
                        content: 'Members update event created',
                    },
                }))
            } catch (e: any) {
                setStatus((state) => ({ ...state, type: 'error', data: e }))
                throw e
            }
        },
        [dao.supply?.total, dao.supply?.reserve, member.isMember, member.isReady],
    )

    return {
        status,
        updateMember,
    }
}

export function useDaoEventList(params: { count?: number; initialize?: boolean } = {}) {
    const { count = 10, initialize } = params
    const { details: dao } = useDao()
    const member = useDaoMember()
    const [data, setData] = useRecoilState(daoEventListSelector(dao.name))

    const getBlockchainItems = async (params: {
        dao: Dao
        wallet: DaoWallet | null
        limit: number
        cursor?: string
    }) => {
        const { dao, wallet, limit, cursor } = params
        const codeHash = await dao.getEventCodeHash()
        const { results, lastId, completed } = await getPaginatedAccounts({
            filters: [`code_hash: {eq:"${codeHash}"}`],
            result: ['last_paid'],
            limit,
            lastId: cursor,
        })
        const items = await executeByChunk<any, TDaoEventDetails>(
            results,
            MAX_PARALLEL_READ,
            async ({ id, last_paid }) => {
                const account = await dao.getEvent({ address: id })
                const details = await account.getDetails({ wallet })
                return {
                    account,
                    address: id,
                    updatedAt: last_paid,
                    ...details,
                }
            },
        )
        return { items, cursor: lastId, hasNext: !completed }
    }

    const getEventList = useCallback(async () => {
        try {
            if (!dao.address || !member.isFetched) {
                return
            }

            setData((state) => ({ ...state, isFetching: true }))
            const blockchain = await getBlockchainItems({
                dao: dao.account!,
                wallet: member.wallet,
                limit: count,
            })
            setData((state) => {
                const different = _.differenceWith(
                    blockchain.items,
                    state.items,
                    (a, b) => a.address === b.address,
                )
                const intersect = _.intersectionWith(
                    blockchain.items,
                    state.items,
                    (a, b) => a.address === b.address,
                )
                return {
                    ...state,
                    items: [...different, ...state.items].map((item) => {
                        const found = intersect.find((_item) => {
                            return _item.address === item.address
                        })
                        return found ? { ...item, ...found } : item
                    }),
                    cursor: blockchain.cursor,
                    hasNext: blockchain.hasNext,
                }
            })
        } catch (e) {
            setData((state) => ({ ...state, error: e }))
        } finally {
            setData((state) => ({ ...state, isFetching: false }))
        }
    }, [dao.address, member.isFetched, count])

    const getNext = useCallback(async () => {
        try {
            setData((state) => ({ ...state, isFetching: true }))
            const blockchain = await getBlockchainItems({
                dao: dao.account!,
                wallet: member.wallet,
                limit: count,
                cursor: data.cursor,
            })
            setData((state) => {
                const different = _.differenceWith(
                    blockchain.items,
                    state.items,
                    (a, b) => a.address === b.address,
                )

                return {
                    ...state,
                    items: [...state.items, ...different],
                    cursor: blockchain.cursor,
                    hasNext: blockchain.hasNext,
                }
            })
        } catch (e: any) {
            throw e
        } finally {
            setData((state) => ({ ...state, isFetching: false }))
        }
    }, [dao.address, data.cursor, member.isFetched])

    const openItem = (address: string) => {
        setData((state) => ({
            ...state,
            items: state.items.map((item) => ({
                ...item,
                isOpen: item.address === address,
            })),
        }))
    }

    const closeItems = () => {
        setData((state) => ({
            ...state,
            items: state.items.map((item) => ({ ...item, isOpen: false })),
        }))
    }

    useEffect(() => {
        if (initialize) {
            getEventList()
        }
    }, [getEventList, initialize])

    return {
        ...data,
        openItem,
        closeItems,
        getNext,
        isEmpty: !data.isFetching && !data.items.length,
    }
}

export function useDaoEvent(
    address: string,
    options: { initialize?: boolean; subscribe?: boolean } = {},
) {
    const { initialize, subscribe } = options
    const { details: dao } = useDao()
    const member = useDaoMember()
    const [events, setEvents] = useRecoilState(daoEventListSelector(dao.name))
    const event = useRecoilValue(daoEventSelector(address))
    const [error, setError] = useState<any>()

    const getEvent = useCallback(async () => {
        if (!dao.account || !address || !member.isFetched) {
            return
        }

        try {
            // Search for event in event list state atom
            let found = events.items.find((item) => item.address === address)

            // Fetch event details from blockchain
            if (!found || !found.status.completed) {
                const account = found
                    ? found.account
                    : await dao.account.getEvent({ address })
                const details = await account.getDetails({ wallet: member.wallet })
                const accdata = await account.account.getAccount()
                found = {
                    ...found,
                    ...details,
                    account,
                    address,
                    updatedAt: accdata.last_paid,
                }

                setEvents((state) => {
                    const updated = [...state.items]
                    if (!updated.find(({ address }) => address === found?.address)) {
                        updated.push({ ...found!, isOpen: true })
                    }

                    return {
                        ...state,
                        items: updated.map((item) => {
                            if (item.address === address) {
                                return { ...item, ...found, isOpen: item.isOpen }
                            }
                            return item
                        }),
                    }
                })
            }

            // Fetch event data if not present
            if (!found.data) {
                getEventData(found.account!, found.type)
            }
        } catch (e: any) {
            setError(e)
        }
    }, [address, dao.address, member.isFetched])

    const getEventData = async (account: DaoEvent, type: number) => {
        try {
            const verbose = await account.getData(type, { verbose: true })
            setEvents((state) => ({
                ...state,
                items: state.items.map((item) => {
                    if (item.address === account.address) {
                        return { ...item, data: verbose }
                    }
                    return item
                }),
            }))
        } catch (e: any) {
            setError(e)
        }
    }

    const subscribeEvent = useCallback(async () => {
        if (!event?.address || !event.account) {
            return
        }

        await event.account.account.subscribeMessages('body', async ({ body }) => {
            const decoded = await event.account!.decodeMessageBody(body, 0)
            const triggers = ['acceptReviewer', 'rejectReviewer', 'updateHead', 'vote']
            if (decoded && triggers.indexOf(decoded.name) >= 0) {
                const details = await event.account!.getDetails({
                    wallet: member.wallet,
                })
                setEvents((state) => ({
                    ...state,
                    items: state.items.map((item) => {
                        if (item.address === event!.address) {
                            return { ...item, ...details }
                        }
                        return item
                    }),
                }))
            }
        })
    }, [event?.address, member.isFetched])

    useEffect(() => {
        if (initialize) {
            getEvent()
        }
    }, [getEvent, initialize])

    useEffect(() => {
        if (subscribe) {
            getEvent()
            subscribeEvent()
        }

        return () => {
            if (subscribe) {
                event?.account?.account.free()
            }
        }
    }, [getEvent, subscribeEvent, subscribe])

    return { event, error }
}

export function useReviewDaoEvent() {
    const member = useDaoMember()

    const review = useCallback(
        async (params: { eventaddr: string; decision: boolean }) => {
            if (!member.isReady || !member.wallet) {
                throw new GoshError(
                    'Access error',
                    'Wallet does not exist or not activated',
                )
            }

            await member.wallet.sendDaoEventReview(params)
        },
        [member.isReady],
    )

    return { review }
}

export function useVoteDaoEvent() {
    const member = useDaoMember()
    const { beforeVote } = useDaoHelpers()
    const [status, setStatus] = useRecoilState(appToastStatusSelector('__voteforevent'))

    const vote = async (params: {
        platformId: string
        choice: boolean
        amount: number
    }) => {
        const { platformId, choice, amount } = params
        try {
            // Prepare balance for create event
            await beforeVote(amount, platformId, { onPendingCallback: setStatus })

            // Send vote
            // Skip `member.wallet` check, because `beforeVote` checks it
            await member.wallet!.smvVote({ platformId, choice, amount })

            setStatus((state) => ({
                ...state,
                type: 'success',
                data: {
                    title: 'Send vote',
                    content: 'Your vote was succesfully sent',
                },
            }))
        } catch (e: any) {
            setStatus((state) => ({ ...state, type: 'error', data: e }))
            throw e
        }
    }

    return { vote, status }
}

export function useUpgradeDao() {
    const dao = useDao()
    const member = useDaoMember()
    const { beforeCreateEvent } = useDaoHelpers()
    const [versions, setVersions] = useState<string[]>()
    const [alert, setAlert] = useState<
        'isNotLatest' | 'isUpgradeAvailable' | 'isUpgradeUncompleted'
    >()
    const [status, setStatus] = useRecoilState(appToastStatusSelector('__upgradedao'))

    const getAvailableVersions = useCallback(() => {
        const all = Object.keys(AppConfig.versions)
        const currIndex = all.findIndex((v) => v === dao.details.version)
        setVersions(all.slice(currIndex + 1))
    }, [dao.details.version])

    const checkUpgrades = useCallback(async () => {
        const { version, name } = dao.details

        if (dao.isFetchingData) {
            return
        }

        if (!version || !member.isMember) {
            setAlert(undefined)
            return
        }

        if (alert === 'isNotLatest') {
            return
        }

        // Check if using latest version of DAO or new version avaiable
        const versions = Object.keys(AppConfig.versions)
        const currVerIndex = versions.findIndex((v) => v === version)
        const nextVersions = versions
            .slice(currVerIndex + 1)
            .filter((v) => DISABLED_VERSIONS.indexOf(v) < 0)
        if (nextVersions.length && nextVersions.indexOf(version) < 0) {
            const next = await Promise.all(
                nextVersions.map(async (ver) => {
                    const gosh = AppConfig.goshroot.getSystemContract(ver)
                    const account = await gosh.getDao({ name: name })
                    return await account.isDeployed()
                }),
            )

            // There is a deployed DAO with greater version
            if (next.some((v) => v === true)) {
                setAlert('isNotLatest')
                return
            }

            // Upgrade available (only if current version is fully upgraded)
            if (dao.details.isUpgraded) {
                setAlert('isUpgradeAvailable')
                return
            }
        }

        // Check if DAO is fully upgraded
        if (!dao.details.isUpgraded) {
            setAlert('isUpgradeUncompleted')
            return
        }

        // Reset upgrades alert
        setAlert(undefined)
    }, [dao.details, dao.isFetchingData, member.isMember])

    const upgrade = useCallback(
        async (version: string, comment: string) => {
            try {
                if (Object.keys(AppConfig.versions).indexOf(version) < 0) {
                    throw new GoshError(
                        'Upgrade error',
                        `Gosh version ${version} is not supported`,
                    )
                }
                if (!dao.details.account || !dao.details.name) {
                    throw new GoshError('Upgrade error', 'DAO account undefined')
                }

                // Check if there are no opened events
                setStatus((state) => ({
                    ...state,
                    type: 'pending',
                    data: 'Check upgrade possibility',
                }))

                let cursor
                const code = await dao.details.account.getEventCodeHash()
                while (true) {
                    const { results, lastId, completed } = await getPaginatedAccounts({
                        filters: [`code_hash: {eq:"${code}"}`],
                        lastId: cursor,
                    })
                    const items = await executeByChunk<{ id: string }, boolean>(
                        results,
                        MAX_PARALLEL_READ,
                        async ({ id }) => {
                            const account = await dao.details.account!.getEvent({
                                address: id,
                            })
                            const details = await account.getDetails({})
                            return details.status.completed
                        },
                    )

                    if (items.some((v) => v === false)) {
                        throw new GoshError(
                            'Upgrade error',
                            'DAO has opened events, you should complete all events before upgrade',
                        )
                    }
                    if (completed) {
                        break
                    }

                    await sleep(100)
                    cursor = lastId
                }

                // Prepare balance for create event
                await beforeCreateEvent(20, { onPendingCallback: setStatus })

                // Create upgrade DAO event
                // Skip `member.wallet` check, because `beforeCreate` checks it
                await member.wallet!.upgradeDao({ version, description: comment })

                setStatus((state) => ({
                    ...state,
                    type: 'success',
                    data: { title: 'Upgrade DAO', content: 'Event created' },
                }))
            } catch (e: any) {
                setStatus((state) => ({ ...state, type: 'error', data: e }))
                throw e
            }
        },
        [dao.details.address, dao.details.name],
    )

    useEffect(() => {
        getAvailableVersions()
    }, [getAvailableVersions])

    useEffect(() => {
        checkUpgrades()
    }, [checkUpgrades])

    return { versions, upgrade, status, alert }
}

export function useUpgradeDaoComplete() {
    const dao = useDao()
    const member = useDaoMember()
    const { beforeCreateEvent } = useDaoHelpers()
    const [status, setStatus] = useRecoilState(
        appToastStatusSelector('__upgradedaocomplete'),
    )

    const getRepositories = async (daoname: string) => {
        // Get repositories accounts from all DAO versions
        const versions = Object.keys(AppConfig.versions).reverse()
        const items: { address: string; version: string }[] = []
        const _gosh: { [v: string]: TSystemContract } = {}
        for (const ver of versions) {
            _gosh[ver] = AppConfig.goshroot.getSystemContract(ver)
            const _dao = await _gosh[ver].getDao({ name: daoname })
            if (!(await _dao.isDeployed())) {
                continue
            }

            const codeHash = await _gosh[ver].getRepositoryCodeHash(_dao.address)
            const result = await getAllAccounts({
                filters: [`code_hash: {eq:"${codeHash}"}`],
            })
            items.push(...result.map(({ id }) => ({ address: id, version: ver })))
        }

        // Get repositories accounts with data
        return await executeByChunk(
            items,
            MAX_PARALLEL_READ,
            async ({ address, version }) => {
                const repository = await _gosh[version].getRepository({ address })
                const name = await repository.getName()
                return { account: repository, address, name, version }
            },
        )
    }

    const getRepositoriesCommitTags = async (repositories: any[]) => {
        const tags = []
        for (const item of repositories) {
            const code = await item.account.getCommitTagCodeHash()
            const accounts = await getAllAccounts({
                filters: [`code_hash: {eq:"${code}"}`],
            })
            const repotags = await executeByChunk<any, TGoshCommitTag>(
                accounts,
                MAX_PARALLEL_READ,
                async ({ id }) => {
                    const tag = await item.account.getCommitTag({ address: id })
                    return await tag.getDetails()
                },
            )
            tags.push(...repotags)
        }
        return tags
    }

    const upgradeRepositories = async (params: {
        wallet: DaoWallet
        repositories: any[]
        daover: string
        alone: boolean
    }) => {
        const { wallet, repositories, daover, alone } = params

        // Prepare repositories for upgrade
        const current = repositories
            .filter(({ version }) => version === daover)
            .map(({ name }) => name)
        const rest = repositories.filter(({ version }) => version !== daover)
        const upgradeable = []
        for (const item of rest) {
            if (current.indexOf(item.name) >= 0) {
                continue
            }
            if (upgradeable.findIndex((i) => i.name === item.name) >= 0) {
                continue
            }
            upgradeable.push(item)
        }

        // Get repositories commit tags
        setStatus((state) => ({
            ...state,
            type: 'pending',
            data: 'Fetching repositories commit tags',
        }))
        const tags = await getRepositoriesCommitTags(repositories)

        // Deploy repositories commit tags
        setStatus((state) => ({
            ...state,
            type: 'pending',
            data: 'Transfer repositories commit tags',
        }))
        await executeByChunk(tags, MAX_PARALLEL_WRITE, async (item) => {
            await wallet.createCommitTag(item)
        })

        // Deploy repositories or create multi event
        setStatus((state) => ({
            ...state,
            type: 'pending',
            data: 'Transfer repositories',
        }))
        let isEvent = false
        const args = upgradeable.map(({ name, address, version }) => ({
            name,
            previous: { addr: address, version },
            comment: 'Upgrade repository',
        }))
        if (args.length === 1 || alone) {
            await executeByChunk(args, MAX_PARALLEL_WRITE, async (kwargs) => {
                await wallet.createRepository({ ...kwargs, alone })
            })
            isEvent = !alone
        } else if (args.length > 1) {
            await executeByChunk(
                splitByChunk(args, 50),
                MAX_PARALLEL_WRITE,
                async (chunk) => {
                    await wallet.createMultiEvent({
                        proposals: chunk.map((p) => ({
                            type: EDaoEventType.REPO_CREATE,
                            params: p,
                        })),
                        comment: 'Upgrade repositories',
                    })
                },
            )
            isEvent = true
        }

        // Update DAO flag
        setStatus((state) => ({ ...state, type: 'pending', data: 'Update DAO flag' }))
        await wallet.setRepositoriesUpgraded()
        return { isEvent }
    }

    const upgradeMilestones = async (params: {
        wallet: DaoWallet
        daoprev: { account: Dao; version: string } | null
        repositories: any[]
    }) => {
        const { wallet, daoprev } = params

        if (!daoprev || daoprev.version < '5.0.0') {
            return { isEvent: false }
        }

        // Prepare repositories of needed version
        const repositories = params.repositories.filter(
            (item: any) => item.version === daoprev.version,
        )

        // Get task code hash for each repository
        setStatus((state) => ({ ...state, type: 'pending', data: 'Fetching milestones' }))
        const taskcode = await executeByChunk(
            repositories,
            MAX_PARALLEL_READ,
            async ({ name }) => ({
                reponame: name,
                codehash: await daoprev.account.getMilestoneCodeHash(name),
            }),
        )

        // Transfer/upgrade milestones
        setStatus((state) => ({ ...state, type: 'pending', data: 'Upgrade milestones' }))
        const sc = AppConfig.goshroot.getSystemContract(daoprev.version) as SystemContract

        // Prepare cells
        const cells: { type: number; params: any }[] = []
        for (const { reponame, codehash } of taskcode) {
            const accounts = await getAllAccounts({
                filters: [`code_hash: {eq:"${codehash}"}`],
                result: ['id'],
            })
            const items = await executeByChunk(
                accounts,
                MAX_PARALLEL_READ,
                async ({ id }) => {
                    const task = await sc.getMilestone({ address: id })
                    const details = await task.getRawDetails()
                    const version = await task.getVersion()
                    return {
                        type: EDaoEventType.MILESTONE_UPGRADE,
                        params: {
                            reponame,
                            taskname: details.nametask,
                            taskprev: { address: id, version },
                            tags: details.hashtag,
                        },
                    }
                },
            )
            cells.push(...items)
        }

        // Create multi event or return
        if (cells.length === 0) {
            return { isEvent: false }
        }
        if (cells.length === 1) {
            cells.push({ type: EDaoEventType.DELAY, params: {} })
        }
        await executeByChunk(
            splitByChunk(cells, 50),
            MAX_PARALLEL_WRITE,
            async (chunk) => {
                await wallet.createMultiEvent({
                    proposals: chunk,
                    comment: 'Upgrade milestones',
                })
            },
        )
        return { isEvent: true }
    }

    const upgradeTasks = async (params: {
        wallet: DaoWallet
        daoprev: { account: Dao; version: string } | null
        repositories: any[]
    }) => {
        const { wallet, daoprev } = params

        if (!daoprev || daoprev.version === '1.0.0') {
            setStatus((state) => ({
                ...state,
                type: 'pending',
                data: 'Update DAO flags',
            }))
            await wallet.setTasksUpgraded({ cell: false })
            return { isEvent: false }
        }

        // Prepare repositories of needed version
        const repositories = params.repositories.filter(
            (item: any) => item.version === daoprev.version,
        )

        // Get task code hash for each repository
        setStatus((state) => ({ ...state, type: 'pending', data: 'Fetching tasks' }))
        const taskcode = await executeByChunk(
            repositories,
            MAX_PARALLEL_READ,
            async ({ name }) => ({
                reponame: name,
                codehash: await daoprev.account.getTaskCodeHash(name),
            }),
        )

        // Transfer/upgrade tasks
        setStatus((state) => ({ ...state, type: 'pending', data: 'Upgrade tasks' }))
        const sc = AppConfig.goshroot.getSystemContract(daoprev.version) as SystemContract

        // Prepare cells
        const cells: { type: number; params: any }[] = []
        for (const { reponame, codehash } of taskcode) {
            const accounts = await getAllAccounts({
                filters: [`code_hash: {eq:"${codehash}"}`],
                result: ['id', 'data'],
            })
            const items = await executeByChunk(
                accounts,
                MAX_PARALLEL_READ,
                async ({ id, data }) => {
                    const task = await sc.getTask({ address: id })

                    if (daoprev.version < '3.0.0') {
                        const decoded = await task.decodeAccountData(data)
                        return {
                            type: EDaoEventType.TASK_REDEPLOY,
                            params: { accountData: decoded, reponame },
                        }
                    } else {
                        const details = await task.getDetails()
                        const version = await task.getVersion()
                        return {
                            type: EDaoEventType.TASK_UPGRADE,
                            params: {
                                reponame: details.repository.name,
                                taskname: details.name,
                                taskprev: { address: id, version },
                                tags: details.tagsRaw,
                            },
                        }
                    }
                },
            )
            cells.push(...items)
        }

        // Update DAO flag if nothing to upgrade
        if (cells.length === 0) {
            await wallet.setTasksUpgraded({ cell: false })
            return { isEvent: false }
        }

        // Create multi event
        cells.push({ type: EDaoEventType.TASK_REDEPLOYED, params: {} })
        await executeByChunk(
            splitByChunk(cells, 50),
            MAX_PARALLEL_WRITE,
            async (chunk) => {
                await wallet.createMultiEvent({
                    proposals: chunk,
                    comment: 'Upgrade tasks',
                })
            },
        )
        return { isEvent: true }
    }

    const upgradeMint = async (
        wallet: DaoWallet,
        daoprev: { account: Dao; version: string } | null,
        isMintOnCurr: boolean,
    ) => {
        if (!daoprev || daoprev.version === '1.0.0') {
            return
        }

        setStatus((state) => ({
            ...state,
            type: 'pending',
            data: 'Upgrade minting policy',
        }))
        const isMintOnPrev = await daoprev.account.isMintOn()
        if (!isMintOnPrev && isMintOnCurr) {
            await wallet.disableMintDaoTokens({
                comment:
                    'This proposal will pass the Token Mint Disable flag on to the newer version of your DAO',
            })
        }
    }

    const upgrade = useCallback(async () => {
        try {
            const {
                name: daoname,
                account: daoaccount,
                version,
                members,
                isRepoUpgraded,
                isTaskUpgraded,
                isMintOn,
            } = dao.details
            if (
                !daoname ||
                !version ||
                !members?.length ||
                !daoaccount ||
                isMintOn === undefined
            ) {
                throw new GoshError('Value error', 'DAO details undefined')
            }
            // Check for ability to create events
            await beforeCreateEvent(20, { onPendingCallback: setStatus })

            // Get all repositories from all DAO versions
            setStatus((state) => ({
                ...state,
                type: 'pending',
                data: 'Fetching repositories',
            }))
            const repositories = await getRepositories(daoname)

            // Get previous DAO version
            let daoprev: { account: Dao; version: string } | null = null
            const daoaddrPrev = await daoaccount.getPrevious()
            if (daoaddrPrev) {
                const _prev = await getSystemContract().getDao({ address: daoaddrPrev })
                const version = await _prev.getVersion()
                daoprev = {
                    account: (await AppConfig.goshroot
                        .getSystemContract(version)
                        .getDao({ address: daoaddrPrev })) as Dao,
                    version,
                }
            }

            let isEvent = false
            // Upgrade repositories and commit tags
            if (!isRepoUpgraded) {
                const { isEvent: isRepositoriesEvent } = await upgradeRepositories({
                    wallet: member.wallet!,
                    repositories,
                    daover: version,
                    alone: members.length === 1,
                })
                isEvent = isEvent || isRepositoriesEvent
            }

            // Upgrade milestones
            const { isEvent: isMilestonesEvent } = await upgradeMilestones({
                wallet: member.wallet!,
                daoprev,
                repositories,
            })
            isEvent = isEvent || isMilestonesEvent

            // Upgrade tasks
            if (!isTaskUpgraded) {
                const { isEvent: isTasksEvent } = await upgradeTasks({
                    wallet: member.wallet!,
                    daoprev,
                    repositories,
                })
                isEvent = isEvent || isTasksEvent
            }

            // Upgrade minting policy
            await upgradeMint(member.wallet!, daoprev, isMintOn)

            setStatus((state) => ({
                ...state,
                type: 'success',
                data: {
                    title: 'DAO upgrade completed',
                    content: isEvent
                        ? 'Corresponding events created. Please, vote'
                        : 'You can continue working with DAO',
                },
            }))
        } catch (e: any) {
            setStatus((state) => ({ ...state, type: 'error', data: e }))
            throw e
        }
    }, [
        dao.details.name,
        dao.details.version,
        dao.details.members?.length,
        dao.details.isRepoUpgraded,
        dao.details.isTaskUpgraded,
        dao.details.isMintOn,
        member.isReady,
    ])

    return { upgrade, status }
}

export function useUpdateDaoSettings() {
    const { details: dao } = useDao()
    const member = useDaoMember()
    const { beforeCreateEvent } = useDaoHelpers()
    const [status, setStatus] = useRecoilState(
        appToastStatusSelector('__updatedaosettings'),
    )

    const update = useCallback(
        async (params: {
            tags: string[]
            isMintOn: boolean
            isEventProgressOn: boolean
            isEventDiscussionOn: boolean
            isAskMembershipOn: boolean
            comment?: string
        }) => {
            try {
                if (!member.wallet || !member.isReady) {
                    throw new GoshError(
                        'Access error',
                        'Wallet does not exist or not activated',
                    )
                }

                // Future events params
                const events = []

                // Check DAO tags updated
                const tagsAdded = _.differenceWith(params.tags, dao.tags || [])
                const tagsRemoved = _.differenceWith(dao.tags || [], params.tags)
                if (tagsAdded.length > 0) {
                    events.push({
                        type: EDaoEventType.DAO_TAG_ADD,
                        params: { tags: tagsAdded, comment: 'Add DAO tags' },
                        fn: 'createDaoTag',
                    })
                }
                if (tagsRemoved.length > 0) {
                    events.push({
                        type: EDaoEventType.DAO_TAG_REMOVE,
                        params: { tags: tagsRemoved, comment: 'Delete DAO tags' },
                        fn: 'deleteDaoTag',
                    })
                }

                // Minting tokens
                if (!params.isMintOn && dao.isMintOn) {
                    events.push({
                        type: EDaoEventType.DAO_TOKEN_MINT_DISABLE,
                        params: { comment: 'Disable minting tokens' },
                        fn: 'disableMintDaoTokens',
                    })
                }

                // Show voting results for event until it is finished
                if (params.isEventProgressOn !== dao.isEventProgressOn) {
                    events.push({
                        type: EDaoEventType.DAO_EVENT_HIDE_PROGRESS,
                        params: {
                            decision: params.isEventProgressOn,
                            comment: 'Hide voting results until event is over',
                        },
                        fn: 'updateDaoEventShowProgress',
                    })
                }

                // Allow discussions on events
                if (params.isEventDiscussionOn !== dao.isEventDiscussionOn) {
                    events.push({
                        type: EDaoEventType.DAO_EVENT_ALLOW_DISCUSSION,
                        params: {
                            allow: params.isEventDiscussionOn,
                            comment: 'Allow discussions on events',
                        },
                        fn: 'updateDaoEventAllowDiscussion',
                    })
                }

                // Allow external users to request DAO membership
                if (params.isAskMembershipOn !== dao.isAskMembershipOn) {
                    events.push({
                        type: EDaoEventType.DAO_ASK_MEMBERSHIP_ALLOWANCE,
                        params: {
                            decision: params.isAskMembershipOn,
                            comment: 'Allow external users to request DAO membership',
                        },
                        fn: 'updateDaoAskMembership',
                    })
                }

                // Prepare balance for create event
                await beforeCreateEvent(20, { onPendingCallback: setStatus })

                // Create event/multievent
                if (events.length === 1) {
                    // TODO: Think how to make better
                    // @ts-ignore
                    await member.wallet[events[0].fn](events[0].params)
                } else {
                    await member.wallet.createMultiEvent({
                        proposals: events,
                        comment: 'Update DAO settings',
                    })
                }

                setStatus((state) => ({
                    ...state,
                    type: 'success',
                    data: {
                        title: 'Update DAO settings',
                        content: 'Update DAO settings event created',
                    },
                }))
            } catch (e: any) {
                setStatus((state) => ({ ...state, type: 'error', data: e }))
                throw e
            }
        },
        [
            dao.tags,
            dao.isMintOn,
            dao.isEventProgressOn,
            dao.isEventDiscussionOn,
            dao.isAskMembershipOn,
            member.isMember,
            member.isReady,
        ],
    )

    return { update, status }
}

export function useMintDaoTokens() {
    const { details: dao } = useDao()
    const member = useDaoMember()
    const { beforeCreateEvent } = useDaoHelpers()
    const [status, setStatus] = useRecoilState(appToastStatusSelector('__mintdaotokens'))

    const mint = useCallback(
        async (params: { amount: number; comment?: string }) => {
            const { amount, comment } = params

            try {
                setStatus((state) => ({
                    ...state,
                    type: 'pending',
                    data: 'Start tokens minting',
                }))

                if (!member.isMember) {
                    throw new GoshError('Access error', 'Not a DAO member')
                }
                if (!member.isReady || !member.wallet) {
                    throw new GoshError(
                        'Access error',
                        'Wallet is missing or is not activated',
                    )
                }
                if (!dao.isMintOn) {
                    throw new GoshError(
                        'Minting error',
                        'Minting tokens is disabled for this DAO',
                    )
                }

                // Prepare balance for create event (if not alone)
                const alone = dao.members?.length === 1
                if (!alone) {
                    await beforeCreateEvent(20, { onPendingCallback: setStatus })
                }

                // Mint tokens
                setStatus((state) => ({
                    ...state,
                    type: 'pending',
                    data: 'Minting tokens',
                }))
                await member.wallet.mintDaoTokens({
                    amount,
                    comment: comment || `Mint ${amount.toLocaleString()} tokens`,
                    alone,
                })

                // Update status depending on alone
                setStatus((state) => ({
                    ...state,
                    type: 'success',
                    data: {
                        title: 'Mint tokens',
                        content: alone ? 'Tokens minted' : 'Mint tokens event created',
                    },
                }))

                return { isEvent: !alone }
            } catch (e: any) {
                setStatus((state) => ({ ...state, type: 'error', data: e }))
                throw e
            }
        },
        [dao.members?.length, dao.isMintOn, member.isMember, member.isReady],
    )

    return { mint, status }
}

export function useSendDaoTokens() {
    const { details: dao } = useDao()
    const member = useDaoMember()
    const { beforeCreateEvent, checkDaoWallet } = useDaoHelpers()
    const [status, setStatus] = useRecoilState(appToastStatusSelector('__senddaotokens'))

    const send = useCallback(
        async (params: {
            username: string
            usertype: string
            amount: number
            isVoting: boolean
            comment?: string
        }) => {
            const { username, usertype, amount, isVoting, comment } = params
            const sc = getSystemContract()

            try {
                if (!member.isMember) {
                    throw new GoshError('Access error', 'Not a DAO member')
                }
                if (!member.isReady || !member.wallet) {
                    throw new GoshError(
                        'Access error',
                        'Wallet is missing or is not activated',
                    )
                }

                // Resolve username -> profile
                setStatus((state) => ({
                    ...state,
                    type: 'pending',
                    data: 'Resolve username',
                }))
                let profile
                if (usertype === EDaoMemberType.Dao) {
                    profile = await sc.getDao({ name: username.toLowerCase() })
                } else if (usertype === EDaoMemberType.User) {
                    profile = await AppConfig.goshroot.getUserProfile({
                        username: username.toLowerCase(),
                    })
                }
                if (!profile || !(await profile.isDeployed())) {
                    throw new GoshError('Profile error', {
                        message: 'Profile does not exist',
                        username,
                    })
                }

                // Deploy limited wallet if username has no wallet in DAO
                setStatus((state) => ({
                    ...state,
                    type: 'pending',
                    data: 'Prepare user wallet',
                }))
                const { isMember } = await checkDaoWallet(profile.address)

                // Prepare balance for create event (if not alone)
                const alone = dao.members?.length === 1
                if (!alone) {
                    await beforeCreateEvent(20, { onPendingCallback: setStatus })
                }

                // Send tokens
                setStatus((state) => ({
                    ...state,
                    type: 'pending',
                    data: 'Sending tokens',
                }))
                const _txtTokens = isVoting ? 'voting' : 'regular'
                const _comment = `Send ${amount} ${_txtTokens} tokens to ${username}`
                const kwargs = {
                    profile: profile.address,
                    amount,
                    comment: comment || _comment,
                    alone,
                }
                if (isVoting) {
                    if (isMember) {
                        await member.wallet.addDaoVotingTokens(kwargs)
                    } else {
                        const daonames =
                            usertype === EDaoMemberType.Dao
                                ? [username.toLowerCase()]
                                : [null]
                        await member.wallet.createMultiEvent({
                            proposals: [
                                {
                                    type: EDaoEventType.DAO_MEMBER_ADD,
                                    params: {
                                        members: [
                                            { profile: profile.address, allowance: 0 },
                                        ],
                                        daonames,
                                        comment: `Add DAO member ${username}`,
                                    },
                                },
                                { type: EDaoEventType.DELAY, params: {} },
                                {
                                    type: EDaoEventType.DAO_TOKEN_VOTING_ADD,
                                    params: {
                                        profile: profile.address,
                                        amount,
                                        comment: `Add ${amount} karma for ${username}`,
                                    },
                                },
                            ],
                            comment: comment || _comment,
                        })
                    }
                } else {
                    await member.wallet.addDaoRegularTokens(kwargs)
                }

                // Update status depending on alone
                setStatus((state) => ({
                    ...state,
                    type: 'success',
                    data: {
                        title: 'Send tokens',
                        content: alone ? 'Tokens sent' : 'Send tokens event created',
                    },
                }))

                return { isEvent: !alone || (isVoting && !isMember) }
            } catch (e: any) {
                setStatus((state) => ({ ...state, type: 'error', data: e }))
                throw e
            }
        },
        [dao.members?.length, member.isMember, member.isReady],
    )

    return { send, status }
}

export function useSendMemberTokens() {
    const { details: dao } = useDao()
    const member = useDaoMember()
    const { voting2regular, checkDaoWallet } = useDaoHelpers()
    const [status, setStatus] = useRecoilState(
        appToastStatusSelector('__sendmembertokens'),
    )

    const send = useCallback(
        async (params: { username: string; usertype: string; amount: number }) => {
            const { username, usertype, amount } = params
            const sc = getSystemContract()

            try {
                // Prepare balance
                await voting2regular(amount, { onPendingCallback: setStatus })

                // Skip `member.wallet` check, because `voting2regular` checks it
                // If DAO name - send to DAO reserve
                if (usertype === EDaoMemberType.Dao && username === dao.name) {
                    setStatus((state) => ({
                        ...state,
                        type: 'pending',
                        data: 'Sending tokens to DAO reserve',
                    }))
                    await member.wallet!.sendTokensToDaoReserve(amount)
                } else {
                    // Resolve username -> profile
                    setStatus((state) => ({
                        ...state,
                        type: 'pending',
                        data: 'Resolve username',
                    }))

                    let profile
                    if (usertype === EDaoMemberType.Dao) {
                        profile = await sc.getDao({ name: username })
                    } else if (usertype === EDaoMemberType.User) {
                        profile = await AppConfig.goshroot.getUserProfile({
                            username: username.toLowerCase(),
                        })
                    }

                    if (!profile || !(await profile.isDeployed())) {
                        throw new GoshError('Profile error', {
                            message: 'Profile does not exist',
                            username,
                        })
                    }

                    // Deploy limited wallet if username has no wallet in DAO
                    setStatus((state) => ({
                        ...state,
                        type: 'pending',
                        data: 'Prepare user wallet',
                    }))
                    await checkDaoWallet(profile.address)

                    // Send tokens
                    setStatus((state) => ({
                        ...state,
                        type: 'pending',
                        data: 'Sending tokens',
                    }))
                    await member.wallet!.sendTokensToDaoWallet(profile.address, amount)
                }

                // Update status
                setStatus((state) => ({
                    ...state,
                    type: 'success',
                    data: { title: 'Send tokens', content: 'Tokens sent' },
                }))
            } catch (e: any) {
                setStatus((state) => ({ ...state, type: 'error', data: e }))
                throw e
            }
        },
        [dao.name, member.isReady, member.balance],
    )

    return { send, status }
}

export function useDaoInviteList(params: { initialize?: boolean } = {}) {
    const { initialize } = params
    const { details: dao } = useDao()
    const [data, setData] = useRecoilState(daoInviteListAtom)
    const { createMember } = useCreateDaoMember()
    const [status, setStatus] = useRecoilState(
        appToastStatusSelector('__createdaomember'),
    )

    const revoke = async (id: string) => {
        try {
            setData((state) => ({
                ...state,
                items: state.items.map((item) => {
                    return item.id !== id ? item : { ...item, isFetching: true }
                }),
            }))

            const { error } = await supabase.client
                .from('dao_invite')
                .update({
                    recipient_status: EDaoInviteStatus.REVOKED,
                    token_expired: true,
                })
                .eq('id', id)
            if (error) {
                throw new GoshError('Token revoke error', error.message)
            }

            setData((state) => ({
                ...state,
                items: state.items.filter((item) => item.id !== id),
            }))
        } catch (e: any) {
            throw e
        } finally {
            setData((state) => ({
                ...state,
                items: state.items.map((item) => {
                    return item.id !== id ? item : { ...item, isFetching: false }
                }),
            }))
        }
    }

    const create = async (item: TDaoInviteListItem) => {
        try {
            if (!item.username) {
                throw new GoshError('Value error', 'Username is undefined')
            }

            setData((state) => ({
                ...state,
                items: state.items.map((i) => {
                    return i.id !== item.id ? i : { ...item, isFetching: true }
                }),
            }))

            // Create DAO member
            await createMember(
                [
                    {
                        user: { name: item.username, type: 'user' },
                        allowance: item.allowance || 0,
                        comment: item.comment,
                    },
                ],
                true,
            )

            // Update database
            const { error } = await supabase.client
                .from('dao_invite')
                .update({
                    recipient_status: EDaoInviteStatus.PROPOSAL_CREATED,
                    token_expired: true,
                })
                .eq('id', item.id)
            if (error) {
                throw new Error(error.message)
            }

            setData((state) => ({
                ...state,
                items: state.items.filter((i) => i.id !== item.id),
            }))
        } catch (e: any) {
            setStatus((state) => ({ ...state, type: 'error', data: e }))
            throw e
        } finally {
            setData((state) => ({
                ...state,
                items: state.items.map((i) => {
                    return i.id !== item.id ? i : { ...item, isFetching: false }
                }),
            }))
        }
    }

    const getInviteList = useCallback(async () => {
        try {
            setData((state) => ({ ...state, isFetching: true }))

            const { data, error } = await supabase.client
                .from('dao_invite')
                .select(`*`)
                .eq('dao_name', dao.name)
                .not('token_expired', 'eq', true)
                .or(
                    [
                        'recipient_status.is.null',
                        `recipient_status.eq.${EDaoInviteStatus.ACCEPTED}`,
                    ].join(','),
                )
                .order('created_at', { ascending: false })
            if (error) {
                throw new Error(error.message)
            }

            setData((state) => ({
                ...state,
                items: (data || []).map((item) => ({
                    id: item.id,
                    token: item.token,
                    username: item.recipient_username,
                    email: item.recipient_email,
                    status: item.recipient_status,
                    allowance: item.recipient_allowance,
                    comment: item.recipient_comment,
                })),
            }))
        } catch (e: any) {
            setData((state) => ({ ...state, error: e }))
        } finally {
            setData((state) => ({ ...state, isFetching: false }))
        }
    }, [dao.name])

    useEffect(() => {
        if (initialize) {
            getInviteList()
        }
    }, [getInviteList, initialize])

    return {
        ...data,
        isEmpty: !data.isFetching && !data.items.length,
        getInviteList,
        revoke,
        create,
        createStatus: status,
    }
}

export function useDaoTaskList(params: { count?: number; initialize?: boolean } = {}) {
    const { count = 10, initialize } = params
    const { details: dao } = useDao()
    const member = useDaoMember()
    const [data, setData] = useRecoilState(daoTaskListSelector(dao.name))

    const getBlockchainItems = async (params: {
        daoname: string
        daoaddr: string
        limit: number
        cursor?: string
    }) => {
        const { daoname, daoaddr, limit, cursor } = params
        const sc = getSystemContract()

        const codes = [
            await sc.getDaoTaskTagCodeHash(daoaddr, SYSTEM_TAG),
            await sc.getDaoTaskTagCodeHash(daoaddr, MILESTONE_TAG),
        ]
        const { results, lastId, completed } = await getPaginatedAccounts({
            filters: [`code_hash: {in: ${JSON.stringify(codes)}}`],
            result: ['code_hash'],
            limit,
            lastId: cursor,
        })

        const items = await executeByChunk<
            { id: string; code_hash: string },
            TTaskDetails
        >(results, MAX_PARALLEL_READ, async ({ id, code_hash }) => {
            const isMilestone = code_hash === codes[1]
            const tag = await sc.getGoshTag({ address: id })
            const { task: address } = await tag.getDetails()

            let task: Milestone | Task
            let details: any
            if (isMilestone) {
                task = await sc.getMilestone({ address })
                details = await task.getDetails(daoname)
            } else {
                task = await sc.getTask({ address })
                details = await task.getDetails()
            }

            return {
                account: task,
                address: task.address,
                isMilestone,
                isSubtask: false,
                ...details,
            }
        })
        return { items, cursor: lastId, hasNext: !completed }
    }

    const getTaskList = useCallback(async () => {
        try {
            if (!dao.address || !dao.name) {
                return
            }
            setData((state) => ({ ...state, isFetching: true }))
            const blockchain = await getBlockchainItems({
                daoname: dao.name,
                daoaddr: dao.address,
                limit: count,
            })
            setData((state) => {
                const different = _.differenceWith(
                    blockchain.items,
                    state.items,
                    (a, b) => a.address === b.address,
                )
                const intersect = _.intersectionWith(
                    blockchain.items,
                    state.items,
                    (a, b) => a.address === b.address,
                )

                return {
                    ...state,
                    items: [...different, ...state.items].map((item) => {
                        const found = intersect.find((_item) => {
                            return _item.address === item.address
                        })
                        return found ? { ...item, ...found } : item
                    }),
                    cursor: blockchain.cursor,
                    hasNext: blockchain.hasNext,
                }
            })
        } catch (e) {
            setData((state) => ({ ...state, error: e }))
        } finally {
            setData((state) => ({ ...state, isFetching: false }))
        }
    }, [dao.address, dao.name, count])

    const getNext = useCallback(async () => {
        try {
            setData((state) => ({ ...state, isFetching: true }))
            const blockchain = await getBlockchainItems({
                daoname: dao.name!,
                daoaddr: dao.address!,
                limit: count,
                cursor: data.cursor,
            })
            setData((state) => {
                const different = _.differenceWith(
                    blockchain.items,
                    state.items,
                    (a, b) => a.address === b.address,
                )
                return {
                    ...state,
                    items: [...state.items, ...different],
                    cursor: blockchain.cursor,
                    hasNext: blockchain.hasNext,
                }
            })
        } catch (e: any) {
            throw e
        } finally {
            setData((state) => ({ ...state, isFetching: false }))
        }
    }, [dao.address, dao.name, data.cursor, member.isFetched])

    const openItem = (address: string) => {
        setData((state) => ({
            ...state,
            items: state.items.map((item) => ({
                ...item,
                subtasks: item.subtasks.map((subtask) => ({
                    ...subtask,
                    isOpen: subtask.address === address,
                })),
                isOpen: item.address === address,
            })),
        }))
    }

    const closeItems = () => {
        setData((state) => ({
            ...state,
            items: state.items.map((item) => ({
                ...item,
                subtasks: item.subtasks.map((subtask) => ({
                    ...subtask,
                    isOpen: false,
                })),
                isOpen: false,
            })),
        }))
    }

    const expandItem = (address: string) => {
        setData((state) => ({
            ...state,
            items: state.items.map((item) => {
                if (item.address !== address) {
                    return item
                }
                return { ...item, isExpanded: !item.isExpanded }
            }),
        }))
    }

    useEffect(() => {
        if (initialize) {
            getTaskList()
        }
    }, [getTaskList, initialize])

    return {
        ...data,
        openItem,
        expandItem,
        closeItems,
        getNext,
        isEmpty: !data.isFetching && !data.items.length,
    }
}

export function useCreateMilestone() {
    const { details: dao } = useDao()
    const member = useDaoMember()
    const { beforeCreateEvent } = useDaoHelpers()
    const [status, setStatus] = useRecoilState(
        appToastStatusSelector('__createmilestone'),
    )

    const createMilestone = useCallback(
        async (params: {
            reponame: string
            taskname: string
            manager: {
                username: string
                reward: number
            }
            budget: number
            lock: number
            vesting: number
            tags?: string[]
            comment?: string
        }) => {
            const month2sec = 30 * 24 * 60 * 60

            try {
                if (!dao.name) {
                    throw new GoshError('Value error', 'DAO name undefined')
                }

                setStatus((state) => ({
                    ...state,
                    type: 'pending',
                    data: 'Validating data',
                }))

                // Check if task already exists
                const account = await getSystemContract().getMilestone({
                    data: {
                        daoname: dao.name,
                        reponame: params.reponame,
                        taskname: params.taskname,
                    },
                })
                if (await account.isDeployed()) {
                    throw new GoshError('Account error', {
                        message: 'Milestone with provided name already exists',
                        name: params.taskname,
                    })
                }

                // Resolve manager username -> profile
                const manager = await AppConfig.goshroot.getUserProfile({
                    username: params.manager.username,
                })
                if (!(await manager.isDeployed())) {
                    throw new GoshError('Profile error', {
                        message: 'Manager profile does not exist',
                        username: params.manager.username,
                    })
                }

                // Calculate grant map
                const grant: { [k: string]: { t: number; g: TTaskGrantPair[] } } = {
                    manager: { t: params.manager.reward, g: [] },
                    subtask: { t: params.budget, g: [] },
                }
                for (const key of ['manager', 'subtask']) {
                    // Reward should be positive
                    if (grant[key].t <= 0) {
                        throw new GoshError('Value error', {
                            message: `Reward should greater than 0`,
                            key,
                        })
                    }

                    // No vesting period
                    let total = grant[key].t
                    if (!params.vesting) {
                        grant[key].g.push({ grant: total, lock: params.lock * month2sec })
                        continue
                    }

                    // Has vesting period
                    for (let tick = params.vesting; tick > 0; tick--) {
                        const delay = params.lock + (params.vesting - tick + 1)
                        const amount = Math.trunc(total / tick)
                        grant[key].g.push({ grant: amount, lock: delay * month2sec })
                        total -= amount
                    }
                }

                // Prepare balance for create event
                await beforeCreateEvent(20, { onPendingCallback: setStatus })

                // Create milestone create event
                // Skip `member.wallet` check, because `beforeCreate` checks it
                setStatus((state) => ({
                    ...state,
                    type: 'pending',
                    data: 'Creating milestone',
                }))
                await member.wallet!.createMilestone({
                    reponame: params.reponame,
                    taskname: params.taskname,
                    grant: {
                        assign: [],
                        review: [],
                        manager: grant.manager.g,
                        subtask: grant.subtask.g,
                    },
                    assigners: {
                        taskaddr: account.address,
                        assigner: {},
                        reviewer: {},
                        manager: { [manager.address]: true },
                        daomember: {},
                    },
                    budget: params.budget,
                    tags: params.tags,
                    comment: params.comment || `Create milestone ${params.taskname}`,
                })

                setStatus((state) => ({
                    ...state,
                    type: 'success',
                    data: {
                        title: 'Create milestone',
                        content: 'Create milestone event created',
                    },
                }))
            } catch (e: any) {
                setStatus((state) => ({ ...state, type: 'error', data: e }))
                throw e
            }
        },
        [dao.name, member.isMember, member.isReady],
    )

    return {
        createMilestone,
        status,
    }
}

export function useDeleteMilestone() {
    const member = useDaoMember()
    const { beforeCreateEvent } = useDaoHelpers()
    const [status, setStatus] = useRecoilState(
        appToastStatusSelector('__deletemilestone'),
    )

    const deleteMilestone = useCallback(
        async (params: { reponame: string; taskname: string; comment?: string }) => {
            try {
                // Prepare balance for create event
                await beforeCreateEvent(20, { onPendingCallback: setStatus })

                // Create milestone delete event
                // Skip `member.wallet` check, because `beforeCreate` checks it
                setStatus((state) => ({
                    ...state,
                    type: 'pending',
                    data: 'Deleting milestone',
                }))
                await member.wallet!.deleteMilestone({
                    reponame: params.reponame,
                    taskname: params.taskname,
                    comment: params.comment || `Delete milestone ${params.taskname}`,
                })

                setStatus((state) => ({
                    ...state,
                    type: 'success',
                    data: {
                        title: 'Delete milestone',
                        content: 'Delete milestone event created',
                    },
                }))
            } catch (e: any) {
                setStatus((state) => ({ ...state, type: 'error', data: e }))
                throw e
            }
        },
        [member.isMember, member.isReady],
    )

    return {
        deleteMilestone,
        status,
    }
}

export function useCompleteMilestone() {
    const member = useDaoMember()
    const { beforeCreateEvent } = useDaoHelpers()
    const [status, setStatus] = useRecoilState(
        appToastStatusSelector('__completemilestone'),
    )

    const completeMilestone = useCallback(
        async (params: { reponame: string; taskname: string; comment?: string }) => {
            try {
                // Prepare balance for create event
                await beforeCreateEvent(20, { onPendingCallback: setStatus })

                // Create milestone complete event
                // Skip `member.wallet` check, because `beforeCreate` checks it
                setStatus((state) => ({
                    ...state,
                    type: 'pending',
                    data: 'Completing milestone',
                }))
                await member.wallet!.completeMilestone({
                    reponame: params.reponame,
                    taskname: params.taskname,
                    comment: params.comment || `Complete milestone ${params.taskname}`,
                })

                setStatus((state) => ({
                    ...state,
                    type: 'success',
                    data: {
                        title: 'Complete milestone',
                        content: 'Complete milestone event created',
                    },
                }))
            } catch (e: any) {
                setStatus((state) => ({ ...state, type: 'error', data: e }))
                throw e
            }
        },
        [member.isMember, member.isReady],
    )

    return {
        completeMilestone,
        status,
    }
}

export function useReceiveMilestoneReward() {
    const member = useDaoMember()
    const [status, setStatus] = useRecoilState(
        appToastStatusSelector('__receivemilestonereward'),
    )

    const receiveReward = useCallback(
        async (params: { reponame: string; taskname: string }) => {
            const { reponame, taskname } = params

            try {
                if (!member.isReady || !member.wallet) {
                    throw new GoshError(
                        'Access error',
                        'Wallet does not exist or not activated',
                    )
                }

                setStatus((state) => ({
                    ...state,
                    type: 'pending',
                    data: 'Request milestone reward',
                }))
                await member.wallet!.receiveMilestoneReward({ reponame, taskname })
                setStatus((state) => ({
                    ...state,
                    type: 'success',
                    data: {
                        title: 'Request reward',
                        content: 'Milestone reward requested',
                    },
                }))
            } catch (e: any) {
                setStatus((state) => ({ ...state, type: 'error', data: e }))
                throw e
            }
        },
        [member.isReady],
    )

    return { receiveReward, status }
}

export function useCreateMilestoneTask() {
    const { details: dao } = useDao()
    const member = useDaoMember()
    const setTasks = useSetRecoilState(daoTaskListSelector(dao.name))
    const [status, setStatus] = useRecoilState(
        appToastStatusSelector('__createmilestonetask'),
    )

    const createMilestoneTask = useCallback(
        async (params: {
            milename: string
            reponame: string
            taskname: string
            reward: {
                assign: number
                review: number
                manager: number
            }
            amount: number
            tags?: string[]
        }) => {
            const { milename, reponame, reward, amount, tags } = params
            const sc = getSystemContract()
            const taskname = `${milename}:${params.taskname}`
            const sumpercent = _.sum(Object.values(reward))

            try {
                // Vars check
                if (!member.wallet) {
                    throw new GoshError('Value error', 'Member wallet undefined')
                }
                if (!dao.name) {
                    throw new GoshError('Value error', 'Dao name undefined')
                }
                if (sumpercent !== 100) {
                    throw new GoshError('Value error', {
                        message: 'Total percent sum should be equal to 100%',
                        current: sumpercent,
                    })
                }

                setStatus((state) => ({
                    ...state,
                    type: 'pending',
                    data: 'Creating milestone task',
                }))

                // Check if already exists
                const account = await sc.getTask({
                    data: { daoname: dao.name, reponame, taskname },
                })
                if (await account.isDeployed()) {
                    throw new GoshError('Account error', {
                        message: 'Task with provided name already exists',
                        name: params.taskname,
                    })
                }

                // Calculate grant map
                const milestone = await sc.getMilestone({
                    data: { daoname: dao.name, reponame, taskname: milename },
                })
                const milestoneraw = await milestone.getRawDetails()
                const lock = milestoneraw.grant.subtask.map((item: any) => {
                    return parseInt(item.lock)
                })
                const grant = getGrantMapping({ amount, percent: reward, lock })

                // Check total rewards are correct
                for (const key of ['assign', 'review', 'manager']) {
                    const { percent, int } = grant[key]
                    if ((percent > 0 && int > 0) || (percent === 0 && int === 0)) {
                        continue
                    }

                    throw new GoshError('Value error', {
                        message: 'Incorrect token distribution',
                        key,
                        percent,
                        reward: int,
                    })
                }

                // Create milestone task
                await member.wallet.createMilestoneTask({
                    milename,
                    reponame,
                    taskname,
                    grant: {
                        assign: grant.assign.list,
                        review: grant.review.list,
                        manager: grant.manager.list,
                        subtask: [],
                    },
                    amount,
                    tags,
                })
                const wait = await whileFinite(async () => {
                    return await account.isDeployed()
                })
                if (!wait) {
                    throw new GoshError('Timeout error', {
                        message: 'Create milestone task timeout',
                        name: params.taskname,
                    })
                }

                // Get details and update tasks list
                const index = await milestone.getSubtaskLastIndex()
                const details = await account.getDetails()
                setTasks((state) => ({
                    ...state,
                    items: state.items.map((item) => {
                        if (item.name !== milename) {
                            return item
                        }
                        return {
                            ...item,
                            balance: item.balance - amount,
                            subtasks: [
                                ...item.subtasks,
                                {
                                    account,
                                    address: account.address,
                                    index,
                                    milestone: {
                                        address: milestone.address,
                                        name: milename,
                                    },
                                    isMilestone: false,
                                    isSubtask: true,
                                    ...details,
                                },
                            ],
                        }
                    }),
                }))

                setStatus((state) => ({
                    ...state,
                    type: 'success',
                    data: {
                        title: 'Add milestone task',
                        content: 'Milestone task added',
                    },
                }))
            } catch (e: any) {
                setStatus((state) => ({ ...state, type: 'error', data: e }))
                throw e
            }
        },
        [dao.name, member.isMember, member.isReady],
    )

    return {
        createMilestoneTask,
        status,
    }
}

export function useDeleteMilestoneTask() {
    const { details: dao } = useDao()
    const member = useDaoMember()
    const [status, setStatus] = useRecoilState(
        appToastStatusSelector('__deletemilestonetask'),
    )

    const deleteMilestoneTask = useCallback(
        async (params: { milename: string; reponame: string; index: number }) => {
            const { milename, reponame, index } = params

            try {
                // Vars check
                if (!member.wallet) {
                    throw new GoshError('Value error', 'Member wallet undefined')
                }

                // Delete milestone task
                setStatus((state) => ({
                    ...state,
                    type: 'pending',
                    data: 'Deleting milestone task',
                }))
                await member.wallet.deleteMilestoneTask({ milename, reponame, index })
                setStatus((state) => ({
                    ...state,
                    type: 'success',
                    data: {
                        title: 'Delete milestone task',
                        content: 'Milestone task deleted',
                    },
                }))
            } catch (e: any) {
                setStatus((state) => ({ ...state, type: 'error', data: e }))
                throw e
            }
        },
        [dao.name, member.isMember, member.isReady],
    )

    return {
        deleteMilestoneTask,
        status,
    }
}

export function useCreateTask() {
    const { details: dao } = useDao()
    const member = useDaoMember()
    const { beforeCreateEvent } = useDaoHelpers()
    const [status, setStatus] = useRecoilState(appToastStatusSelector('__createtask'))

    const getTokenAmount = (cost: number, percent: number) => {
        return Math.round((cost * percent) / 100)
    }

    const getVestingPart = (
        calculated: TTaskGrantPair[],
        parts: number,
        total: number,
    ) => {
        const sum = calculated.reduce((_sum, num) => _sum + num.grant, 0)
        const part = Math.ceil((total - sum) / parts)
        const value = sum + part <= total ? part : total - (sum + part)
        return value > 0 ? value : 0
    }

    const getCalculatedGrant = (values: {
        cost: number
        assign: number
        review: number
        manager: number
        lock: number
        vesting: number
    }) => {
        const { cost, assign, review, manager, lock, vesting } = values

        const lockSec = lock * 30 * 24 * 60 * 60
        const assignTokens = getTokenAmount(cost, assign)
        const reviewTokens = getTokenAmount(cost, review)
        const managerTokens = getTokenAmount(cost, manager)

        const struct: TTaskGrant = { assign: [], review: [], manager: [], subtask: [] }
        if (!vesting) {
            struct.assign.push({ grant: assignTokens, lock: lockSec })
            struct.review.push({ grant: reviewTokens, lock: lockSec })
            struct.manager.push({ grant: managerTokens, lock: lockSec })
            return struct
        }

        // Vesting calculate
        for (let i = 1; i <= vesting; i++) {
            const vLock = lockSec + i * 30 * 24 * 60 * 60
            const parts = i === 1 ? vesting : vesting - i + 1

            const vAssign = getVestingPart(struct.assign, parts, assignTokens)
            struct.assign.push({ grant: vAssign, lock: vLock })

            const vReview = getVestingPart(struct.review, parts, reviewTokens)
            struct.review.push({ grant: vReview, lock: vLock })

            const vManager = getVestingPart(struct.manager, parts, managerTokens)
            struct.manager.push({ grant: vManager, lock: vLock })
        }
        return struct
    }

    const createTask = useCallback(
        async (params: {
            reponame: string
            taskname: string
            cost: number
            assign: number
            review: number
            manager: number
            lock: number
            vesting: number
            tags?: string[]
            comment?: string
        }) => {
            try {
                if (!dao.name) {
                    throw new GoshError('Value error', 'DAO name undefined')
                }

                setStatus((state) => ({
                    ...state,
                    type: 'pending',
                    data: 'Validating data',
                }))

                // Get task config
                const grant = getCalculatedGrant(params)

                // Validate task config
                const errTitle = 'Incorrect vesting schema'
                const errMessage = `has not enough tokens to pay all periods`
                if (grant.assign.slice(-1)[0].grant === 0) {
                    throw new GoshError(errTitle, `Assigner ${errMessage}`)
                }
                if (grant.review.slice(-1)[0].grant === 0) {
                    throw new GoshError(errTitle, `Reviewer ${errMessage}`)
                }
                if (grant.manager.slice(-1)[0].grant === 0) {
                    throw new GoshError(errTitle, `Manager ${errMessage}`)
                }

                // Check if task already exists
                const account = await getSystemContract().getTask({
                    data: {
                        daoname: dao.name,
                        reponame: params.reponame,
                        taskname: params.taskname,
                    },
                })
                if (await account.isDeployed()) {
                    throw new GoshError('Create task error', {
                        message: 'Task with provided name already exists',
                        name: params.taskname,
                    })
                }

                // Prepare balance for create event
                await beforeCreateEvent(20, { onPendingCallback: setStatus })

                // Create task create event
                // Skip `member.wallet` check, because `beforeCreate` checks it
                setStatus((state) => ({
                    ...state,
                    type: 'pending',
                    data: 'Creating task',
                }))
                await member.wallet!.createTask({
                    reponame: params.reponame,
                    taskname: params.taskname,
                    config: grant,
                    tags: params.tags,
                    comment: params.comment,
                })

                setStatus((state) => ({
                    ...state,
                    type: 'success',
                    data: {
                        title: 'Create task',
                        content: 'Create task event created',
                    },
                }))
            } catch (e: any) {
                setStatus((state) => ({ ...state, type: 'error', data: e }))
                throw e
            }
        },
        [dao.name, member.isMember, member.isReady],
    )

    return {
        status,
        createTask,
        getTokenAmount,
    }
}

export function useDeleteTask() {
    const member = useDaoMember()
    const { beforeCreateEvent } = useDaoHelpers()
    const [status, setStatus] = useRecoilState(appToastStatusSelector('__deletetask'))

    const deleteTask = useCallback(
        async (params: { reponame: string; taskname: string; comment?: string }) => {
            const { reponame, taskname, comment } = params

            try {
                // Prepare balance for create event
                await beforeCreateEvent(20, { onPendingCallback: setStatus })

                // Create task delete event
                // Skip `member.wallet` check, because `beforeCreate` checks it
                setStatus((state) => ({
                    ...state,
                    type: 'pending',
                    data: 'Deleting task',
                }))
                await member.wallet!.deleteTask({ reponame, taskname, comment })

                setStatus((state) => ({
                    ...state,
                    type: 'success',
                    data: {
                        title: 'Delete task',
                        content: 'Delete task event created',
                    },
                }))
            } catch (e: any) {
                setStatus((state) => ({ ...state, type: 'error', data: e }))
                throw e
            }
        },
        [member.isMember, member.isReady],
    )

    return { deleteTask, status }
}

export function useReceiveTaskReward() {
    const member = useDaoMember()
    const [status, setStatus] = useRecoilState(
        appToastStatusSelector('__receivetaskreward'),
    )

    const receiveReward = useCallback(
        async (params: { reponame: string; taskname: string }) => {
            const { reponame, taskname } = params

            try {
                if (!member.isReady || !member.wallet) {
                    throw new GoshError(
                        'Access error',
                        'Wallet does not exist or not activated',
                    )
                }

                setStatus((state) => ({
                    ...state,
                    type: 'pending',
                    data: 'Request task reward',
                }))
                await member.wallet!.receiveTaskReward({ reponame, taskname })
                setStatus((state) => ({
                    ...state,
                    type: 'success',
                    data: {
                        title: 'Request reward',
                        content: 'Task reward requested',
                    },
                }))
            } catch (e: any) {
                setStatus((state) => ({ ...state, type: 'error', data: e }))
                throw e
            }
        },
        [member.isReady],
    )

    return { receiveReward, status }
}

export function useTask(
    address: string,
    options: { initialize?: boolean; subscribe?: boolean } = {},
) {
    const { initialize, subscribe } = options
    const { details: dao } = useDao()
    const [tasks, setTasks] = useRecoilState(daoTaskListSelector(dao.name))
    const task = useRecoilValue(daoTaskSelector(address))
    const [error, setError] = useState<any>()

    const checkExists = async (account: Task) => {
        if (!(await account.isDeployed())) {
            // Close if opened
            setTasks((state) => ({
                ...state,
                items: state.items.map((item) => {
                    // Update simple task or milestone
                    if (item.address === account.address) {
                        return { ...item, isOpen: false, isDeleted: true }
                    }

                    // Update milestone subtask
                    return {
                        ...item,
                        subtasks: item.subtasks.map((subitem) => ({
                            ...subitem,
                            isOpen:
                                subitem.address === account.address
                                    ? false
                                    : subitem.isOpen,
                            isDeleted: subitem.address === account.address,
                        })),
                    }
                }),
            }))

            // Remove from list after short delay to allow state read
            await sleep(300)
            setTasks((state) => ({
                ...state,
                items: state.items
                    .filter((item) => {
                        // Filter simple task or milestone
                        return item.address !== account.address
                    })
                    .map((item) => {
                        // Filter milestone tasks if current task is subtask
                        const subfound = item.subtasks.find((subitem) => {
                            return subitem.address === account.address
                        })
                        const filtered = subfound
                            ? item.subtasks.filter((subitem) => {
                                  return subitem.address !== account.address
                              })
                            : item.subtasks

                        return { ...item, subtasks: filtered }
                    }),
            }))
            return false
        }
        return true
    }

    const getTaskData = async (account: Task) => {
        try {
            if (!(await checkExists(account))) {
                return
            }

            const verbose = await account.getDetails()
            setTasks((state) => ({
                ...state,
                items: state.items.map((item) => {
                    if (item.address === account.address) {
                        return { ...item, ...verbose }
                    }

                    return {
                        ...item,
                        subtasks: item.subtasks.map((subtask) => {
                            if (subtask.address === account.address) {
                                return { ...subtask, ...verbose }
                            }
                            return subtask
                        }),
                    }
                }),
            }))
        } catch (e: any) {
            setError(e)
        }
    }

    const getTask = useCallback(async () => {
        if (!address) {
            return
        }

        try {
            // Search for task in task list state atom
            let found = tasks.items.find((item) => item.address === address)

            // Fetch task details from blockchain
            if (!found) {
                const account = await getSystemContract().getTask({ address })
                const details = await account.getDetails()
                found = {
                    account,
                    address,
                    isMilestone: false,
                    isSubtask: false,
                    ...details,
                }
                setTasks((state) => ({
                    ...state,
                    items: [...state.items, { ...found! }],
                }))
            }
        } catch (e: any) {
            setError(e)
        }
    }, [address])

    useEffect(() => {
        if (initialize) {
            getTask()
        }
    }, [getTask, initialize])

    useEffect(() => {
        const _subscribe = async () => {
            if (!task?.address || !task.account) {
                return
            }

            await task.account.account.subscribeMessages('body', async ({ body }) => {
                const decoded = await task.account!.decodeMessageBody(body, 0)
                const triggers = ['destroy', 'isReady', 'getGrant']
                if (decoded && triggers.indexOf(decoded.name) >= 0) {
                    await getTaskData(task.account! as Task)
                }
            })
        }

        const _checkExists = () => {
            if (!task?.address || !task.account) {
                return
            }

            const interval = setLockableInterval(async () => {
                if (!(await checkExists(task.account! as Task))) {
                    clearInterval(interval)
                }
            }, 10000)
            return interval
        }

        let interval: any
        if (subscribe) {
            _subscribe()
            interval = _checkExists()
        }

        return () => {
            if (subscribe) {
                task?.account?.account.free()
                clearInterval(interval)
            }
        }
    }, [task?.address, subscribe])

    return { task, error }
}

export function useMilestone(
    address: string,
    options: { initialize?: boolean; subscribe?: boolean } = {},
) {
    const { initialize, subscribe } = options
    const { details: dao } = useDao()
    const [tasks, setTasks] = useRecoilState(daoTaskListSelector(dao.name))
    const task = useRecoilValue(daoTaskSelector(address))
    const [error, setError] = useState<any>()

    const checkExists = async (account: Milestone) => {
        if (!(await account.isDeployed())) {
            // Close if opened
            setTasks((state) => ({
                ...state,
                items: state.items.map((item) => {
                    if (item.address === account.address) {
                        return { ...item, isOpen: false, isDeleted: true }
                    }
                    return item
                }),
            }))

            // Remove from list after short delay to allow state read
            await sleep(300)
            setTasks((state) => ({
                ...state,
                items: state.items.filter((item) => {
                    return item.address !== account.address
                }),
            }))
            return false
        }
        return true
    }

    const getMilestoneData = async (daoname: string, account: Milestone) => {
        try {
            if (!(await checkExists(account))) {
                return
            }

            const verbose = await account.getDetails(daoname)
            setTasks((state) => ({
                ...state,
                items: state.items.map((item) => {
                    if (item.address === account.address) {
                        return { ...item, ...verbose }
                    }
                    return item
                }),
            }))
        } catch (e: any) {
            setError(e)
        }
    }

    const getMilestone = useCallback(async () => {
        if (!address || !dao.name) {
            return
        }

        try {
            // Search for task in task list state atom
            let found = tasks.items.find((item) => item.address === address)

            // Fetch task details from blockchain
            if (!found) {
                const account = await getSystemContract().getMilestone({ address })
                const details = await account.getDetails(dao.name)
                found = {
                    account,
                    address,
                    isMilestone: true,
                    isSubtask: false,
                    ...details,
                }
                setTasks((state) => ({
                    ...state,
                    items: [...state.items, { ...found! }],
                }))
            }
        } catch (e: any) {
            setError(e)
        }
    }, [address, dao.name])

    useEffect(() => {
        if (initialize) {
            getMilestone()
        }
    }, [getMilestone, initialize])

    useEffect(() => {
        const _subscribe = async () => {
            if (!dao.name || !task?.address || !task.account) {
                return
            }

            await task.account.account.subscribeMessages('body', async ({ body }) => {
                const decoded = await task.account!.decodeMessageBody(body, 0)
                const triggers = ['destroy', 'isReady', 'getGrant']
                if (decoded && triggers.indexOf(decoded.name) >= 0) {
                    await getMilestoneData(dao.name!, task.account! as Milestone)
                }
            })
        }

        const _checkExists = () => {
            if (!task?.address || !task.account) {
                return
            }

            const interval = setLockableInterval(async () => {
                if (!(await checkExists(task.account! as Milestone))) {
                    clearInterval(interval)
                }
            }, 10000)
            return interval
        }

        let interval: any
        if (subscribe) {
            _subscribe()
            interval = _checkExists()
        }

        return () => {
            if (subscribe) {
                task?.account?.account.free()
                clearInterval(interval)
            }
        }
    }, [dao.name, task?.address, subscribe])

    return { task, error }
}
