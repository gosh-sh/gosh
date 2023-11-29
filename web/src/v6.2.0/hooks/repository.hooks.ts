import _ from 'lodash'
import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil'
import { getPaginatedAccounts } from '../../blockchain/utils'
import { MAX_PARALLEL_READ } from '../../constants'
import { EGoshError, GoshError } from '../../errors'
import { appToastStatusSelector } from '../../store/app.state'
import { executeByChunk, whileFinite } from '../../utils'
import { getSystemContract } from '../blockchain/helpers'
import { GoshRepository } from '../blockchain/repository'
import { GoshShapshot } from '../blockchain/snapshot'
import {
    daoRepositoryListSelector,
    daoRepositorySelector,
} from '../store/repository.state'
import { TGoshBranch, TGoshRepositoryListItem } from '../types/repository.types'
import { validateRepoName } from '../validators'
import { useDao, useDaoHelpers, useDaoMember } from './dao.hooks'

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

export function useRepository(params: { initialize?: boolean } = {}) {
    const { initialize } = params
    const { reponame } = useParams()
    const dao = useDao()
    const [repositories, setRepositories] = useRecoilState(
        daoRepositoryListSelector(dao.details.name),
    )
    const repository = useRecoilValue(
        daoRepositorySelector({ dao_name: dao.details.name, repo_name: reponame }),
    )
    const [error, setError] = useState<any>()
    const [is_fetching, setIsFetching] = useState<boolean>(false)

    const getRepository = useCallback(async () => {
        try {
            if (!dao.details.name || !reponame) {
                return
            }

            // Search for repository in repository list state atom
            let found = repositories.items.find((item) => item.name === reponame)

            // Fetch repository details from blockchain
            if (!found) {
                setIsFetching(true)
                const sc = getSystemContract()
                const account = await sc.getRepository({
                    path: `${dao.details.name}/${reponame}`,
                })
                const details = await account.getDetails()
                found = {
                    ...details,
                    account,
                    version: dao.details.version!,
                }

                setRepositories((state) => {
                    const updated = [...state.items]
                    if (!updated.find(({ name }) => name === found?.name)) {
                        updated.push(found!)
                    }

                    return {
                        ...state,
                        items: updated.map((item) => {
                            return item.name === reponame ? { ...item, ...found } : item
                        }),
                    }
                })
            }
        } catch (e: any) {
            console.error(e.message)
            setError(e)
        } finally {
            setIsFetching(false)
        }
    }, [dao.details.address, reponame])

    useEffect(() => {
        if (initialize) {
            getRepository()
        }
    }, [initialize, getRepository])

    return { details: repository, is_fetching: dao.isFetching || is_fetching, error }
}

export function useBranch() {
    const url_params = useParams()
    const repository = useRepository()
    const [branch, setBranch] = useState<TGoshBranch>()

    const getCurrentBranch = useCallback(() => {
        if (!repository.is_fetching && repository.details) {
            const match = url_params.branch || 'main'
            const found = repository.details.branches.find(({ name }) => {
                return name === match
            })
            setBranch(found)
        }
    }, [repository.is_fetching])

    useEffect(() => {
        getCurrentBranch()
    }, [getCurrentBranch, url_params.branch])

    return { branch }
}

export function useFileHistory(params: { snapshot_path?: string }) {
    const { snapshot_path } = params
    const { details: repository } = useRepository()
    const [snapshot, setSnapshot] = useState<GoshShapshot>()
    const [page, setPage] = useState<{ cursor?: string; has_next: boolean }>({
        has_next: false,
    })
    const [history, setHistory] = useState<any[]>([])
    const [is_fetching, setIsFetching] = useState<boolean>(false)

    const getSnapshotHistory = async (params: {
        snapshot: GoshShapshot
        cursor?: string
    }) => {
        const { snapshot } = params

        setIsFetching(true)
        const { messages, cursor, hasNext } = await snapshot.getMessages(
            {
                msgType: ['IntIn'],
                node: ['created_at'],
                cursor: params.cursor,
                allow_latest_inconsistent_data: true,
            },
            true,
            false,
        )

        const changes = messages
            .filter(({ decoded }) => {
                return !!decoded && decoded.name === 'approve'
            })
            .map(({ message, decoded }) => ({
                created_at: message.created_at,
                commit_name: decoded.value.diff.commit,
                snapshot_address: decoded.value.diff.snap,
                snapshot_name: decoded.value.diff.nameSnap,
            }))

        setHistory((state) => [...state, ...changes])
        setPage((state) => ({ ...state, cursor, has_next: !!hasNext }))
        setIsFetching(false)
    }

    const getFileHistory = useCallback(async () => {
        if (!repository?.account || !snapshot_path) {
            return
        }

        setIsFetching(true)
        setHistory([])
        const [branch, commit_name, ...rest] = snapshot_path.split('/')
        const snapshot = await repository.account.getSnapshot({
            data: { commitname: commit_name, filename: rest.join('/'), branch },
        })
        setSnapshot(snapshot)
        await getSnapshotHistory({ snapshot })
    }, [snapshot_path])

    const getNext = useCallback(async () => {
        if (snapshot) {
            await getSnapshotHistory({ snapshot, cursor: page.cursor })
        }
    }, [snapshot?.address, page.cursor])

    useEffect(() => {
        getFileHistory()
    }, [getFileHistory])

    return { history, is_fetching, has_next: page.has_next, getNext }
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
