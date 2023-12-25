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
import { appToastStatusSelector } from '../../store/app.state'
import { useDao, useDaoMember } from './dao.hooks'

export function useCreateRepository() {
  const { details: dao } = useDao()
  const member = useDaoMember()
  const setRepositories = useSetRecoilState(daoRepositoryListSelector(dao.name))
  const [status, setStatus] = useRecoilState(appToastStatusSelector('__createrepository'))

  const create = async (name: string) => {
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
        throw new GoshError('Access error', 'Wallet is missing or is not activated')
      }

      // Check if repository is already deployed
      const repo = await getSystemContract().getRepository({
        path: `${dao.name}/${name}`,
      })
      const account = repo as GoshRepository
      if (await account.isDeployed()) {
        throw new GoshError('Value error', 'Repository already exists')
      }

      // Deploy repository
      setStatus((state) => ({
        ...state,
        type: 'pending',
        data: 'Create repository',
      }))
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
      setStatus((state) => ({
        ...state,
        type: 'success',
        data: {
          title: 'Create repository',
          content: 'Repository created',
        },
      }))

      return repo
    } catch (e: any) {
      setStatus((state) => ({ ...state, type: 'error', data: e }))
      throw e
    }
  }

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

      setData((state) => ({ ...state, isFetching: true }))
      const blockchain = await getBlockchainItems({
        daoaddr: dao.address,
        limit: count,
      })
      setData((state) => {
        const different = _.differenceWith(blockchain.items, state.items, (a, b) => {
          return a.name === b.name
        })
        const intersect = _.intersectionWith(blockchain.items, state.items, (a, b) => {
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
