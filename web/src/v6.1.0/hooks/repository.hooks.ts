import { useRecoilState, useSetRecoilState } from 'recoil'
import { daoRepositoryListSelector } from '../store/repository.state'
import { TGoshRepositoryListItem } from '../types/repository.types'
import { getPaginatedAccounts } from '../../blockchain/utils'
import { getSystemContract } from '../blockchain/helpers'
import { validateRepoName } from '../validators'
import { EGoshError, GoshError } from '../../errors'
import { executeByChunk, whileFinite } from '../../utils'
import { MAX_PARALLEL_READ } from '../../constants'
import _ from 'lodash'
import { useCallback, useEffect } from 'react'
import { GoshRepository } from '../blockchain/repository'
import { useDao, useDaoHelpers, useDaoMember } from './dao.hooks'
import { appToastStatusSelector } from '../../store/app.state'

export function useCreateRepository() {
    const { details: dao } = useDao()
    const member = useDaoMember()
    const setRepositories = useSetRecoilState(daoRepositoryListSelector(dao.name))
    const { beforeCreateEvent, afterCreateEvent } = useDaoHelpers()
    const [status, setStatus] = useRecoilState(
        appToastStatusSelector('__createrepository'),
    )

    const create = useCallback(
        async (name: string, description?: string) => {
            try {
                setStatus((state) => ({
                    ...state,
                    type: 'pending',
                    data: 'Creating repository',
                }))

                name = name.toLowerCase()
                const { valid, reason } = validateRepoName(name)
                if (!valid) {
                    throw new GoshError(EGoshError.REPO_NAME_INVALID, reason)
                }
                if (!dao.name) {
                    throw new GoshError('Value error', 'DAO name undefined')
                }
                if (!member.isMember) {
                    throw new GoshError('Access error', 'Not a DAO member')
                }
                if (!member.isReady || !member.wallet) {
                    throw new GoshError(
                        'Access error',
                        'Wallet is missing or is not activated',
                    )
                }

                // Check if repository is already deployed
                const repo = await getSystemContract().getRepository({
                    path: `${dao.name}/${name}`,
                })
                const account = repo as GoshRepository
                if (await account.isDeployed()) {
                    throw new GoshError('Value error', 'Repository already exists')
                }

                // Prepare balance for create event (if not alone)
                const alone = dao.members?.length === 1
                if (!alone) {
                    await beforeCreateEvent(20, { onPendingCallback: setStatus })
                }

                // Deploy repository
                setStatus((state) => ({
                    ...state,
                    type: 'pending',
                    data: 'Create repository',
                }))
                const comment = `Create repository ${name}`
                const eventaddr = await member.wallet.createRepository({
                    name,
                    description,
                    comment,
                    alone,
                })

                // If alone, wait for repository to be deployed and
                // update state
                if (alone) {
                    const wait = await whileFinite(async () => await account.isDeployed())
                    if (!wait) {
                        throw new GoshError(
                            'Timeout error',
                            'Create repository timeout reached',
                        )
                    }

                    const version = await account.getVersion()
                    const details = await account.getDetails()
                    setRepositories((state) => ({
                        ...state,
                        items: [{ account, version, ...details }, ...state.items],
                    }))
                    setStatus((state) => ({
                        ...state,
                        type: 'success',
                        data: {
                            title: 'Create repository',
                            content: 'Repository created',
                        },
                    }))
                } else {
                    await afterCreateEvent(
                        { label: 'Update DAO members', comment, eventaddr },
                        { onPendingCallback: setStatus },
                    )
                    setStatus((state) => ({
                        ...state,
                        type: 'success',
                        data: {
                            title: 'Create repository',
                            content: 'Create repository event created',
                        },
                    }))
                }

                return { repository: account, eventaddr }
            } catch (e: any) {
                setStatus((state) => ({ ...state, type: 'error', data: e }))
                throw e
            }
        },
        [dao.name, dao.members?.length, member.isMember, member.isReady],
    )

    return { create, status }
}

export function useDaoRepositoryList(
    params: { count?: number; initialize?: boolean } = {},
) {
    const { count = 5, initialize } = params
    const { details: dao } = useDao()
    const [data, setData] = useRecoilState(daoRepositoryListSelector(dao.name))

    const getBlockchainItems = async (params: {
        daoaddr: string
        limit: number
        cursor?: string
    }) => {
        const { daoaddr, limit, cursor } = params
        const sc = getSystemContract()
        const codeHash = await sc.getRepositoryCodeHash(daoaddr)
        const { results, lastId, completed } = await getPaginatedAccounts({
            filters: [`code_hash: {eq:"${codeHash}"}`],
            limit,
            lastId: cursor,
        })
        const items = await executeByChunk<{ id: string }, TGoshRepositoryListItem>(
            results,
            MAX_PARALLEL_READ,
            async ({ id }) => {
                const repo = await sc.getRepository({ address: id })
                const account = repo as GoshRepository
                const details = await account.getDetails()
                return {
                    account,
                    version: await account.getVersion(),
                    ...details,
                }
            },
        )
        return { items, cursor: lastId, hasNext: !completed }
    }

    const getRepositoryList = useCallback(async () => {
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
                        return a.name === b.name
                    },
                )
                const intersect = _.intersectionWith(
                    blockchain.items,
                    state.items,
                    (a, b) => {
                        return a.name === b.name
                    },
                )
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
            setData((state) => ({
                ...state,
                items: [...state.items, ...blockchain.items],
                cursor: blockchain.cursor,
                hasNext: blockchain.hasNext,
            }))
        } catch (e: any) {
            throw e
        } finally {
            setData((state) => ({ ...state, isFetching: false }))
        }
    }, [dao.address, data.cursor])

    useEffect(() => {
        if (initialize) {
            getRepositoryList()
        }
    }, [initialize, getRepositoryList])

    return {
        ...data,
        getNext,
        isEmpty: !data.isFetching && !data.items.length,
    }
}

export function useCreateRepositoryTag() {
    const member = useDaoMember()
    const { beforeCreateEvent } = useDaoHelpers()
    const [status, setStatus] = useRecoilState(
        appToastStatusSelector('__createrepositorytag'),
    )

    const create = useCallback(
        async (reponame: string, tags: string[], comment?: string) => {
            try {
                if (!member.isReady || !member.wallet) {
                    throw new GoshError(
                        'Access error',
                        'Wallet is missing or is not activated',
                    )
                }

                // Create add repository tags event
                // Prepare balance for create event (if not alone)
                await beforeCreateEvent(20, { onPendingCallback: setStatus })

                setStatus((state) => ({
                    ...state,
                    type: 'pending',
                    data: 'Create event',
                }))
                const eventaddr = await member.wallet.createRepositoryTag({
                    reponame,
                    tags,
                    comment: comment || `Add tags for ${reponame} repository`,
                })

                setStatus((state) => ({
                    ...state,
                    type: 'success',
                    data: {
                        title: 'Create event',
                        content: 'Repository tags add event created',
                    },
                }))

                return { eventaddr }
            } catch (e: any) {
                setStatus((state) => ({ ...state, type: 'error', data: e }))
                throw e
            }
        },
        [member.isMember, member.isReady],
    )

    return { create, status }
}

export function useDeleteRepositoryTag() {
    const member = useDaoMember()
    const { beforeCreateEvent } = useDaoHelpers()
    const [status, setStatus] = useRecoilState(
        appToastStatusSelector('__deleterepositorytag'),
    )

    const remove = useCallback(
        async (reponame: string, tags: string[], comment?: string) => {
            try {
                if (!member.isReady || !member.wallet) {
                    throw new GoshError(
                        'Access error',
                        'Wallet is missing or is not activated',
                    )
                }

                // Create delete repository tags event
                // Prepare balance for create event (if not alone)
                await beforeCreateEvent(20, { onPendingCallback: setStatus })

                setStatus((state) => ({
                    ...state,
                    type: 'pending',
                    data: 'Create event',
                }))
                const eventaddr = await member.wallet.deleteRepositoryTag({
                    reponame,
                    tags,
                    comment: comment || `Delete tags for ${reponame} repository`,
                })

                setStatus((state) => ({
                    ...state,
                    type: 'success',
                    data: {
                        title: 'Create event',
                        content: 'Repository tags delete event created',
                    },
                }))

                return { eventaddr }
            } catch (e: any) {
                setStatus((state) => ({ ...state, type: 'error', data: e }))
                throw e
            }
        },
        [member.isMember, member.isReady],
    )

    return { remove, status }
}

export function useUpdateRepositoryDescription() {
    const member = useDaoMember()
    const { beforeCreateEvent } = useDaoHelpers()
    const [status, setStatus] = useRecoilState(
        appToastStatusSelector('__updaterepositorydescription'),
    )

    const update = useCallback(
        async (reponame: string, description: string, comment?: string) => {
            try {
                if (!member.isReady || !member.wallet) {
                    throw new GoshError(
                        'Access error',
                        'Wallet is missing or is not activated',
                    )
                }

                // Create update repository repository event
                // Prepare balance for create event (if not alone)
                await beforeCreateEvent(20, { onPendingCallback: setStatus })

                setStatus((state) => ({
                    ...state,
                    type: 'pending',
                    data: 'Create event',
                }))
                const eventaddr = await member.wallet.updateRepositoryDescription({
                    reponame,
                    description,
                    comment: comment || `Update ${reponame} repository description`,
                })
                setStatus((state) => ({
                    ...state,
                    type: 'success',
                    data: {
                        title: 'Create event',
                        content: 'Repository tags delete event created',
                    },
                }))

                return { eventaddr }
            } catch (e: any) {
                setStatus((state) => ({ ...state, type: 'error', data: e }))
                throw e
            }
        },
        [member.isMember, member.isReady],
    )

    return { update, status }
}
