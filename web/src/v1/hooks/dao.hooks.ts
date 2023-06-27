import { useEffect, useState } from 'react'
import _ from 'lodash'
import { useProfile, useUser } from './user.hooks'
import { EGoshError, GoshError } from '../../errors'
import { validateUsername } from '../validators'
import { AppConfig } from '../../appconfig'
import { systemContract } from '../blockchain/helpers'
import { supabase } from '../../supabase'
import { executeByChunk } from '../../utils'
import { MAX_PARALLEL_READ } from '../../constants'
import { useRecoilState } from 'recoil'
import { daoDetailsAtom, userDaoListAtom } from '../store/dao.state'
import { TDaoListItem } from '../types/dao.types'
import { useParams } from 'react-router-dom'

type TUseDaoCreateStatus = {
    isSubmitting: boolean
    data: string | null
}

export function useDaoCreate() {
    const profile = useProfile()
    const [status, setStatus] = useState<TUseDaoCreateStatus>({
        isSubmitting: false,
        data: null,
    })

    const createDao = async (name: string, members: string[]) => {
        try {
            setStatus((state) => ({ ...state, isSubmitting: true }))

            // Validate member usernames
            setStatus((state) => ({ ...state, data: 'Validate usernames' }))
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
            setStatus((state) => ({ ...state, data: 'Resolve profiles' }))
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
            setStatus((state) => ({ ...state, data: 'Deploy DAO' }))
            await profile.createDao(systemContract, name, [
                profile.address,
                ...membersProfileList,
            ])
        } catch (e: any) {
            throw e
        } finally {
            setStatus((state) => ({ ...state, isSubmitting: false }))
        }
    }

    return {
        createDao,
        status,
    }
}

export function useUserDaoList(params: { count: number }) {
    const { count } = params
    const { user } = useUser()
    const profile = useProfile()
    const [items, setItems] = useRecoilState(userDaoListAtom)

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
        limit: number
        cursor?: string
        _items?: TDaoListItem[]
    }): Promise<{ items: TDaoListItem[]; cursor?: string; hasNext?: boolean }> => {
        const { limit, cursor, _items = [] } = params
        const {
            messages,
            cursor: _cursor,
            hasNext,
        } = await profile!.getMessages(
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
                const systemContract = AppConfig.goshroot.getSystemContract('1.0.0')
                const account = await systemContract.getDao({ address: goshdao })
                return {
                    account,
                    name: await account.getName(),
                    description: await account.getShortDescription(),
                    tags: await account.getTags(),
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
            return await getBlockchainItems({ limit, cursor: _cursor, _items })
        }
        return { items: _items, cursor: _cursor, hasNext }
    }

    const getNext = async () => {
        try {
            setItems((state) => ({ ...state, isFetching: true }))
            const blockchain = await getBlockchainItems({
                limit: items.items.length + count,
                cursor: items.cursor,
                _items: [...items.items],
            })
            setItems((state) => ({
                ...state,
                items: blockchain.items,
                cursor: blockchain.cursor,
                hasNext: blockchain.hasNext,
            }))
        } catch (e: any) {
            throw e
        } finally {
            setItems((state) => ({ ...state, isFetching: false }))
        }
    }

    const getUserDaoList = async () => {
        try {
            setItems((state) => ({ ...state, isFetching: true }))
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
                limit: items.items.length || count,
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
            setItems((state) => {
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
            throw e
        } finally {
            setItems((state) => ({ ...state, isFetching: false }))
        }
    }

    return {
        getUserDaoList,
        getNext,
        items: { ...items, isEmpty: !items.isFetching && !items.items.length },
    }
}

export function useDao() {
    const { daoName } = useParams()
    const [data, setData] = useRecoilState(daoDetailsAtom)

    const getDetails = async () => {}

    useEffect(() => {
        const _getDao = async () => {
            console.debug('GET DAO HOOK')
            try {
                if (!daoName) {
                    throw new GoshError('DAO name undefined')
                }
                setData((state) => ({ ...state, isFetching: true }))
                const dao = await systemContract.getDao({ name: daoName })
                if (!(await dao.isDeployed())) {
                    throw new GoshError('DAO does not exist', { name: daoName })
                }
                setData((state) => ({
                    ...state,
                    details: { ...state.details, account: dao, name: daoName },
                    message: undefined,
                }))
            } catch (e) {
                setData((state) => ({ ...state, message: { type: 'error', data: e } }))
                throw e
            } finally {
                setData((state) => ({ ...state, isFetching: false }))
            }
        }

        _getDao()
    }, [daoName])

    return { ...data }
}
