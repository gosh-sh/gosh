import _ from 'lodash'
import { useCallback, useEffect, useState } from 'react'
import { TDao } from 'react-gosh'
import { IGoshRepositoryAdapter } from 'react-gosh/dist/gosh/interfaces'
import { useRecoilState, useSetRecoilState } from 'recoil'
import { AppConfig } from '../../appconfig'
import { getPaginatedAccounts } from '../../blockchain/utils'
import { MAX_PARALLEL_READ } from '../../constants'
import { EGoshError, GoshError } from '../../errors'
import { appToastStatusSelector } from '../../store/app.state'
import { executeByChunk, setLockableInterval, toBigint, whileFinite } from '../../utils'
import { getSystemContract } from '../blockchain/helpers'
import { GoshRepository } from '../blockchain/repository'
import {
  daoRepositoryListSelector,
  repoTokenWalletSelector,
} from '../store/repository.state'
import { TUserSelectOption } from '../types/form.types'
import { TGoshRepositoryListItem } from '../types/repository.types'
import { validateRepoName } from '../validators'
import { useDao, useDaoHelpers, useDaoMember } from './dao.hooks'
import { useProfile } from './user.hooks'

export function useCreateRepository() {
  const { details: dao } = useDao()
  const member = useDaoMember()
  const setRepositories = useSetRecoilState(daoRepositoryListSelector(dao.name))
  const { beforeCreateEvent, afterCreateEvent } = useDaoHelpers()
  const [status, setStatus] = useRecoilState(appToastStatusSelector('__createrepository'))

  const create = useCallback(
    async (name: string, description?: string, expert_tags?: string[]) => {
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
          expert_tags,
          comment,
          alone,
        })

        // If alone, wait for repository to be deployed and
        // update state
        if (alone) {
          const wait = await whileFinite(async () => await account.isDeployed())
          if (!wait) {
            throw new GoshError('Timeout error', 'Create repository timeout reached')
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
          throw new GoshError('Access error', 'Wallet is missing or is not activated')
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
          throw new GoshError('Access error', 'Wallet is missing or is not activated')
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
          throw new GoshError('Access error', 'Wallet is missing or is not activated')
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

export function useRepoTokenWallet(params: {
  initialize?: boolean
  subscribe?: boolean
  _rm: { dao_details: TDao; repo_name: string; repo_adapter: IGoshRepositoryAdapter }
}) {
  const { initialize, subscribe, _rm } = params
  const repo_path = `${_rm.dao_details.name}/${_rm.repo_name}`
  const profile = useProfile()
  const [data, setData] = useRecoilState(repoTokenWalletSelector(repo_path))
  const [is_deployed, setIsDeployed] = useState<boolean>(false)

  const getTokenWallet = useCallback(async () => {
    const sc = getSystemContract()
    const repo_acc = await sc.getRepository({
      address: _rm.repo_adapter.getAddress(),
    })
    const repo_details = await repo_acc.getDetails()

    // Set common token data
    if (!repo_details.token?.root_addr) {
      setData(null)
      return
    }
    const root_acc = AppConfig.getTIP3RootBroxus(repo_details.token.root_addr)
    const token_details = await root_acc.getDetails()
    const token_data = {
      name: token_details.name,
      symbol: token_details.symbol,
      decimals: token_details.decimals,
      root_addr: repo_details.token!.root_addr,
    }
    setData((state) => ({
      ...state,
      wallet: null,
      token: token_data,
      balance: BigInt(0),
    }))

    // Get token wallet and update state
    if (profile) {
      const wallet_acc = await repo_acc.getTokenWallet({ profile_addr: profile.address })
      const wallet_deployed = await wallet_acc.isDeployed()
      const balance = wallet_deployed ? await wallet_acc.getBalance() : BigInt(0)

      setData((state) => ({
        ...state!,
        wallet: wallet_acc,
        balance,
      }))
      setIsDeployed(wallet_deployed)
    }
  }, [repo_path])

  const getBalance = useCallback(async () => {
    if (!data?.wallet) {
      return
    }

    const balance = is_deployed ? await data.wallet.getBalance() : BigInt(0)
    setData((state) => (state ? { ...state, balance } : state))
  }, [repo_path, is_deployed])

  useEffect(() => {
    if (initialize) {
      getTokenWallet()
    }
  }, [initialize, getTokenWallet])

  useEffect(() => {
    if (!subscribe || !data?.wallet) {
      return
    }

    // Periodic update while account is not deployed
    const interval = setLockableInterval(async () => {
      console.debug('interval')
      await getBalance()
      const check_deployed = await data.wallet?.isDeployed()
      if (check_deployed) {
        console.debug('clear interval')
        setIsDeployed(true)
        clearInterval(interval)
      }
    }, 5000)

    // Subscribe for wallet account BOC change
    if (is_deployed) {
      console.debug('subscribe')
      data.wallet.account.subscribeAccount('boc', async () => {
        await getBalance()
      })
    }

    return () => {
      data.wallet!.account.free()
      clearInterval(interval)
    }
  }, [getBalance, data?.wallet?.address, subscribe])

  return data
}

export function useSendRepoTokens(params: { dao_name: string; repo_addr: string }) {
  const { dao_name, repo_addr } = params
  const profile = useProfile()
  const [status, setStatus] = useRecoilState(appToastStatusSelector('__sendrepotokens'))

  const send = async (params: { recipient: TUserSelectOption; value: string }) => {
    const { recipient, value } = params
    const sc = getSystemContract()
    console.debug('recipient: ', recipient)

    try {
      if (!profile) {
        throw new GoshError('SendRepositoryTokens', 'Sender profile undefined')
      }

      // Get token info
      setStatus((state) => ({
        ...state,
        type: 'pending',
        data: 'Get token info',
      }))
      const repo_acc = await sc.getRepository({ address: repo_addr })
      const repo_details = await repo_acc.getDetails()
      if (!repo_details.token?.root_addr) {
        throw new GoshError('SendRepositoryTokens', 'Token data undefined')
      }

      const root_acc = AppConfig.getTIP3RootBroxus(repo_details.token.root_addr)
      const token_data = await root_acc.getDetails()

      // Send tokens
      setStatus((state) => ({
        ...state,
        type: 'pending',
        data: 'Send tokens',
      }))
      await profile.sendRepoTokens({
        dao_name,
        repo_name: repo_details.name,
        recipient_profile_addr: recipient.value.address,
        value: toBigint(value, token_data.decimals),
      })

      setStatus((state) => ({ ...state, type: 'dismiss' }))
    } catch (e) {
      setStatus((state) => ({ ...state, type: 'error', data: e }))
      throw e
    }
  }

  return { status, send }
}
