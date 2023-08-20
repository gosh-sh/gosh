import { useCallback, useEffect, useState } from 'react'
import _ from 'lodash'
import { useProfile, useUser } from './user.hooks'
import { EGoshError, GoshError } from '../../errors'
import { AppConfig } from '../../appconfig'
import { getSystemContract } from '../blockchain/helpers'
import { supabase } from '../../supabase'
import { Buffer } from 'buffer'
import { executeByChunk, splitByChunk, whileFinite } from '../../utils'
import {
    DAO_TOKEN_TRANSFER_TAG,
    DISABLED_VERSIONS,
    MAX_PARALLEL_READ,
    MAX_PARALLEL_WRITE,
    SYSTEM_TAG,
    VESTING_BALANCE_TAG,
} from '../../constants'
import {
    useRecoilState,
    useRecoilValue,
    useResetRecoilState,
    useSetRecoilState,
} from 'recoil'
import {
    daoDetailsAtom,
    daoEventListAtom,
    daoEventSelector,
    daoInviteListAtom,
    daoMemberAtom,
    daoMemberListAtom,
    daoTaskListAtom,
    daoTaskSelector,
    userDaoListAtom,
} from '../store/dao.state'
import {
    EDaoMemberType,
    ETaskReward,
    TDaoDetailsMemberItem,
    TDaoEventDetails,
    TDaoInviteListItem,
    TDaoListItem,
    TDaoMemberListItem,
    TTaskDetails,
    TTaskGrant,
    TTaskGrantPair,
} from '../types/dao.types'
import { useParams } from 'react-router-dom'
import { Dao } from '../blockchain/dao'
import { UserProfile } from '../../blockchain/userprofile'
import { DaoWallet } from '../blockchain/daowallet'
import { EDaoEventType, TToastStatus } from '../../types/common.types'
import { getAllAccounts, getPaginatedAccounts } from '../../blockchain/utils'
import { DaoEvent } from '../blockchain/daoevent'
import { GoshAdapterFactory } from 'react-gosh'
import { daoRepositoryListAtom } from '../store/repository.state'
import { TSystemContract } from '../../types/blockchain.types'
import { TGoshCommitTag } from '../types/repository.types'
import { GoshRepository } from '../blockchain/repository'
import { EDaoInviteStatus } from '../types/onboarding.types'
import { Task } from '../blockchain/task'
import { AggregationFn } from '@eversdk/core'
import { SystemContract } from '../blockchain/systemcontract'
import { appToastStatusSelector } from '../../store/app.state'

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
            const systemContract = getSystemContract()

            if (!profile || !user.keys) {
                throw new GoshError('Access error', {
                    message: 'You might not be authenticated',
                })
            }

            // Create DAO
            setStatus((state) => ({ ...state, type: 'pending', data: 'Create DAO' }))
            const dao = (await profile.createDao(systemContract, name, [
                profile.address,
            ])) as Dao
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
            const repository = (await systemContract.getRepository({
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

export function useUserDaoList(params: { count?: number; loadOnInit?: boolean } = {}) {
    const { count = 10, loadOnInit } = params
    const { user } = useUser()
    const profile = useProfile()
    const [data, setData] = useRecoilState(userDaoListAtom)

    const getOnboardingItems = async (username: string) => {
        const { data, error } = await supabase.client
            .from('users')
            .select(`*, github (updated_at, gosh_url)`)
            .eq('gosh_username', username)
        if (error) {
            throw new GoshError('Get onboarding data', error.message)
        }
        if (!data?.length) {
            return []
        }

        const imported: { [name: string]: string[] } = {}
        const row = data[0]
        for (const item of row.github) {
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
                const systemContract = AppConfig.goshroot.getSystemContract(ver)
                const account = (await systemContract.getDao({ address: goshdao })) as Dao
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
            const onboarding = await getOnboardingItems(user.username)

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
            const composed = [
                ...onboarding.map(({ name, repos }) => ({
                    account: null,
                    name,
                    address: '',
                    version: '',
                    supply: -1,
                    members: -1,
                    onboarding: repos,
                })),
                ...blockchain.items,
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
        if (loadOnInit) {
            getUserDaoList()
        }
    }, [getUserDaoList, loadOnInit])

    return {
        ...data,
        items: [...data.items].sort((a, b) => (a.name > b.name ? 1 : -1)),
        isEmpty: !data.isFetching && !data.items.length,
        getNext,
    }
}

export function useDao(params: { loadOnInit?: boolean; subscribe?: boolean } = {}) {
    const { loadOnInit, subscribe } = params
    const { daoname } = useParams()
    const [data, setData] = useRecoilState(daoDetailsAtom)
    const resetDao = useResetRecoilState(daoDetailsAtom)
    const resetDaoRepositories = useResetRecoilState(daoRepositoryListAtom)
    const resetDaoEvents = useResetRecoilState(daoEventListAtom)
    const resetDaoMembers = useResetRecoilState(daoMemberListAtom)
    const resetDaoMember = useResetRecoilState(daoMemberAtom)
    const resetDaoTasks = useResetRecoilState(daoTaskListAtom)

    const getDao = useCallback(async () => {
        try {
            if (!daoname) {
                throw new GoshError('DAO name undefined')
            }

            setData((state) => ({ ...state, isFetching: true }))
            const systemContract = getSystemContract()
            const dao = await systemContract.getDao({ name: daoname })
            if (!(await dao.isDeployed())) {
                throw new GoshError('DAO does not exist', { name: daoname })
            }
            const version = await dao.getVersion()
            const repository = await systemContract.getRepository({
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
            getDetails({ dao, repository })
        } catch (e) {
            setData((state) => ({ ...state, error: e }))
            throw e
        } finally {
            setData((state) => ({ ...state, isFetching: false }))
        }
    }, [daoname])

    const getDetails = async (params: { dao: Dao; repository: GoshRepository }) => {
        const { dao, repository } = params

        if (!dao) {
            return
        }

        try {
            setData((state) => ({ ...state, isFetchingData: true }))

            const daoname = await dao.getName()
            const details = await dao.getDetails()
            const members = await dao.getMembers({
                parse: { wallets: details.wallets, daomembers: details.daoMembers },
            })
            const isMemberOf = await dao.getMembers({
                parse: { wallets: details.my_wallets, daomembers: {} },
                isDaoMemberOf: true,
            })
            const tasks = await getTaskCount(dao)
            const { summary, description } = await getDescription(daoname, repository)

            setData((state) => ({
                ...state,
                details: {
                    ...state.details,
                    members,
                    supply: {
                        reserve: parseInt(details.reserve),
                        voting: parseInt(details.allbalance),
                        total: parseInt(details.totalsupply),
                    },
                    owner: details.pubaddr,
                    tags: Object.values(details.hashtag),
                    tasks,
                    summary,
                    description,
                    isMemberOf,
                    isMintOn: details.allowMint,
                    isAskMembershipOn: details.abilityInvite,
                    isEventDiscussionOn: details.allow_discussion_on_proposals,
                    isEventProgressOn: !details.hide_voting_results,
                    isRepoUpgraded: details.isRepoUpgraded,
                    isTaskUpgraded: details.isTaskUpgraded,
                    isUpgraded: details.isRepoUpgraded && details.isTaskUpgraded,
                },
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

        const [summary, description] = await Promise.all(
            ['description.txt', 'README.md'].map(async (filename) => {
                const snapshot = await repository.getSnapshot({
                    data: { branch: 'main', filename },
                })
                if (await snapshot.isDeployed()) {
                    const result = await snapshot.getContent()
                    if (!Buffer.isBuffer(result.content)) {
                        return result.content
                    }
                }
                return ''
            }),
        )
        return { summary, description }
    }

    const getTaskCount = async (dao: Dao) => {
        const codeHash = await getSystemContract().getDaoTaskTagCodeHash(
            dao.address,
            SYSTEM_TAG,
        )
        const { values } = await dao.account.client.net.aggregate_collection({
            collection: 'accounts',
            filter: { code_hash: { eq: codeHash } },
            fields: [{ field: 'id', fn: AggregationFn.COUNT }],
        })
        return parseInt(values[0])
    }

    useEffect(() => {
        if (loadOnInit) {
            getDao()
        }

        return () => {
            if (loadOnInit) {
                resetDao()
                resetDaoRepositories()
                resetDaoEvents()
                resetDaoTasks()
                resetDaoMembers()
                resetDaoMember()
            }
        }
    }, [getDao, loadOnInit])

    useEffect(() => {
        if (!subscribe || !data.details.address) {
            return
        }

        let intervalBusy = false
        const interval = setInterval(async () => {
            if (intervalBusy) {
                return
            }

            intervalBusy = true
            await getDetails({
                dao: data.details.account!,
                repository: data.details.repository!,
            })
            intervalBusy = false
        }, 15000)

        return () => {
            clearInterval(interval)
        }
    }, [subscribe, data.details.address])

    return data
}

export function useDaoMember(params: { loadOnInit?: boolean; subscribe?: boolean } = {}) {
    const { loadOnInit, subscribe } = params
    const { user } = useUser()
    const { details: dao } = useRecoilValue(daoDetailsAtom)
    const [data, setData] = useRecoilState(daoMemberAtom)
    const setStatus0 = useSetRecoilState(appToastStatusSelector('__activatedaowallet'))
    const setStatus1 = useSetRecoilState(
        appToastStatusSelector('__transferprevdaotokens'),
    )

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
        activate(profile, wallet)
        setData((state) => ({
            ...state,
            profile,
            wallet: walletDeployed ? wallet : null,
            allowance: found?.allowance || 0,
            vesting: null,
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
        const repository = await sc.getRepository({
            path: `${dao.name}/${DAO_TOKEN_TRANSFER_TAG}`,
        })
        const stoptag = await sc.getCommitTag({
            data: { repoaddr: repository.address, tagname },
        })
        if (stoptag) {
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
            const { voting, locked, regular } = await walletPrev.getBalance()
            const untransferred = Math.max(voting, locked) + regular
            if (untransferred > 0) {
                transfer.push({ wallet: walletPrev, amount: untransferred })
            }

            daoaddrPrev = await daoPrev.getPrevious()
        }

        // Transfer tokens to current DAO
        await Promise.all(
            transfer.map(async ({ wallet, amount }) => {
                await wallet.smvReleaseTokens()
                await wallet.smvUnlockTokens(0)
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

    const getVestingBalance = useCallback(async () => {
        if (!dao.address || !user.profile || !user.username || !data.wallet) {
            return
        }

        const sc = getSystemContract()
        const tagname = `${VESTING_BALANCE_TAG}:${user.username}`

        // Get current tag
        const repository = await sc.getRepository({
            path: `${dao.name}/${VESTING_BALANCE_TAG}`,
        })
        const vestingtag = await sc.getCommitTag({
            data: { repoaddr: repository.address, tagname },
        })
        if (vestingtag) {
            const data = await vestingtag.getDetails()
            setData((state) => ({ ...state, vesting: parseInt(data.content) }))
        }

        // Get all DAO tasks
        const code = await sc.getDaoTaskTagCodeHash(dao.address, SYSTEM_TAG)
        const result = await getAllAccounts({
            filters: [`code_hash: {eq:"${code}"}`],
        })
        const tasks = await executeByChunk(result, 30, async ({ id }) => {
            const tag = await sc.getGoshTag({ address: id })
            const data = await tag.getDetails()
            const task = await sc.getTask({ address: data.task })
            return await task.runLocal('getStatus', {})
        })

        // Calculate balance
        let _balance = 0
        for (const task of tasks) {
            if (task.candidates.length === 0) {
                continue
            }

            for (const key of ['assign', 'review', 'manager']) {
                const profiles = Object.keys(task.candidates[0][`pubaddr${key}`])
                if (profiles.indexOf(user.profile) >= 0) {
                    for (const { grant } of task.grant[key]) {
                        _balance += Math.floor(parseInt(grant) / profiles.length)
                    }
                }
            }
        }
        setData((state) => ({ ...state, vesting: _balance }))

        // Update tag
        if (await vestingtag?.isDeployed()) {
            await data.wallet.deleteCommitTag({
                reponame: VESTING_BALANCE_TAG,
                tagname,
            })
        }
        if (!(await vestingtag?.isDeployed())) {
            await data.wallet.createCommitTag({
                reponame: VESTING_BALANCE_TAG,
                name: tagname,
                content: _balance.toString(),
                commit: {
                    address: user.profile,
                    name: user.username,
                },
            })
        }
    }, [dao.address, dao.tasks, user.profile, user.username, data.isReady])

    useEffect(() => {
        if (loadOnInit) {
            getBaseDetails()
        }
    }, [getBaseDetails, loadOnInit])

    useEffect(() => {
        if (loadOnInit) {
            getDetails()
        }
    }, [getDetails, loadOnInit])

    useEffect(() => {
        if (!subscribe) {
            return
        }

        let intervalBusy = false
        const interval = setInterval(async () => {
            if (intervalBusy) {
                return
            }

            intervalBusy = true
            await getDetails()
            intervalBusy = false
        }, 15000)

        return () => {
            clearInterval(interval)
        }
    }, [getDetails, subscribe])

    useEffect(() => {
        if (!subscribe) {
            return
        }

        transferTokensFromPrevDao()
        let isIntervalBusy = false
        const interval = setInterval(async () => {
            if (isIntervalBusy) {
                return
            }

            isIntervalBusy = true
            const { retry } = await transferTokensFromPrevDao()
            isIntervalBusy = false
            if (!retry) {
                clearInterval(interval)
            }
        }, 20000)

        return () => {
            clearInterval(interval)
        }
    }, [transferTokensFromPrevDao, subscribe])

    useEffect(() => {
        if (!subscribe) {
            return
        }

        getVestingBalance()
    }, [getVestingBalance, subscribe])

    return data
}

export function useDaoMemberList(params: { loadOnInit?: boolean } = {}) {
    const { loadOnInit } = params
    const { details: dao } = useRecoilValue(daoDetailsAtom)
    const [data, setData] = useRecoilState(daoMemberListAtom)

    const getMemberList = useCallback(async () => {
        try {
            setData((state) => ({ ...state, isFetching: true }))
            const items = await executeByChunk<TDaoDetailsMemberItem, TDaoMemberListItem>(
                dao.members || [],
                MAX_PARALLEL_READ,
                async (item) => {
                    const { profile } = item
                    const username = await profile.getName()
                    const { voting, locked, regular } = await item.wallet.getBalance()
                    return {
                        ...item,
                        username,
                        balance: Math.max(voting, locked) + regular,
                        isFetching: false,
                    }
                },
            )
            setData((state) => ({ ...state, items }))
        } catch (e: any) {
            setData((state) => ({ ...state, error: e }))
        } finally {
            setData((state) => ({ ...state, isFetching: false }))
        }
    }, [dao.address, dao.members?.length])

    useEffect(() => {
        if (loadOnInit) {
            getMemberList()
        }
    }, [getMemberList, loadOnInit])

    return {
        ...data,
        items: [...data.items].sort((a, b) => (a.username > b.username ? -1 : 1)),
    }
}

export function useDaoHelpers() {
    const { details: dao } = useRecoilValue(daoDetailsAtom)
    const member = useRecoilValue(daoMemberAtom)

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
    const { details: dao } = useRecoilValue(daoDetailsAtom)
    const member = useRecoilValue(daoMemberAtom)
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
                        return { profile, allowance: 0 }
                    })
                    const daonames = _.flatten(profiles.map(({ daonames }) => daonames))
                    await member.wallet!.createDaoMember({ members, daonames, comment })
                } else {
                    const memberAddCells = profiles.map(({ profile, daonames }) => ({
                        type: EDaoEventType.DAO_MEMBER_ADD,
                        params: { members: [{ profile, allowance: 0 }], daonames },
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
    const { details: dao } = useRecoilValue(daoDetailsAtom)
    const member = useRecoilValue(daoMemberAtom)
    const setMemberList = useSetRecoilState(daoMemberListAtom)
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
    const { details: dao } = useRecoilValue(daoDetailsAtom)
    const member = useRecoilValue(daoMemberAtom)
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

export function useDaoEventList(params: { count?: number; loadOnInit?: boolean } = {}) {
    const { count = 10, loadOnInit } = params
    const { details: dao } = useRecoilValue(daoDetailsAtom)
    const member = useRecoilValue(daoMemberAtom)
    const [data, setData] = useRecoilState(daoEventListAtom)

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
            limit,
            lastId: cursor,
        })
        const items = await executeByChunk<{ id: string }, TDaoEventDetails>(
            results,
            MAX_PARALLEL_READ,
            async ({ id }) => {
                const account = await dao.getEvent({ address: id })
                const details = await account.getDetails({ wallet })
                return {
                    account,
                    address: id,
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
                    (a, b) => {
                        return a.address === b.address
                    },
                )
                const intersect = _.intersectionWith(
                    blockchain.items,
                    state.items,
                    (a, b) => {
                        return a.address === b.address
                    },
                )
                return {
                    ...state,
                    items: [...different, ...state.items].map((item) => {
                        const found = intersect.find(
                            (_item) => _item.address === item.address,
                        )
                        return { ...item, ...found } || item
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
                    (a, b) => {
                        return a.address === b.address
                    },
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
        if (loadOnInit) {
            getEventList()
        }
    }, [getEventList, loadOnInit])

    return {
        openItem,
        closeItems,
        getNext,
        ...data,
        items: [...data.items].sort((a, b) => (a.address > b.address ? 1 : -1)),
        isEmpty: !data.isFetching && !data.items.length,
    }
}

export function useDaoEvent(
    address: string,
    options: { loadOnInit?: boolean; subscribe?: boolean } = {},
) {
    const { loadOnInit, subscribe } = options
    const { details: dao } = useRecoilValue(daoDetailsAtom)
    const member = useRecoilValue(daoMemberAtom)
    const [events, setEvents] = useRecoilState(daoEventListAtom)
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
                found = { account, address, ...found, ...details }
                setEvents((state) => {
                    const updated = [...state.items]
                    if (!updated.find(({ address }) => address === found?.address)) {
                        updated.push(found!)
                    }

                    return {
                        ...state,
                        items: updated.map((item) => {
                            if (item.address === address) {
                                return { ...item, ...found }
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
        if (loadOnInit) {
            getEvent()
        }
    }, [getEvent, loadOnInit])

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
    const member = useRecoilValue(daoMemberAtom)

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
    const member = useRecoilValue(daoMemberAtom)
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
    const dao = useRecoilValue(daoDetailsAtom)
    const member = useRecoilValue(daoMemberAtom)
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

    const upgrade = async (version: string, comment: string) => {
        try {
            setStatus((state) => ({ ...state, type: 'pending', data: 'Creating event' }))
            if (Object.keys(AppConfig.versions).indexOf(version) < 0) {
                throw new GoshError(
                    'Upgrade error',
                    `Gosh version ${version} is not supported`,
                )
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
    }

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
        const codeHashes = await executeByChunk(
            repositories,
            MAX_PARALLEL_READ,
            async ({ name }) => ({
                reponame: name,
                codehash: await daoprev.account.getTaskCodeHash(name),
            }),
        )

        // Transfer tasks
        setStatus((state) => ({ ...state, type: 'pending', data: 'Upgrade tasks' }))
        const systemContract = AppConfig.goshroot.getSystemContract(
            daoprev.version,
        ) as SystemContract

        // Prepare cells
        const cells: { type: number; params: any }[] = []
        for (const { reponame, codehash } of codeHashes) {
            const accounts = await getAllAccounts({
                filters: [`code_hash: {eq:"${codehash}"}`],
                result: ['id', 'data'],
            })
            const items = await executeByChunk(
                accounts,
                MAX_PARALLEL_READ,
                async ({ id, data }) => {
                    const task = await systemContract.getTask({ address: id })
                    const decoded = await task.decodeAccountData(data)
                    return {
                        type: EDaoEventType.TASK_REDEPLOY,
                        params: { accountData: decoded, reponame },
                    }
                },
            )
            cells.push(...items)
        }
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
    const { details: dao } = useRecoilValue(daoDetailsAtom)
    const member = useRecoilValue(daoMemberAtom)
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
    const { details: dao } = useRecoilValue(daoDetailsAtom)
    const member = useRecoilValue(daoMemberAtom)
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
    const { details: dao } = useRecoilValue(daoDetailsAtom)
    const member = useRecoilValue(daoMemberAtom)
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
    const { details: dao } = useRecoilValue(daoDetailsAtom)
    const member = useRecoilValue(daoMemberAtom)
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

export function useDaoInviteList(params: { loadOnInit?: boolean } = {}) {
    const { loadOnInit } = params
    const { details: dao } = useRecoilValue(daoDetailsAtom)
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
            await createMember([
                {
                    user: {
                        name: item.username,
                        type: 'user',
                    },
                    allowance: item.allowance || 0,
                    comment: item.comment,
                },
            ])

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
        if (loadOnInit) {
            getInviteList()
        }
    }, [getInviteList, loadOnInit])

    return {
        ...data,
        isEmpty: !data.isFetching && !data.items.length,
        getInviteList,
        revoke,
        create,
        createStatus: status,
    }
}

export function useDaoTaskList(params: { count?: number; loadOnInit?: boolean } = {}) {
    const { count = 10, loadOnInit } = params
    const { details: dao } = useRecoilValue(daoDetailsAtom)
    const member = useRecoilValue(daoMemberAtom)
    const [data, setData] = useRecoilState(daoTaskListAtom)

    const getBlockchainItems = async (params: {
        daoaddr: string
        limit: number
        cursor?: string
    }) => {
        const { daoaddr, limit, cursor } = params
        const systemContract = getSystemContract()
        const codeHash = await systemContract.getDaoTaskTagCodeHash(daoaddr, SYSTEM_TAG)
        const { results, lastId, completed } = await getPaginatedAccounts({
            filters: [`code_hash: {eq:"${codeHash}"}`],
            limit,
            lastId: cursor,
        })
        const items = await executeByChunk<{ id: string }, TTaskDetails>(
            results,
            MAX_PARALLEL_READ,
            async ({ id }) => {
                const tag = await systemContract.getGoshTag({ address: id })
                const { task: address } = await tag.getDetails()
                const task = await systemContract.getTask({ address })
                const details = await task.getDetails()
                return {
                    account: task,
                    address: task.address,
                    ...details,
                }
            },
        )
        return { items, cursor: lastId, hasNext: !completed }
    }

    const getTaskList = useCallback(async () => {
        try {
            if (!dao.address) {
                return
            }
            setData((state) => ({ ...state, isFetching: true }))
            const blockchain = await getBlockchainItems({
                daoaddr: dao.address,
                limit: count,
            })
            setData((state) => {
                const different = _.differenceWith(
                    blockchain.items,
                    state.items,
                    (a, b) => {
                        return a.address === b.address
                    },
                )
                const intersect = _.intersectionWith(
                    blockchain.items,
                    state.items,
                    (a, b) => {
                        return a.address === b.address
                    },
                )

                return {
                    ...state,
                    items: [...different, ...state.items].map((item) => {
                        const found = intersect.find(
                            (_item) => _item.address === item.address,
                        )
                        return { ...item, ...found } || item
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
    }, [dao.address, count])

    const getNext = useCallback(async () => {
        try {
            setData((state) => ({ ...state, isFetching: true }))
            const blockchain = await getBlockchainItems({
                daoaddr: dao.address!,
                limit: count,
                cursor: data.cursor,
            })
            setData((state) => {
                const different = _.differenceWith(
                    blockchain.items,
                    state.items,
                    (a, b) => {
                        return a.address === b.address
                    },
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
        if (loadOnInit) {
            getTaskList()
        }
    }, [getTaskList, loadOnInit])

    return {
        openItem,
        closeItems,
        getNext,
        ...data,
        items: [...data.items].sort((a, b) => (a.address > b.address ? 1 : -1)),
        isEmpty: !data.isFetching && !data.items.length,
    }
}

export function useCreateTask() {
    const { details: dao } = useRecoilValue(daoDetailsAtom)
    const member = useRecoilValue(daoMemberAtom)
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

        const struct: TTaskGrant = { assign: [], review: [], manager: [] }
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
    const member = useRecoilValue(daoMemberAtom)
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
    const member = useRecoilValue(daoMemberAtom)

    const receiveReward = useCallback(
        async (params: { reponame: string; taskname: string }) => {
            const { reponame, taskname } = params

            if (!member.isReady || !member.wallet) {
                throw new GoshError(
                    'Access error',
                    'Wallet does not exist or not activated',
                )
            }

            const types = [ETaskReward.ASSING, ETaskReward.MANAGER, ETaskReward.REVIEW]
            await Promise.all(
                types.map(async (type) => {
                    await member.wallet!.receiveTaskReward({ reponame, taskname, type })
                }),
            )
        },
        [member.isReady],
    )

    return { receiveReward }
}

export function useTask(
    address: string,
    options: { loadOnInit?: boolean; subscribe?: boolean } = {},
) {
    const { loadOnInit, subscribe } = options
    const [tasks, setTasks] = useRecoilState(daoTaskListAtom)
    const task = useRecoilValue(daoTaskSelector(address))
    const [error, setError] = useState<any>()

    const checkExists = async (account: Task) => {
        if (!(await account.isDeployed())) {
            // Close if opened
            setTasks((state) => ({
                ...state,
                items: state.items.map((item) => {
                    if (item.address === account.address) {
                        return { ...item, isOpen: false }
                    }
                    return item
                }),
            }))
            // Remove from list
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
                    return item
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
            let details = tasks.items.find((item) => item.address === address)

            // Fetch task details from blockchain
            if (!details) {
                const account = await getSystemContract().getTask({ address })
                const _details = await account.getDetails()
                details = { account, address, ..._details }
                setTasks((state) => ({
                    ...state,
                    items: [...state.items, details!],
                }))
            }
        } catch (e: any) {
            setError(e)
        }
    }, [address])

    useEffect(() => {
        if (loadOnInit) {
            getTask()
        }
    }, [getTask, loadOnInit])

    useEffect(() => {
        const _subscribe = async () => {
            if (!task?.address || !task.account) {
                return
            }

            await task.account.account.subscribeMessages('body', async ({ body }) => {
                const decoded = await task.account!.decodeMessageBody(body, 0)
                const triggers = ['destroy', 'isReady', 'getGrant']
                if (decoded && triggers.indexOf(decoded.name) >= 0) {
                    await getTaskData(task.account!)
                }
            })
        }

        const _checkExists = () => {
            if (!task?.address || !task.account) {
                return
            }

            const interval = setInterval(async () => {
                if (!(await checkExists(task.account!))) {
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
