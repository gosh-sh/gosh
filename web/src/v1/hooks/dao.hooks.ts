import { useCallback, useEffect, useState } from 'react'
import _ from 'lodash'
import { useProfile, useUser } from './user.hooks'
import { EGoshError, GoshError } from '../../errors'
import { validateUsername } from '../validators'
import { AppConfig } from '../../appconfig'
import { systemContract } from '../blockchain/helpers'
import { supabase } from '../../supabase'
import { executeByChunk, whileFinite } from '../../utils'
import { MAX_PARALLEL_READ } from '../../constants'
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
    daoMemberAtom,
    daoMemberListAtom,
    userDaoListAtom,
} from '../store/dao.state'
import {
    TDaoDetailsMemberItem,
    TDaoEventDetails,
    TDaoListItem,
    TDaoMemberListItem,
} from '../types/dao.types'
import { useParams } from 'react-router-dom'
import { Dao } from '../blockchain/dao'
import { UserProfile } from '../../blockchain/userprofile'
import { Wallet } from '../blockchain/wallet'
import { TToastStatus } from '../../types/common.types'
import { getPaginatedAccounts } from '../../blockchain/utils'
import { SmvEvent } from '../blockchain/smvproposal'
import { GoshAdapterFactory } from 'react-gosh'

export function useDaoCreate() {
    const profile = useProfile()
    const [status, setStatus] = useState<TToastStatus>()

    const createDao = async (name: string, members: string[]) => {
        try {
            setStatus({ type: 'pending', data: 'Create DAO' })

            // Validate member usernames
            setStatus({ type: 'pending', data: 'Validate usernames' })
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
            setStatus({ type: 'pending', data: 'Resolve profiles' })
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
            setStatus({ type: 'pending', data: 'Deploy DAO' })
            await profile.createDao(systemContract, name, [
                profile.address,
                ...membersProfileList,
            ])
            setStatus({
                type: 'success',
                data: { title: 'Create DAO', content: 'DAO created' },
            })
        } catch (e: any) {
            setStatus({ type: 'error', data: e })
            throw e
        }
    }

    return {
        createDao,
        status,
    }
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
                const account = await systemContract.getDao({ address: goshdao })
                return {
                    account: account as Dao,
                    name: await account.getName(),
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
                    description: null,
                    tags: null,
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

export function useDao(params: { loadOnInit?: boolean } = {}) {
    const { loadOnInit } = params
    const { daoName } = useParams()
    const [data, setData] = useRecoilState(daoDetailsAtom)
    const resetDao = useResetRecoilState(daoDetailsAtom)

    const getDetails = useCallback(async () => {
        console.debug('GET DAO DETAILS')
        const _dao = data.details.account
        if (!_dao) {
            return
        }

        try {
            const members = await _dao.getMembers()
            const supply = _.sum(members.map(({ allowance }) => allowance))
            const owner = await _dao.getOwner()
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
    }, [data.details.address])

    useEffect(() => {
        const _getDao = async () => {
            console.debug('GET DAO HOOK', data.details.name, daoName)
            try {
                if (!daoName) {
                    throw new GoshError('DAO name undefined')
                }

                if (daoName !== data.details.name) {
                    console.debug('Reset DAO')
                    resetDao()
                }

                setData((state) => ({ ...state, isFetching: true }))
                const dao = await systemContract.getDao({ name: daoName })
                if (!(await dao.isDeployed())) {
                    throw new GoshError('DAO does not exist', { name: daoName })
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
                        name: daoName,
                        address: dao.address,
                        version,
                    },
                    error: undefined,
                }))
            } catch (e) {
                setData((state) => ({ ...state, error: e }))
                throw e
            } finally {
                setData((state) => ({ ...state, isFetching: false }))
            }
        }

        if (loadOnInit) {
            _getDao()
        }
    }, [daoName, data.details.name, loadOnInit])

    useEffect(() => {
        if (loadOnInit) {
            getDetails()
        }
    }, [getDetails, loadOnInit])

    return { ...data }
}

export function useDaoMember(params: { loadOnInit?: boolean; subscribe?: boolean } = {}) {
    const { loadOnInit, subscribe } = params
    const { user } = useUser()
    const { details: dao } = useRecoilValue(daoDetailsAtom)
    const [data, setData] = useRecoilState(daoMemberAtom)

    const activate = async (profile: UserProfile, wallet: Wallet) => {
        if (!(await wallet.isDeployed())) {
            return
        }
        if (await wallet.isTurnedOn()) {
            setData((state) => ({
                ...state,
                status: undefined,
                details: { ...state.details, isReady: true },
            }))
            return
        }

        try {
            setData((state) => ({
                ...state,
                status: { type: 'pending', data: 'Activating account' },
            }))

            await profile.turnOn(wallet.address, user.keys!.public)

            setData((state) => ({
                ...state,
                status: undefined,
                details: { ...state.details, isReady: true },
            }))
        } catch (e: any) {
            setData((state) => ({
                ...state,
                status: {
                    type: 'error',
                    data: new GoshError('Activate account failed', {
                        message: e.message,
                        retry: 'Retring after 15s',
                    }),
                },
            }))
            setTimeout(activate, 15000)
        }
    }

    const getBalance = useCallback(async () => {
        if (!data.details.isReady || !data.details.wallet) {
            return
        }

        try {
            const balance = await data.details.wallet.getBalance()
            setData((state) => ({
                ...state,
                details: { ...state.details, balance },
            }))
        } catch (e: any) {
            console.error(e.message)
        }
    }, [data.details.isReady])

    useEffect(() => {
        const _getBaseDetails = async () => {
            if (!dao.members?.length || !dao.account) {
                return
            }
            if (!user.profile) {
                setData((state) => ({
                    ...state,
                    details: { ...state.details, isFetched: true },
                }))
                return
            }

            const client = systemContract.client
            const found = dao.members.find(
                ({ profile }) => profile.address === user.profile,
            )
            const wallet = await dao.account.getMemberWallet({
                profileAddress: user.profile,
                keys: user.keys,
            })
            const profile = new UserProfile(client, user.profile!, user.keys)
            activate(profile, wallet)
            setData((state) => ({
                ...state,
                details: {
                    ...state.details,
                    profile,
                    wallet,
                    allowance: found?.allowance || 0,
                    isMember: !!found,
                    isFetched: true,
                },
            }))
        }

        if (loadOnInit) {
            _getBaseDetails()
        }
    }, [user.profile, dao.members?.length, dao.address, loadOnInit])

    useEffect(() => {
        if (subscribe) {
            getBalance()
        }

        let isBusy = false
        const interval = setInterval(async () => {
            if (!subscribe) {
                clearInterval(interval)
            }
            if (isBusy) {
                return
            }

            isBusy = true
            await getBalance()
            isBusy = false
        }, 15000)

        return () => {
            clearInterval(interval)
        }
    }, [data.details.isReady, subscribe])

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
                    return { ...item, username, isFetching: false }
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

function useDaoEventHelper() {
    const { details: member } = useRecoilValue(daoMemberAtom)

    const nocallback = () => {}

    const moveVoting2Regular = async (wallet: Wallet, needed: number) => {
        // const smv = await this.getSmv()
        // const regular = await smv.getWalletBalance(this.wallet)
        // if (amount > regular) {
        //     const delta = amount - regular
        //     await smv.transferToWallet(delta)
        //     const check = await whileFinite(async () => {
        //         const _regular = await smv.getWalletBalance(this.wallet!)
        //         if (_regular >= amount) {
        //             return true
        //         }
        //     })
        //     if (!check) {
        //         throw new GoshError('Regular tokens topup failed')
        //     }
        // }
    }

    const beforeCreate = async (
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
        beforeCreate,
        beforeVote,
    }
}

export function useDaoCreateMemeber() {
    const [status, setStatus] = useState<TToastStatus>()
    const { details: member } = useRecoilValue(daoMemberAtom)
    const { beforeCreate } = useDaoEventHelper()

    const createMember = async (username: string[]) => {
        try {
            // Resolve username -> profile
            setStatus({ type: 'pending', data: 'Resolve user profiles' })
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
            await beforeCreate(20, { onPendingCallback: setStatus })

            // Create add DAO member event
            // Skip `member.wallet` check, because `beforeCreate` checks it
            await member.wallet!.createDaoMember(profiles)

            setStatus({
                type: 'success',
                data: { title: 'Add DAO members', content: 'Event created' },
            })
        } catch (e: any) {
            setStatus({ type: 'error', data: e })
            throw e
        }
    }

    return {
        status,
        createMember,
    }
}

export function useDaoDeleteMemeber() {
    const [status, setStatus] = useState<TToastStatus>()
    const { details: member } = useRecoilValue(daoMemberAtom)
    const setMemberList = useSetRecoilState(daoMemberListAtom)
    const { beforeCreate } = useDaoEventHelper()

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
            setStatus({ type: 'pending', data: 'Resolve user profiles' })
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
            await beforeCreate(20, { onPendingCallback: setStatus })

            // Create add DAO member event
            // Skip `member.wallet` check, because `beforeCreate` checks it
            await member.wallet!.deleteDaoMember(profiles)

            setStatus({
                type: 'success',
                data: { title: 'Remove DAO members', content: 'Event created' },
            })
        } catch (e: any) {
            setStatus({ type: 'error', data: e })
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

export function useDaoEventList(params: { count?: number; loadOnInit?: boolean } = {}) {
    const { count = 10, loadOnInit } = params
    const { daoName } = useParams()
    const { details: dao } = useRecoilValue(daoDetailsAtom)
    const { details: member } = useRecoilValue(daoMemberAtom)
    const [data, setData] = useRecoilState(daoEventListAtom)
    const resetData = useResetRecoilState(daoEventListAtom)

    const getBlockchainItems = async (params: {
        daoAccount: Dao
        daoWallet: Wallet | null
        limit: number
        cursor?: string
    }) => {
        const { daoAccount, daoWallet, limit, cursor } = params
        const codeHash = await daoAccount.getEventCodeHash()
        const { results, lastId, completed } = await getPaginatedAccounts({
            filters: [`code_hash: {eq:"${codeHash}"}`],
            limit,
            lastId: cursor,
        })
        const items = await executeByChunk<{ id: string }, TDaoEventDetails>(
            results,
            MAX_PARALLEL_READ,
            async ({ id }) => {
                const account = await daoAccount.getEvent({ address: id })
                const details = await account.getDetails({ wallet: daoWallet })
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
            if (dao.name !== daoName) {
                console.debug('Reset DAO events')
                resetData()
                return
            }

            setData((state) => ({ ...state, isFetching: true }))
            const blockchain = await getBlockchainItems({
                daoAccount: dao.account!,
                daoWallet: member.wallet,
                limit: Math.max(data.items.length, count),
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
                    items: [...state.items, ...different].map((item) => {
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
    }, [dao.address, dao.name, daoName, member.isFetched])

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
    const { details: member } = useRecoilValue(daoMemberAtom)
    const [events, setEvents] = useRecoilState(daoEventListAtom)
    const event = useRecoilValue(daoEventSelector(address))
    const { beforeVote } = useDaoEventHelper()
    const [status, setStatus] = useState<TToastStatus>()
    const [error, setError] = useState<any>()

    const getEventData = async (account: SmvEvent, type: number) => {
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

    const getEvent = useCallback(async () => {
        if (!dao.account || !address || !member.isFetched) {
            return
        }

        try {
            // Search for event in event list state atom
            let details = events.items.find((item) => item.address === address)
            // Fetch event details from blockchain
            if (!details) {
                const account = await dao.account.getEvent({ address })
                const _details = await account.getDetails({ wallet: member.wallet })
                details = { account, address, ..._details }
                setEvents((state) => ({
                    ...state,
                    items: [...state.items, details!],
                }))
            }
            // Fetch event data if not present
            if (!details.data) {
                getEventData(details.account!, details.type)
            }
        } catch (e: any) {
            setError(e)
        }
    }, [address, dao.address, member.isFetched])

    const vote = async (params: { choice: boolean; amount: number }) => {
        const { choice, amount } = params
        try {
            if (!event?.platformId) {
                throw new GoshError('Send vote error', 'Platform id undefined')
            }

            // Prepare balance for create event
            await beforeVote(amount, event.platformId, {
                onPendingCallback: setStatus,
            })

            // Send vote
            // Skip `member.wallet` check, because `beforeVote` checks it
            await member.wallet!.smvVote({
                platformId: event.platformId,
                choice,
                amount,
            })

            setStatus({
                type: 'success',
                data: {
                    title: 'Send vote',
                    content: 'Your vote was succesfully sent',
                },
            })
        } catch (e: any) {
            setStatus({ type: 'error', data: e })
            throw e
        }
    }

    useEffect(() => {
        if (loadOnInit) {
            getEvent()
        }
    }, [getEvent, loadOnInit])

    useEffect(() => {
        const _subscribe = async () => {
            if (!event?.address || !event.account) {
                return
            }

            let isBusy = false
            await event.account.account.subscribeMessages('id', async (message) => {
                if (isBusy) {
                    return
                }

                isBusy = true
                console.debug('Subs get details for', event.address, message)
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
                isBusy = false
            })
        }

        if (subscribe) {
            _subscribe()
        }

        return () => {
            if (subscribe) {
                event?.account?.account.free()
            }
        }
    }, [event?.address, subscribe])

    return { event, error, vote, status }
}

export function useDaoUpgrade() {
    const dao = useRecoilValue(daoDetailsAtom)
    const member = useRecoilValue(daoMemberAtom)
    const { beforeCreate } = useDaoEventHelper()
    const [versions, setVersions] = useState<string[]>()
    const [status, setStatus] = useState<TToastStatus>()

    useEffect(() => {
        const _getAvailableVersions = () => {
            const all = Object.keys(AppConfig.versions)
            const currIndex = all.findIndex((v) => v === dao.details.version)
            setVersions(all.slice(currIndex + 1))
        }

        _getAvailableVersions()
    }, [dao.details.version])

    const upgrade = async (version: string, comment: string) => {
        try {
            setStatus({ type: 'pending', data: 'Creating event' })
            if (Object.keys(AppConfig.versions).indexOf(version) < 0) {
                throw new GoshError(
                    'Upgrade error',
                    `Gosh version ${version} is not supported`,
                )
            }

            // Prepare balance for create event
            await beforeCreate(20, { onPendingCallback: setStatus })

            // Create upgrade DAO event
            // Skip `member.wallet` check, because `beforeCreate` checks it
            await member.details.wallet!.upgradeDao(version, { description: comment })

            setStatus({
                type: 'success',
                data: { title: 'Upgrade DAO', content: 'Event created' },
            })
        } catch (e: any) {
            setStatus({ type: 'error', data: e })
            throw e
        }
    }

    return { versions, upgrade, status }
}
