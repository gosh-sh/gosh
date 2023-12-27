import { KeyPair } from '@eversdk/core'
import { useCallback, useEffect, useMemo } from 'react'
import { useRecoilState, useResetRecoilState } from 'recoil'
import Web3 from 'web3'
import { AppConfig } from '../../appconfig'
import ELockAbi from '../../blockchain/abi/elock.abi.json'
import ERC20Abi from '../../blockchain/abi/erc20.abi.json'
import { L2_COMISSION } from '../../constants'
import { GoshError } from '../../errors'
import { appToastStatusSelector } from '../../store/app.state'
import { supabase } from '../../supabase'
import { fromBigint, setLockableInterval, toBigint, whileFinite } from '../../utils'
import { l2Tokens, l2TransferAtom } from '../store/l2.state'
import { EL2Network, TL2Token, TL2TransferStatusItem, TL2User } from '../types/l2.types'
import { useUser } from './user.hooks'

export function useL2Transfer(options: { initialize?: boolean } = {}) {
  const { initialize } = options
  const timeout = 24 * 60 * 60 * 1000 // 24h

  const { user } = useUser()
  const [data, setData] = useRecoilState(l2TransferAtom)
  const resetData = useResetRecoilState(l2TransferAtom)
  const [status, setStatus] = useRecoilState(appToastStatusSelector('__l2transfer'))

  const goshUser = useMemo(() => {
    if (!user.username) {
      return null
    }

    return {
      label: user.username!,
      value: {
        name: user.username!,
        address: user.profile!,
        type: 'user',
        pubkey: `0x${user.keys!.public}`,
      },
    }
  }, [user.username, user.profile, user.keys])

  const getWeb3 = () => {
    const provider = (window as any).ethereum
    if (!provider) {
      throw new GoshError(
        'Web3 error',
        'Please install MetaMask to connect to the Ethereum network',
      )
    }
    return { web3: new Web3(provider), provider }
  }

  const isWeb3ChainSupported = (chain_id: string) => {
    return ['0x1'].indexOf(chain_id) >= 0
  }

  const getGoshWallet = async (rootaddr: string, pubkey: string, keys?: KeyPair) => {
    const wallet = await AppConfig.getTIP3Root(rootaddr).getWallet({
      data: { pubkey: `0x${pubkey}` },
      keys,
    })

    let balance = 0n
    if (await wallet.isDeployed()) {
      balance = await wallet.getBalance()
    }

    return { wallet, balance }
  }

  const getWeb3Balance = useCallback(
    async (address: string, rootaddr?: string | null) => {
      const { web3 } = getWeb3()

      if (!rootaddr) {
        return await web3.eth.getBalance(address)
      }

      const contract = new web3.eth.Contract(ERC20Abi, rootaddr)
      // @ts-ignore
      const balance = await contract.methods.balanceOf(address).call()
      // @ts-ignore
      return balance as bigint
    },
    [data.web3.address],
  )

  const getErc20Approvement = async (rootaddr: string, walletaddr: string) => {
    if (!data.web3.instance) {
      throw new GoshError('Web3 error', 'Web3 is not connected')
    }

    const elock = new data.web3.instance.eth.Contract(ELockAbi.abi, AppConfig.elockaddr)
    const result: any = await elock.methods
      // @ts-ignore
      .getERC20Approvement(rootaddr, walletaddr)
      .call()
    return { commission: result.commission as bigint, value: result.value as bigint }
  }

  const connectGosh = useCallback(async () => {
    if (!user.keys?.public) {
      return
    }

    const default_token = l2Tokens.find((token) => token.pair_name === 'weth')
    if (!default_token || !default_token.rootaddr) {
      return
    }

    const { wallet, balance } = await getGoshWallet(
      default_token.rootaddr,
      user.keys.public,
      user.keys,
    )

    setData((state) => ({
      ...state,
      gosh: {
        instance: wallet,
        address: wallet.address,
        chain_id: '',
        token: default_token,
        balance,
      },
    }))
  }, [user.keys?.public])

  const connectWeb3 = async () => {
    try {
      const { web3, provider } = getWeb3()
      const accounts = await provider.request({ method: 'eth_requestAccounts' })
      const chain_id = await provider.request({ method: 'eth_chainId' })
      const address = accounts[0]
      const balance = await getWeb3Balance(address)
      setData((state) => ({
        ...state,
        web3: {
          instance: web3,
          address,
          chain_id,
          chain_supported: isWeb3ChainSupported(chain_id),
          token: l2Tokens.find((token) => token.pair_name === 'eth'),
          balance,
        },
      }))
    } catch (e: any) {
      setStatus((state) => ({ ...state, type: 'error', data: e }))
      throw e
    }
  }

  const reset = async () => {
    resetData()
    await connectGosh()
  }

  const setStep = (step: 'route') => {
    setData((state) => ({ ...state, step }))
  }

  const setSummaryToken = async (dir: 'from' | 'to', token: TL2Token) => {
    setData((state) => {
      const summary = {
        ...state.summary,
        [dir]: { ...state.summary[dir], token },
      }

      if (dir === 'from') {
        const token_to = l2Tokens.filter((item) => {
          return token.pair_with.indexOf(item.pair_name) >= 0
        })[0]
        summary.to = { ...summary.to, token: token_to }
      }

      return { ...state, summary }
    })
  }

  const setSummaryUser = async (user: TL2User) => {
    const profile = await AppConfig.goshroot.getUserProfile({
      address: user.value.address,
    })
    const pubkey = (await profile.getPubkeys())[0]

    setData((state) => ({
      ...state,
      summary: {
        ...state.summary,
        to: {
          ...state.summary.to,
          user: { ...user, value: { ...user.value, pubkey } },
        },
      },
    }))
  }

  const setSummaryWallet = async (address: string) => {
    setData((state) => ({
      ...state,
      summary: {
        ...state.summary,
        to: { ...state.summary.to, user: null, wallet: address.toLowerCase() },
      },
    }))
  }

  const setSummaryAmount = async (amount: string) => {
    // to.amount is calculated by useCallback with deps
    if (!isNaN(Number(amount))) {
      setData((state) => ({
        ...state,
        summary: {
          ...state.summary,
          from: { ...state.summary.from, amount: amount.trim() },
        },
      }))
    }
  }

  const submitRouteStep = () => {
    const route = `${data.summary.from.token.network}:${data.summary.to.token.network}`

    let steps: (typeof data)['summary']['progress']['steps'] = []
    if (route === `${EL2Network.ETH}:${EL2Network.GOSH}`) {
      if (data.summary.from.token.rootaddr) {
        steps.push({
          type: 'approve_erc20',
          status: 'awaiting',
          message: 'Approve tokens',
        })
        steps.push({
          type: 'deposit_erc20',
          status: 'disabled',
          message: 'Deposit tokens',
        })
      } else {
        steps.push({
          type: 'deposit_eth',
          status: 'awaiting',
          message: 'Transfer tokens',
        })
      }

      steps.push({
        type: 'receive',
        status: 'awaiting',
        message: 'Receive tokens',
        help: 'Tokens should arrive within 15 minutes after deposit',
      })
    } else if (route === `${EL2Network.GOSH}:${EL2Network.ETH}`) {
      steps = [
        {
          type: 'withdraw_gosh',
          status: 'awaiting',
          message: 'Withdraw from GOSH',
        },
      ]
      if (data.summary.from.token.pair_name !== 'weth') {
        steps.push({
          type: 'withdraw_erc20',
          status: 'disabled',
          message: 'Withdraw from ELock',
          help: 'It can take up to 3 hours, you can close this tab and complete withdrawal later',
        })
      }

      steps.push({ type: 'receive', status: 'awaiting', message: 'Receive tokens' })
    } else if (route === `${EL2Network.GOSH}:${EL2Network.GOSH}`) {
      steps = [
        {
          type: 'prepare',
          status: 'awaiting',
          message: 'Prepare receiver wallet',
        },
        { type: 'transfer', status: 'awaiting', message: 'Send tokens' },
      ]
    }

    setData((state) => ({
      ...state,
      step: 'transfer',
      summary: { ...state.summary, progress: { route, steps } },
    }))
  }

  const setSummaryProgress = (
    type: TL2TransferStatusItem['type'],
    status: TL2TransferStatusItem['status'],
  ) => {
    setData((state) => ({
      ...state,
      summary: {
        ...state.summary,
        progress: {
          ...state.summary.progress,
          steps: state.summary.progress.steps.map((item, i) => {
            return item.type === type ? { ...item, status } : item
          }),
        },
      },
    }))
  }

  const transferGosh = async () => {
    try {
      if (!data.gosh.instance) {
        throw new GoshError('Value error', 'Gosh wallet undefined')
      }
      if (!data.summary.to.token.rootaddr) {
        throw new GoshError('Value error', 'Token root undefiled')
      }
      if (!data.summary.to.user?.value.pubkey) {
        throw new GoshError('Value error', 'Receiver pubkey undefined')
      }

      // Prepare receiver wallet
      setSummaryProgress('prepare', 'pending')
      const root = AppConfig.getTIP3Root(data.summary.to.token.rootaddr)
      const wallet = await root.getWallet({ address: data.summary.to.wallet })
      if (!(await wallet.isDeployed())) {
        await data.gosh.instance.createEmptyWallet({
          pubkey: data.summary.to.user.value.pubkey,
        })
        const wait_deployed = await whileFinite(
          async () => await wallet.isDeployed(),
          10000,
          timeout,
        )
        if (!wait_deployed) {
          throw new GoshError('Timeout error', 'Gosh wallet is not deployed')
        }
      }
      setSummaryProgress('prepare', 'completed')

      // Send tokens
      setSummaryProgress('transfer', 'pending')
      await data.gosh.instance.transfer({
        address: wallet.address,
        amount: toBigint(data.summary.from.amount, data.summary.from.token.decimals),
      })
      setSummaryProgress('transfer', 'completed')
      setData((state) => ({ ...state, step: 'complete' }))
    } catch (e) {
      setStatus((state) => ({ ...state, type: 'error', data: e }))
      setSummaryProgress('prepare', 'awaiting')
      setSummaryProgress('transfer', 'awaiting')
    }
  }

  const approveErc20 = async () => {
    try {
      if (!AppConfig.elockaddr) {
        throw new GoshError('Value error', 'ELock address undefined')
      }
      if (!data.web3.instance) {
        throw new GoshError('Web3 error', 'Web3 is not connected')
      }
      if (!data.summary.from.token.rootaddr) {
        throw new GoshError('Value error', 'Token root undefiled')
      }

      setSummaryProgress('approve_erc20', 'pending')

      const token_root = new data.web3.instance.eth.Contract(
        ERC20Abi,
        data.summary.from.token.rootaddr,
      )
      const amount = toBigint(data.summary.from.amount, data.summary.from.token.decimals)
      const edata = token_root.methods
        // @ts-ignore
        .approve(AppConfig.elockaddr, amount)
        .encodeABI()
      await data.web3.instance.eth.sendTransaction({
        from: data.web3.address,
        to: data.summary.from.token.rootaddr,
        data: edata,
        gasLimit: 200000,
        maxPriorityFeePerGas: 25000,
      })

      setSummaryProgress('approve_erc20', 'completed')
      setSummaryProgress('deposit_erc20', 'awaiting')
    } catch (e) {
      setStatus((state) => ({ ...state, type: 'error', data: e }))
      setSummaryProgress('approve_erc20', 'awaiting')
    }
  }

  const depositErc20 = async () => {
    try {
      if (!AppConfig.elockaddr) {
        throw new GoshError('Value error', 'ELock address undefined')
      }
      if (!data.web3.instance) {
        throw new GoshError('Web3 error', 'Web3 is not connected')
      }
      if (!data.summary.from.token.rootaddr) {
        throw new GoshError('Value error', 'Token root undefiled')
      }
      if (!data.summary.to.user?.value.pubkey) {
        throw new GoshError('Value error', 'Receiver pubkey undefined')
      }

      setSummaryProgress('deposit_erc20', 'pending')

      const elock = new data.web3.instance.eth.Contract(ELockAbi.abi, AppConfig.elockaddr)
      const amount = toBigint(data.summary.from.amount, data.summary.from.token.decimals)
      const edata = elock.methods
        .depositERC20(
          // @ts-ignore
          data.summary.from.token.rootaddr,
          amount,
          data.summary.to.user.value.pubkey,
        )
        .encodeABI()
      await data.web3.instance.eth.sendTransaction({
        from: data.web3.address,
        to: AppConfig.elockaddr,
        data: edata,
        gasLimit: 200000,
        maxPriorityFeePerGas: 25000,
      })

      setSummaryProgress('deposit_erc20', 'completed')
      await receiveGosh()
    } catch (e) {
      setStatus((state) => ({ ...state, type: 'error', data: e }))
      setSummaryProgress('deposit_erc20', 'awaiting')
    }
  }

  const depositEth = async () => {
    try {
      if (!AppConfig.elockaddr) {
        throw new GoshError('Value error', 'ELock address undefined')
      }
      if (!data.web3.instance) {
        throw new GoshError('Web3 error', 'Web3 is not connected')
      }
      if (!data.summary.to.user?.value.pubkey) {
        throw new GoshError('Value error', 'Receiver pubkey undefined')
      }

      setSummaryProgress('deposit_eth', 'pending')

      const elock = new data.web3.instance.eth.Contract(ELockAbi.abi, AppConfig.elockaddr)
      const edata = elock.methods
        // @ts-ignore
        .deposit(data.summary.to.user.value.pubkey)
        .encodeABI()
      await data.web3.instance.eth.sendTransaction({
        from: data.web3.address,
        to: AppConfig.elockaddr,
        value: data.web3.instance.utils.toWei(data.summary.from.amount, 'ether'),
        data: edata,
        gasLimit: 200000,
        maxPriorityFeePerGas: 25000,
      })

      setSummaryProgress('deposit_eth', 'completed')
      await receiveGosh()
    } catch (e) {
      setStatus((state) => ({ ...state, type: 'error', data: e }))
      setSummaryProgress('deposit_eth', 'awaiting')
    }
  }

  const receiveGosh = async () => {
    try {
      if (!data.summary.to.token.rootaddr) {
        throw new GoshError('Value error', 'Token root undefiled')
      }

      setSummaryProgress('receive', 'pending')

      const start = Math.round(Date.now() / 1000)
      const token_root = AppConfig.getTIP3Root(data.summary.to.token.rootaddr)
      const wallet = await token_root.getWallet({ address: data.summary.to.wallet })

      // Wait deployed
      const wait_deployed = await whileFinite(
        async () => await wallet.isDeployed(),
        10000,
        timeout,
      )
      if (!wait_deployed) {
        throw new GoshError('Timeout error', 'Gosh wallet is not deployed')
      }

      // Wait minted
      const wait_minted = await whileFinite(
        async () => {
          const { messages } = await wallet.getMessages(
            { msgType: ['IntIn'], node: ['created_at'] },
            true,
          )
          const filtered = messages
            .filter(({ decoded }) => !!decoded)
            .filter(({ message }) => message.created_at >= start)
          const index = filtered.findIndex(({ decoded }) => decoded.name === 'acceptMint')
          return index >= 0
        },
        10000,
        timeout,
      )
      if (!wait_minted) {
        throw new GoshError('Timeout error', 'Tokens did not arive during timeout')
      }

      setSummaryProgress('receive', 'completed')
      setData((state) => ({ ...state, step: 'complete' }))
    } catch (e) {
      setStatus((state) => ({ ...state, type: 'error', data: e }))
      setSummaryProgress('receive', 'awaiting')
    }
  }

  const withdrawGosh = async (options: { isErc20: boolean }) => {
    try {
      if (!data.summary.to.wallet) {
        throw new GoshError('Value error', 'Ethereum address undefined')
      }
      if (!data.gosh.instance) {
        throw new GoshError('Gosh error', 'Gosh wallet undefined')
      }

      setSummaryProgress('withdraw_gosh', 'pending')

      // Get start balance
      const balance = await getWeb3Balance(data.summary.to.wallet)

      // Withdraw
      await data.gosh.instance.withdraw({
        amount: toBigint(data.summary.from.amount, data.summary.from.token.decimals),
        l1addr: data.summary.to.wallet,
      })
      setSummaryProgress('withdraw_gosh', 'completed')

      if (options.isErc20) {
        setSummaryProgress('withdraw_erc20', 'awaiting')
      } else {
        await receiveEth(balance)
      }
    } catch (e) {
      setStatus((state) => ({ ...state, type: 'error', data: e }))
      setSummaryProgress('withdraw_gosh', 'awaiting')
    }
  }

  const withdrawErc20 = async (params: {
    rootaddr: string
    walletaddr: string
    alone?: boolean
  }) => {
    const { rootaddr, walletaddr, alone } = params

    try {
      if (!data.web3.instance) {
        throw new GoshError('Web3 error', 'Web3 is not connected')
      }

      setSummaryProgress('withdraw_erc20', 'pending')

      // Withdraw commission
      let commission = 0n
      const elock = new data.web3.instance.eth.Contract(ELockAbi.abi, AppConfig.elockaddr)
      const wait_commission = await whileFinite(
        async () => {
          const result = await getErc20Approvement(rootaddr, walletaddr)
          commission = result.commission
          return commission > 0n
        },
        10000,
        timeout,
      )
      if (!wait_commission) {
        throw new GoshError('Timeout error', 'Wait for withdrawal')
      }

      // Get start balance
      const balance = await getWeb3Balance(walletaddr, rootaddr)

      // Withdraw
      // @ts-ignore
      const edata = elock.methods.withdrawERC20(rootaddr).encodeABI()
      await data.web3.instance.eth.sendTransaction({
        from: data.web3.address,
        to: AppConfig.elockaddr,
        value: commission,
        data: edata,
        gasLimit: 200000,
        maxPriorityFeePerGas: 25000,
      })

      setSummaryProgress('withdraw_erc20', 'completed')
      await receiveErc20({ rootaddr, walletaddr, start_balance: balance, alone })
    } catch (e) {
      setStatus((state) => ({ ...state, type: 'error', data: e }))
      setSummaryProgress('withdraw_erc20', 'awaiting')
      throw e
    }
  }

  const receiveEth = async (start_balance: bigint) => {
    try {
      if (!data.web3.instance) {
        throw new GoshError('Web3 error', 'Web3 is not connected')
      }

      setSummaryProgress('receive', 'pending')

      const wait_eth = await whileFinite(
        async () => {
          const curr_balance = await getWeb3Balance(data.summary.to.wallet)
          return curr_balance > start_balance
        },
        10000,
        timeout,
      )
      if (!wait_eth) {
        throw new GoshError('Timeout error', 'Wait for ethereum balance')
      }

      setSummaryProgress('receive', 'completed')
      setData((state) => ({ ...state, step: 'complete' }))
    } catch (e) {
      setStatus((state) => ({ ...state, type: 'error', data: e }))
      setSummaryProgress('receive', 'awaiting')
    }
  }

  const receiveErc20 = async (params: {
    rootaddr: string
    walletaddr: string
    start_balance: bigint
    alone?: boolean
  }) => {
    const { rootaddr, walletaddr, start_balance, alone } = params
    try {
      if (!data.web3.instance) {
        throw new GoshError('Web3 error', 'Web3 is not connected')
      }

      // Alone means running method outside steps flow
      if (!alone) {
        setSummaryProgress('receive', 'pending')
      }

      const wait_erc20 = await whileFinite(
        async () => {
          const curr_balance = await getWeb3Balance(walletaddr, rootaddr)
          return curr_balance > start_balance
        },
        10000,
        timeout,
      )
      if (!wait_erc20) {
        throw new GoshError('Timeout error', 'Wait for ethereum balance')
      }

      if (!alone) {
        setSummaryProgress('receive', 'completed')
      }
      setData((state) => ({
        ...state,
        withdrawals: state.withdrawals.map((item) => {
          if (item.token?.rootaddr !== rootaddr) {
            return item
          }
          return { ...item, value: 0n, commission: 0n }
        }),
        step: !alone ? 'complete' : state.step,
      }))
    } catch (e) {
      setStatus((state) => ({ ...state, type: 'error', data: e }))
      setSummaryProgress('receive', 'awaiting')
      throw e
    }
  }

  // Get incoming withdrawals (periodically)
  const getEthWithdrawals = useCallback(async () => {
    try {
      if (!data.web3.instance) {
        throw new GoshError('Web3 error', 'Web3 is not connected')
      }

      const elock = new data.web3.instance.eth.Contract(ELockAbi.abi, AppConfig.elockaddr)

      let roots: string[] = await elock.methods.getTokenRoots().call()
      roots = roots.filter((item) => {
        return item !== '0x0000000000000000000000000000000000000000'
      })

      const withdrawals = await Promise.all(
        roots.map(async (root) => {
          const result = await getErc20Approvement(root, data.web3.address)
          const token = l2Tokens.filter((item) => item.rootaddr === root)[0]
          return { token, ...result }
        }),
      )
      setData((state) => ({ ...state, withdrawals }))
    } catch (e) {
      console.error('Get eth withrawals', e)
    }
  }, [data.web3.chain_id, data.web3.address, user.keys?.public])

  useEffect(() => {
    let interval: NodeJS.Timeout

    if (initialize) {
      getEthWithdrawals()
      interval = setLockableInterval(async () => await getEthWithdrawals(), 60000)
    }

    return () => {
      clearInterval(interval)
    }
  }, [initialize, getEthWithdrawals])
  // /Get incoming withdrawals (periodically)

  // React on `token_from` change
  const onSetTokenFromCallback = useCallback(async () => {
    const token = data.summary.from.token

    if (token.network === EL2Network.ETH) {
      if (!data.web3.address) {
        throw new GoshError('Value error', 'Web3 address undefined')
      }
      const balance = await getWeb3Balance(data.web3.address, token.rootaddr)
      setData((state) => ({
        ...state,
        web3: { ...state.web3, token, balance },
        summary: {
          ...state.summary,
          from: {
            ...state.summary.from,
            token,
            user: null,
            wallet: data.web3.address!,
          },
        },
      }))
    } else if (token.network === EL2Network.GOSH) {
      if (!user.keys) {
        throw new GoshError('Value error', 'User keys undefined')
      }
      if (!token.rootaddr) {
        throw new GoshError('Value error', 'Token root address undefined')
      }
      const { wallet, balance } = await getGoshWallet(
        token.rootaddr,
        user.keys.public,
        user.keys,
      )
      setData((state) => ({
        ...state,
        gosh: {
          ...state.gosh,
          token,
          instance: wallet,
          address: wallet.address,
          balance,
        },
        summary: {
          ...state.summary,
          from: {
            ...state.summary.from,
            token,
            user: goshUser,
            wallet: wallet.address,
          },
        },
      }))
    }
  }, [data.summary.from.token.pair_name, data.web3.address, goshUser?.value.address])

  useEffect(() => {
    if (initialize) {
      onSetTokenFromCallback()
    }
  }, [initialize, onSetTokenFromCallback])
  // /React on `token_from` change

  // React on `token_to` change
  const onSetTokenToCallback = useCallback(() => {
    const token = data.summary.to.token

    setData((state) => ({
      ...state,
      summary: {
        ...state.summary,
        to: {
          ...state.summary.to,
          user: token.network === EL2Network.GOSH ? goshUser : null,
        },
      },
    }))
  }, [data.summary.to.token.pair_name, data.web3.address, goshUser?.value.address])

  useEffect(() => {
    if (initialize) {
      onSetTokenToCallback()
    }
  }, [initialize, onSetTokenToCallback])
  // /React on `token_to` change

  // React on `user_to` change
  const onSetUserToCallback = useCallback(async () => {
    const user_to = data.summary.to.user
    const network_to = data.summary.to.token.network

    if (!user_to && network_to === EL2Network.GOSH) {
      setData((state) => ({
        ...state,
        summary: {
          ...state.summary,
          to: { ...state.summary.to, wallet: '' },
        },
      }))
    } else if (!user_to && network_to === EL2Network.ETH) {
      setData((state) => ({
        ...state,
        summary: {
          ...state.summary,
          to: { ...state.summary.to, wallet: data.web3.address },
        },
      }))
    } else if (user_to && network_to === EL2Network.GOSH) {
      if (!data.summary.to.token.rootaddr) {
        throw new GoshError('Value error', 'Token root undefined')
      }
      if (!data.summary.to.user?.value.pubkey) {
        throw new GoshError('Value error', 'Token root undefined')
      }

      const { wallet } = await getGoshWallet(
        data.summary.to.token.rootaddr,
        data.summary.to.user.value.pubkey.slice(2),
      )

      setData((state) => ({
        ...state,
        summary: {
          ...state.summary,
          to: { ...state.summary.to, wallet: wallet.address },
        },
      }))
    }
  }, [data.summary.to.user, data.summary.to.token.rootaddr, data.web3.address, goshUser])

  useEffect(() => {
    if (initialize) {
      onSetUserToCallback()
    }
  }, [initialize, onSetUserToCallback])
  // /React on `user_to` change

  // React on commissions change (update `amount_to`)
  const onSetCommissionsCallback = useCallback(() => {
    const { summary, comissions } = data

    const route = `${summary.from.token.network}:${summary.to.token.network}`

    let commission = comissions[route]
    if (summary.to.token.network !== EL2Network.GOSH && summary.to.token.rootaddr) {
      commission = 0n
    }

    const from_amount = toBigint(summary.from.amount, summary.from.token.decimals)
    const to_amount = from_amount > commission ? from_amount - commission : 0n

    setData((state) => ({
      ...state,
      summary: {
        ...state.summary,
        to: {
          ...state.summary.to,
          amount: fromBigint(to_amount, summary.to.token.decimals),
        },
      },
    }))
  }, [data.comissions])

  useEffect(() => {
    if (initialize) {
      onSetCommissionsCallback()
    }
  }, [initialize, onSetCommissionsCallback])
  // /React on commissions change (update `amount_to`)

  // Recalculate commissions by deps
  useEffect(() => {
    const { summary, comissions } = data
    const route = `${summary.from.token.network}:${summary.to.token.network}`

    // Cast from_amount to BigInt
    const from_amount = toBigint(summary.from.amount, summary.from.token.decimals)

    // Calculate comission
    let comission = 0n
    if (route === `${EL2Network.ETH}:${EL2Network.GOSH}`) {
      comission = from_amount / BigInt(L2_COMISSION)
    } else if (route === `${EL2Network.GOSH}:${EL2Network.ETH}`) {
      comission = comissions[route]
    }

    setData((state) => ({
      ...state,
      comissions: { ...state.comissions, [route]: comission },
    }))
  }, [
    data.summary.from.token.pair_name,
    data.summary.to.token.pair_name,
    data.summary.from.amount,
  ])

  // Connect GOSH account
  useEffect(() => {
    if (initialize) {
      connectGosh()
    }
  }, [initialize, connectGosh])

  // Subscribe GOSH account
  const goshSubscribeCallback = useCallback(async () => {
    if (!data.gosh.instance) {
      return
    }
    const balance = await data.gosh.instance.getBalance()
    setData((state) => ({
      ...state,
      gosh: { ...state.gosh, balance },
    }))
  }, [data.gosh.instance?.address])

  useEffect(() => {
    if (!initialize) {
      return
    }

    data.gosh.instance?.account.subscribeAccount('boc', async () => {
      await goshSubscribeCallback()
    })

    return () => {
      if (initialize) {
        data.gosh.instance?.account.free()
      }
    }
  }, [initialize, goshSubscribeCallback])
  // /Subscribe GOSH account

  // Subscribe web3 account/provider
  const web3ChainChangedCallback = useCallback(
    (chain_id: string) => {
      setData((state) => ({
        ...state,
        web3: {
          ...state.web3,
          chain_id,
          chain_supported: isWeb3ChainSupported(chain_id),
        },
      }))
    },
    [!!data.web3.instance],
  )

  const web3SubscribeCallback = useCallback(async () => {
    try {
      if (!data.web3.instance) {
        throw new GoshError('Web3 error', 'Web3 is not connected')
      }
      const accounts = await data.web3.instance.eth.getAccounts()
      if (!accounts.length) {
        await reset()
        return
      }

      const address = accounts[0]
      const balance = await getWeb3Balance(address, data.web3.token?.rootaddr)
      const user = null
      const wallet = address.toLowerCase()
      setData((state) => ({
        ...state,
        web3: { ...state.web3, address: wallet, balance },
        summary: {
          ...state.summary,
          from: {
            ...state.summary.from,
            user:
              state.summary.from.token.network === EL2Network.ETH
                ? user
                : state.summary.from.user,
            wallet:
              state.summary.from.token.network === EL2Network.ETH
                ? wallet
                : state.summary.from.wallet,
          },
          to: state.summary.to.wallet
            ? state.summary.to
            : { ...state.summary.to, user, wallet },
        },
      }))
    } catch (e: any) {
      console.error(e.message)
    }
  }, [!!data.web3.instance, data.web3.token?.pair_name])

  useEffect(() => {
    if (!initialize) {
      return
    }

    data.web3.instance?.provider?.on('chainChanged', web3ChainChangedCallback)
    data.web3.instance?.provider?.on('accountsChanged', web3SubscribeCallback)
    data.web3.instance?.eth.subscribe('newBlockHeaders').then((subscription) => {
      subscription.on('data', web3SubscribeCallback)
      subscription.on('error', (data) => console.error('[web3 subscribe]', data))
    })

    return () => {
      if (initialize) {
        data.web3.instance?.provider?.removeListener('chainChanged', () => {})
        data.web3.instance?.provider?.removeListener('accountsChanged', () => {})
        data.web3.instance?.eth.clearSubscriptions()
      }
    }
  }, [initialize, web3ChainChangedCallback, web3SubscribeCallback])
  // /Subscribe web3 account/provider

  // Subscribe (periodic update) for eth comission
  const getEthComission = useCallback(async () => {
    try {
      const { data, error } = await supabase.client
        .from('l2_state')
        .select()
        .order('created_at', { ascending: false })
        .limit(1)
      if (error) {
        throw new GoshError('Get web3 comission', error.message)
      }
      if (!data.length) {
        throw new GoshError('Get web3 comission', 'No data')
      }

      const row = data[0]
      let comission = BigInt(row.current_approximate_elock_commissions)
      comission += 21000n * BigInt(row.current_eth_gas_price)
      comission /= BigInt(row.queued_burns_cnt + 1)

      setData((state) => ({
        ...state,
        comissions: {
          ...state.comissions,
          [`${EL2Network.GOSH}:${EL2Network.ETH}`]: comission,
        },
      }))
    } catch (e: any) {
      console.warn(e.message)
    }
  }, [])

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (initialize) {
      getEthComission()
      interval = setLockableInterval(async () => {
        await getEthComission()
      }, 15000)
    }

    return () => {
      clearInterval(interval)
    }
  }, [initialize, getEthComission])
  // /Subscribe (periodic update) for web3 comission

  return {
    ...data,
    status,
    reset,
    setStep,
    setSummaryToken,
    setSummaryUser,
    setSummaryWallet,
    setSummaryAmount,
    connectWeb3,
    submitRouteStep,
    approveErc20,
    depositErc20,
    depositEth,
    withdrawGosh,
    withdrawErc20,
    transferGosh,
  }
}
