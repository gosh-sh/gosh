import { useCallback, useEffect, useState } from 'react'
import _ from 'lodash'
import { useProfile, useUser } from './user.hooks'
import { EGoshError, GoshError } from '../../errors'
import { validateUsername } from '../validators'
import { AppConfig } from '../../appconfig'
import { getSystemContract } from '../blockchain/helpers'
import { supabase } from '../../supabase'
import { executeByChunk, setLockableInterval, sleep, whileFinite } from '../../utils'
import { DISABLED_VERSIONS, MAX_PARALLEL_READ } from '../../constants'
import {
    useRecoilState,
    useRecoilValue,
    useResetRecoilState,
    useSetRecoilState,
} from 'recoil'
import {
    daoDetailsSelector,
    daoEventListSelector,
    daoEventSelector,
    daoMemberListSelector,
    daoMemberSelector,
    userDaoListAtom,
} from '../store/dao.state'
import {
    TDaoDetailsMemberItem,
    TDaoEventDetails,
    TDaoListItem,
    TDaoMemberListItem,
} from '../types/dao.types'
import { Dao } from '../blockchain/dao'
import { UserProfile } from '../../blockchain/userprofile'
import { DaoWallet } from '../blockchain/daowallet'
import { TToastStatus } from '../../types/common.types'
import { getPaginatedAccounts } from '../../blockchain/utils'
import { DaoEvent } from '../blockchain/daoevent'
import { GoshAdapterFactory } from 'react-gosh'
import { appContextAtom, appToastStatusSelector } from '../../store/app.state'

export function useCreateDao() {
    const profile = useProfile()
    const setUserDaoList = useSetRecoilState(userDaoListAtom)
    const [status, setStatus] = useRecoilState(appToastStatusSelector('__createdao'))

    const createDao = async (name: string, members: string[]) => {
        try {
            setStatus((state) => ({ ...state, type: 'pending', data: 'Create DAO' }))

            // Validate member usernames
            setStatus((state) => ({
                ...state,
                type: 'pending',
                data: 'Validate usernames',
            }))
            const membersClean = members
                .map((item) => item.trim().toLowerCase())
                .filter((item) => !!item)
            membersClean.map((item) => {
                const { valid, reason } = validateUsername(item)
                if (!valid) {
                    throw new GoshError(EGoshError.USER_NAME_INVALID, {
                        username: item,
                        message: reason,
                    })
                }
            })

            // Resolve member profiles
            setStatus((state) => ({
                ...state,
                type: 'pending',
                data: 'Resolve profiles',
            }))
            if (!profile) {
                throw new GoshError(EGoshError.PROFILE_NOT_EXIST, {
                    message: 'You might not be authenticated',
                })
            }
            const membersProfileList = await Promise.all(
                membersClean.map(async (username) => {
                    const account = await AppConfig.goshroot.getUserProfile({ username })
                    if (!(await account.isDeployed())) {
                        throw new GoshError(EGoshError.PROFILE_NOT_EXIST, {
                            username,
                        })
                    }
                    return account.address
                }),
            )

            // Create DAO
            setStatus((state) => ({ ...state, type: 'pending', data: 'Deploy DAO' }))
            const account = await profile.createDao(getSystemContract(), name, [
                profile.address,
                ...membersProfileList,
            ])
            const version = await account.getVersion()
            setStatus((state) => ({
                ...state,
                type: 'success',
                data: { title: 'Create DAO', content: 'DAO created' },
            }))
            setUserDaoList((state) => ({
                ...state,
                items: [
                    {
                        account: account as Dao,
                        address: account.address,
                        name,
                        version,
                        supply: members.length * 20,
                        members: members.length,
                    },
                    ...state.items,
                ],
            }))
        } catch (e: any) {
            setStatus((state) => ({ ...state, type: 'error', data: e }))
            throw e
        }
    }

    return {
        createDao,
        status,
    }
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
                const sc = AppConfig.goshroot.getSystemContract(ver)
                const account = (await sc.getDao({ address: goshdao })) as Dao
                const members = await account.getMembers()
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

    const getDetails = async (account?: Dao) => {
        if (!account) {
            return
        }

        try {
            const members = await account.getMembers()
            const supply = _.sum(members.map(({ allowance }) => allowance))
            const owner = await account.getOwner()
            setData((state) => ({
                ...state,
                details: {
                    ...state.details,
                    members,
                    supply: { reserve: supply, voting: supply, total: supply },
                    owner,
                },
            }))
        } catch (e: any) {
            console.error(e.message)
        }
    }

    const getDao = useCallback(async () => {
        try {
            if (!daoname) {
                return
            }

            setData((state) => ({ ...state, isFetching: true }))
            const dao = await getSystemContract().getDao({ name: daoname })
            if (!(await dao.isDeployed())) {
                throw new GoshError('DAO does not exist', { name: daoname })
            }
            const version = await dao.getVersion()

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
                },
                error: undefined,
            }))
            getDetails(dao as Dao)
        } catch (e) {
            setData((state) => ({ ...state, error: e }))
            throw e
        } finally {
            setData((state) => ({ ...state, isFetching: false }))
        }
    }, [daoname])

    useEffect(() => {
        if (initialize) {
            getDao()
        }
    }, [getDao, initialize])

    useEffect(() => {
        if (!subscribe || !data.details.address) {
            return
        }

        const interval = setLockableInterval(async () => {
            await getDetails(data.details.account)
        }, 15000)

        return () => {
            clearInterval(interval)
        }
    }, [subscribe, data.details.address])

    return data
}

export function useDaoMember(params: { initialize?: boolean; subscribe?: boolean } = {}) {
    const { initialize, subscribe } = params
    const { user } = useUser()
    const { details: dao } = useDao()
    const [data, setData] = useRecoilState(daoMemberSelector(dao.name))
    const resetData = useResetRecoilState(daoMemberSelector(dao.name))
    const setStatus0 = useSetRecoilState(appToastStatusSelector('__activatedaowallet'))

    const activate = async (profile: UserProfile, wallet: DaoWallet) => {
        if (!(await wallet.isDeployed())) {
            return
        }
        if (await wallet.isTurnedOn()) {
            setData((state) => ({ ...state, isReady: true }))
            return
        }

        try {
            setStatus0((state) => ({
                ...state,
                type: 'pending',
                data: 'Activating DAO wallet',
            }))

            await profile.turnOn(wallet.address, user.keys!.public)

            setStatus0((state) => ({ ...state, type: 'dismiss' }))
            setData((state) => ({ ...state, isReady: true }))
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

    const getBalance = useCallback(async () => {
        if (!data.isReady || !data.wallet) {
            return
        }

        try {
            if (!(await data.wallet.isDeployed())) {
                resetData()
                return
            }

            const balance = await data.wallet.getBalance()
            setData((state) => ({ ...state, balance }))
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
            profile: user.profile,
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
            isMember: !!found,
            isFetched: true,
        }))
    }, [user.profile, dao.members?.length, dao.address])

    useEffect(() => {
        if (initialize) {
            getBaseDetails()
        }
    }, [getBaseDetails, initialize])

    useEffect(() => {
        if (initialize) {
            getBalance()
        }
    }, [getBalance, initialize])

    useEffect(() => {
        if (!subscribe) {
            return
        }

        const interval = setLockableInterval(async () => {
            await getBalance()
        }, 15000)

        return () => {
            clearInterval(interval)
        }
    }, [getBalance, subscribe])

    return data
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
                >(dao.members || [], MAX_PARALLEL_READ, async (item) => {
                    const { profile } = item
                    const username = await profile.getName()
                    return { ...item, username, isFetching: false }
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
        [dao.address, dao.members?.length],
    )

    const getNext = useCallback(async () => {
        await getMemberList(data.items.length)
    }, [data.items.length])

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

function useDaoHelpers() {
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
                    'DAO wallet error',
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
            onPendingCallback({ type: 'pending', data: 'Check locker status' })
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
            const { total, locked, regular } = await member.wallet.getBalance()
            if (total >= min || locked >= min) {
                return
            }

            if (regular >= min - total) {
                await member.wallet.smvLockTokens(0)
                const check = await whileFinite(async () => {
                    const { total } = await member.wallet!.getBalance()
                    return total >= min
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
                    'DAO wallet error',
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
            onPendingCallback({ type: 'pending', data: 'Check locker status' })
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
            const { total, regular } = await member.wallet.getBalance()
            const locked = await member.wallet.smvEventVotes(platformId)
            const unlocked = total - locked
            if (unlocked < amount) {
                const delta = amount - unlocked
                if (regular < delta) {
                    throw new GoshError('Balance error', {
                        message: "You don't have enough tokens to vote",
                    })
                }

                await member.wallet.smvLockTokens(delta)
                const check = await whileFinite(async () => {
                    const { total } = await member.wallet!.getBalance()
                    return total >= amount
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

    return {
        beforeCreateEvent,
        beforeVote,
    }
}

export function useCreateDaoMember() {
    const member = useDaoMember()
    const { beforeCreateEvent } = useDaoHelpers()
    const [status, setStatus] = useRecoilState(
        appToastStatusSelector('__createdaomember'),
    )

    const createMember = async (username: string[]) => {
        try {
            // Resolve username -> profile
            setStatus((state) => ({
                ...state,
                type: 'pending',
                data: 'Resolve user profiles',
            }))
            const profiles = await executeByChunk(
                username,
                MAX_PARALLEL_READ,
                async (name) => {
                    const profile = await AppConfig.goshroot.getUserProfile({
                        username: name.toLowerCase(),
                    })
                    if (!(await profile.isDeployed())) {
                        throw new GoshError('Profile error', {
                            message: 'Profile does not exist',
                            username: name,
                        })
                    }
                    return profile.address
                },
            )

            // Prepare balance for create event
            await beforeCreateEvent(20, { onPendingCallback: setStatus })

            // Create add DAO member event
            // Skip `member.wallet` check, because `beforeCreate` checks it
            await member.wallet!.createDaoMember(profiles)

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
    }

    return { status, createMember }
}

export function useDeleteDaoMember() {
    const { details: dao } = useDao()
    const member = useDaoMember()
    const setMemberList = useSetRecoilState(daoMemberListSelector({ daoname: dao.name }))
    const { beforeCreateEvent } = useDaoHelpers()
    const [status, setStatus] = useRecoilState(
        appToastStatusSelector('__deletedaomember'),
    )

    const deleteMember = async (username: string[]) => {
        try {
            setMemberList((state) => ({
                ...state,
                items: state.items.map((item) => ({
                    ...item,
                    isFetching: username.indexOf(item.username) >= 0,
                })),
            }))

            // Resolve username -> profile
            setStatus((state) => ({
                ...state,
                type: 'pending',
                data: 'Resolve user profiles',
            }))
            const profiles = await executeByChunk(
                username,
                MAX_PARALLEL_READ,
                async (name) => {
                    const profile = await AppConfig.goshroot.getUserProfile({
                        username: name.toLowerCase(),
                    })
                    if (!(await profile.isDeployed())) {
                        throw new GoshError('Profile error', {
                            message: 'Profile does not exist',
                            username: name,
                        })
                    }
                    return profile.address
                },
            )

            // Prepare balance for create event
            await beforeCreateEvent(20, { onPendingCallback: setStatus })

            // Create add DAO member event
            // Skip `member.wallet` check, because `beforeCreate` checks it
            await member.wallet!.deleteDaoMember(profiles)

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

export function useDaoEventList(params: { count?: number; initialize?: boolean } = {}) {
    const { count = 10, initialize } = params
    const { details: dao } = useDao()
    const member = useDaoMember()
    const [data, setData] = useRecoilState(daoEventListSelector(dao.name))

    const getBlockchainItems = async (params: {
        daoAccount: Dao
        daoWallet: DaoWallet | null
        limit: number
        cursor?: string
    }) => {
        const { daoAccount, daoWallet, limit, cursor } = params
        const codeHash = await daoAccount.getEventCodeHash()
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
                const account = await daoAccount.getEvent({ address: id })
                const details = await account.getDetails({ wallet: daoWallet })
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
                daoAccount: dao.account!,
                daoWallet: member.wallet,
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
                daoAccount: dao.account!,
                daoWallet: member.wallet,
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
    const [alert, setAlert] = useState<'isNotLatest' | 'isUpgradeAvailable'>()
    const [status, setStatus] = useRecoilState(appToastStatusSelector('__upgradedao'))

    useEffect(() => {
        const _getAvailableVersions = () => {
            const all = Object.keys(AppConfig.versions)
            const currIndex = all.findIndex((v) => v === dao.details.version)
            setVersions(all.slice(currIndex + 1))
        }

        _getAvailableVersions()
    }, [dao.details.version])

    useEffect(() => {
        const _checkUpgrades = async () => {
            const { version, name } = dao.details
            if (!version || !member.isMember) {
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

                // Upgrade available
                setAlert('isUpgradeAvailable')
                return
            }

            // Reset upgrades alert
            setAlert(undefined)
        }

        _checkUpgrades()
    }, [dao.details, member.isMember])

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
                await member.wallet!.upgradeDao(version, { description: comment })

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

    return { versions, upgrade, status, alert }
}
