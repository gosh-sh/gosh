import {
    useRecoilState,
    useRecoilValue,
    useResetRecoilState,
    useSetRecoilState,
} from 'recoil'
import { daoRepositoryListAtom } from '../store/repository.state'
import { daoDetailsAtom, daoMemberAtom } from '../store/dao.state'
import { TRepositoryListItem } from '../types/repository.types'
import { getPaginatedAccounts } from '../../blockchain/utils'
import { systemContract } from '../blockchain/helpers'
import { validateRepoName } from '../validators'
import { EGoshError, GoshError } from '../../errors'
import { executeByChunk, whileFinite } from '../../utils'
import { MAX_PARALLEL_READ } from '../../constants'
import _ from 'lodash'
import { useCallback, useEffect } from 'react'
import { Repository } from '../blockchain/repository'
import { useParams } from 'react-router-dom'

export function useRepositoryCreate() {
    const { details: dao } = useRecoilValue(daoDetailsAtom)
    const { details: member } = useRecoilValue(daoMemberAtom)
    const setRepositories = useSetRecoilState(daoRepositoryListAtom)

    const create = async (name: string) => {
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
            throw new GoshError('Access error', 'Wallet is missing or is not activated')
        }

        // Check if repository is already deployed
        const repo = await systemContract.getRepository({ path: `${dao.name}/${name}` })
        const account = repo as Repository
        if (await account.isDeployed()) {
            throw new GoshError('Value error', 'Repository already exists')
        }

        // Deploy repository
        await member.wallet.createRepository({ name })
        const wait = await whileFinite(async () => await account.isDeployed())
        if (!wait) {
            throw new GoshError('Timeout error', 'Create repository timeout reached')
        }

        // Update state
        const item = {
            account,
            name,
            version: await account.getVersion(),
            branches: await account.getBranches(),
        }
        setRepositories((state) => ({
            ...state,
            items: [item, ...state.items],
        }))

        return repo
    }

    return {
        create,
    }
}

export function useDaoRepositoryList(params: { count: number }) {
    const { count } = params
    const { daoName } = useParams()
    const { details: dao } = useRecoilValue(daoDetailsAtom)
    const [data, setData] = useRecoilState(daoRepositoryListAtom)
    const resetData = useResetRecoilState(daoRepositoryListAtom)

    const getBlockchainItems = async (params: {
        daoAddress: string
        limit: number
        cursor?: string
    }) => {
        const { daoAddress, limit, cursor } = params
        const codeHash = await systemContract.getRepositoryCodeHash(daoAddress)
        const { results, lastId, completed } = await getPaginatedAccounts({
            filters: [`code_hash: {eq:"${codeHash}"}`],
            limit,
            lastId: cursor,
        })
        const items = await executeByChunk<{ id: string }, TRepositoryListItem>(
            results,
            MAX_PARALLEL_READ,
            async ({ id }) => {
                const repo = await systemContract.getRepository({ address: id })
                const account = repo as Repository
                return {
                    account,
                    name: await account.getName(),
                    version: await account.getVersion(),
                    branches: await account.getBranches(),
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
            if (dao.name !== daoName) {
                console.debug('Reset DAO repositories')
                resetData()
                return
            }

            setData((state) => ({ ...state, isFetching: true }))
            const blockchain = await getBlockchainItems({
                daoAddress: dao.address,
                limit: Math.max(data.items.length, count),
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
    }, [dao.address, dao.name, daoName])

    const getNext = useCallback(async () => {
        try {
            setData((state) => ({ ...state, isFetching: true }))
            const blockchain = await getBlockchainItems({
                daoAddress: dao.address!,
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
        getRepositoryList()
    }, [getRepositoryList])

    return {
        getNext,
        data,
    }
}
