import { useRecoilState, useResetRecoilState } from 'recoil'
import Web3 from 'web3'
import ELockAbi from '../../blockchain/abi/elock.abi.json'
import { bridgeTransferAtom } from '../store/bridge.state'
import { useCallback, useEffect } from 'react'
import { AppConfig } from '../../appconfig'
import { appToastStatusSelector } from '../../store/app.state'
import { GoshError } from '../../errors'
import { useUser } from './user.hooks'
import { fromBigint, toBigint, whileFinite } from '../../utils'
import {
    EBridgeNetwork,
    TBridgeTransferStatusItem,
    TBridgeUser,
} from '../types/bridge.types'
import { L2_COMISSION } from '../../constants'

export function useBridgeTransfer(options: { initialize?: boolean } = {}) {
    const { initialize } = options
    const timeout = 24 * 60 * 60 * 1000 // 24h

    const { user } = useUser()
    const [data, setData] = useRecoilState(bridgeTransferAtom)
    const resetData = useResetRecoilState(bridgeTransferAtom)
    const [status, setStatus] = useRecoilState(appToastStatusSelector('__bridgetransfer'))

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

    const connectGosh = useCallback(async () => {
        if (!user.keys?.public || !AppConfig.tip3root) {
            return
        }

        const wallet = await AppConfig.tip3root.getWallet({
            data: { pubkey: `0x${user.keys.public}` },
            keys: user.keys,
        })

        let balance = 0n
        if (await wallet.isDeployed()) {
            balance = await wallet.getBalance()
        }

        setData((state) => ({
            ...state,
            gosh: { instance: wallet, address: wallet.address },
            networks: {
                ...state.networks,
                [EBridgeNetwork.GOSH]: {
                    ...state.networks[EBridgeNetwork.GOSH],
                    balance,
                },
            },
            summary: setSummaryUser(state.summary, {
                network: EBridgeNetwork.GOSH,
                wallet: wallet.address,
                user: {
                    label: user.username!,
                    value: {
                        name: user.username!,
                        address: user.profile!,
                        type: 'user',
                        pubkey: `0x${user.keys!.public}`,
                    },
                },
            }),
        }))
    }, [user.keys?.public])

    const connectWeb3 = async () => {
        try {
            const { web3, provider } = getWeb3()
            const accounts = await provider.request({ method: 'eth_requestAccounts' })
            const address = accounts[0]
            const balance = await web3.eth.getBalance(address)
            setData((state) => ({
                ...state,
                web3: { instance: web3, address },
                networks: {
                    ...state.networks,
                    [EBridgeNetwork.ETH]: {
                        ...state.networks[EBridgeNetwork.ETH],
                        balance,
                    },
                },
                summary: setSummaryUser(state.summary, {
                    network: EBridgeNetwork.ETH,
                    wallet: address,
                    user: null,
                }),
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

    const setSummaryFormValues = (values: {
        from_network?: string
        from_amount?: string
        to_network?: string
        to_user?: { user: TBridgeUser | null; wallet: string }
        to_wallet?: string
    }) => {
        const goshCurrentUser = {
            label: user.username!,
            value: {
                name: user.username!,
                address: user.profile!,
                type: 'user',
                pubkey: `0x${user.keys!.public}`,
            },
        }

        if (values.from_network) {
            setData((state) => {
                const { to } = state.summary

                let from_user: TBridgeUser | null = null
                if (values.from_network === EBridgeNetwork.GOSH) {
                    from_user = goshCurrentUser
                }

                const to_updated = { ...to }
                if (
                    values.from_network === EBridgeNetwork.ETH &&
                    to.network === EBridgeNetwork.ETH
                ) {
                    to_updated.network = EBridgeNetwork.GOSH
                    to_updated.user = goshCurrentUser
                    to_updated.wallet = getNetworkAddress(to_updated.network)
                }

                return {
                    ...state,
                    summary: {
                        ...state.summary,
                        from: {
                            network: values.from_network!,
                            user: from_user,
                            wallet: getNetworkAddress(values.from_network!),
                            amount: state.summary.from.amount,
                        },
                        to: {
                            ...to_updated,
                            amount: state.summary.from.amount,
                        },
                    },
                }
            })
        } else if (values.from_amount && parseFloat(values.from_amount) > 0) {
            setData((state) => {
                // Subtract comission when ETH -> GOSH
                let to_amount = toBigint(
                    values.from_amount!,
                    state.networks[state.summary.from.network].decimals,
                )
                if (state.summary.from.network === EBridgeNetwork.ETH) {
                    to_amount = to_amount - to_amount / BigInt(L2_COMISSION)
                }

                return {
                    ...state,
                    summary: {
                        ...state.summary,
                        from: { ...state.summary.from, amount: values.from_amount! },
                        to: {
                            ...state.summary.to,
                            amount: fromBigint(
                                to_amount,
                                state.networks[state.summary.to.network].decimals,
                            ),
                        },
                    },
                }
            })
        } else if (values.to_network) {
            setData((state) => {
                const { from } = state.summary

                let to_user: TBridgeUser | null = null
                if (values.to_network === EBridgeNetwork.GOSH) {
                    to_user = goshCurrentUser
                }

                const from_updated = { ...from }
                if (
                    values.to_network === EBridgeNetwork.ETH &&
                    from.network === EBridgeNetwork.ETH
                ) {
                    from_updated.network = EBridgeNetwork.GOSH
                    from_updated.user = goshCurrentUser
                    from_updated.wallet = getNetworkAddress(from_updated.network)
                }

                return {
                    ...state,
                    summary: {
                        ...state.summary,
                        to: {
                            network: values.to_network!,
                            user: to_user,
                            wallet: getNetworkAddress(values.to_network!),
                            amount: state.summary.to.amount,
                        },
                        from: {
                            ...from_updated,
                            amount: state.summary.from.amount,
                        },
                    },
                }
            })
        } else if (values.to_user) {
            setData((state) => ({
                ...state,
                summary: {
                    ...state.summary,
                    to: {
                        ...state.summary.to,
                        user: values.to_user!.user,
                        wallet: values.to_user!.wallet,
                    },
                },
            }))
        } else if (values.to_wallet) {
            setData((state) => ({
                ...state,
                summary: {
                    ...state.summary,
                    to: {
                        ...state.summary.to,
                        user: null,
                        wallet: values.to_wallet!.toLowerCase(),
                    },
                },
            }))
        }
    }

    const submitRouteStep = () => {
        const route = `${data.summary.from.network}:${data.summary.to.network}`

        let progress: typeof data['summary']['progress'] = []
        if (route === `${EBridgeNetwork.ETH}:${EBridgeNetwork.GOSH}`) {
            progress = [
                { type: 'awaiting', message: 'Send ETH tokens' },
                { type: 'awaiting', message: 'Receive WETH tokens' },
            ]
        } else if (route === `${EBridgeNetwork.GOSH}:${EBridgeNetwork.ETH}`) {
            progress = [
                { type: 'awaiting', message: 'Send WETH tokens' },
                { type: 'awaiting', message: 'Receive ETH tokens' },
            ]
        } else if (route === `${EBridgeNetwork.GOSH}:${EBridgeNetwork.GOSH}`) {
            progress = [
                { type: 'awaiting', message: 'Prepare receiver wallet' },
                { type: 'awaiting', message: 'Send WETH tokens' },
            ]
        }

        setData((state) => ({
            ...state,
            step: 'transfer',
            summary: { ...state.summary, progress },
        }))
    }

    const submitTransferStep = async () => {
        try {
            const route = `${data.summary.from.network}:${data.summary.to.network}`
            if (route === `${EBridgeNetwork.ETH}:${EBridgeNetwork.GOSH}`) {
                await eth2gosh()
            } else if (route === `${EBridgeNetwork.GOSH}:${EBridgeNetwork.ETH}`) {
                await gosh2eth()
            } else if (route === `${EBridgeNetwork.GOSH}:${EBridgeNetwork.GOSH}`) {
                await gosh2gosh()
            } else {
                throw new GoshError('Value error', {
                    message: 'Transfer route unsupported',
                    route,
                })
            }

            setData((state) => ({ ...state, step: 'complete' }))
        } catch (e: any) {
            setStatus((state) => ({ ...state, type: 'error', data: e }))
            setData((state) => ({
                ...state,
                summary: {
                    ...state.summary,
                    progress: state.summary.progress.map((item) => {
                        return item.type === 'pending'
                            ? { ...item, type: 'awaiting' }
                            : item
                    }),
                },
            }))
            throw e
        }
    }

    const setSummaryUser = (
        state: typeof data['summary'],
        value: { network: string; wallet: string; user: TBridgeUser | null },
    ) => {
        const { network, wallet, user } = value
        return {
            ...state,
            from: {
                ...state.from,
                wallet: state.from.network === network ? wallet : state.from.wallet,
                user: state.from.network === network ? user : state.from.user,
            },
            to: state.to.wallet ? state.to : { ...state.to, wallet, user },
        }
    }

    const setSummaryProgress = (
        index: number,
        type: TBridgeTransferStatusItem['type'],
    ) => {
        setData((state) => ({
            ...state,
            summary: {
                ...state.summary,
                progress: state.summary.progress.map((item, i) => {
                    return i === index ? { ...item, type } : item
                }),
            },
        }))
    }

    const getNetworkAddress = (network: string) => {
        switch (network) {
            case EBridgeNetwork.ETH:
                return data.web3.address
            case EBridgeNetwork.GOSH:
                return data.gosh.address
            default:
                return ''
        }
    }

    const eth2gosh = async () => {
        if (!AppConfig.tip3root) {
            throw new GoshError('Value error', 'TIP3 root undefined')
        }
        if (!AppConfig.elockaddr) {
            throw new GoshError('Value error', 'ELock address undefined')
        }
        if (!data.web3.instance) {
            throw new GoshError('Web3 error', 'Web3 is not connected')
        }
        if (!data.gosh.instance) {
            throw new GoshError('Gosh error', 'Gosh wallet undefined')
        }
        if (!data.summary.to.user?.value.pubkey) {
            throw new GoshError('Value error', 'Receiver pubkey undefined')
        }

        const wallet = await AppConfig.tip3root.getWallet({
            address: data.summary.to.wallet,
        })
        const start = Math.round(Date.now() / 1000)

        // Send to Ethereum
        setSummaryProgress(0, 'pending')
        const elock = new data.web3.instance.eth.Contract(
            ELockAbi.abi,
            AppConfig.elockaddr,
        )
        // @ts-ignore
        const edata = elock.methods.deposit(data.summary.to.user.value.pubkey).encodeABI()
        const receipt = await data.web3.instance.eth.sendTransaction({
            from: data.web3.address,
            to: AppConfig.elockaddr,
            value: data.web3.instance.utils.toWei(data.summary.from.amount, 'ether'),
            data: edata,
            gasLimit: 100000,
            maxPriorityFeePerGas: 25000,
        })
        console.debug('ETH receipt', receipt)
        setSummaryProgress(0, 'completed')

        // Wait on GOSH
        setSummaryProgress(1, 'pending')
        const waitDeployed = await whileFinite(
            async () => {
                return await wallet.isDeployed()
            },
            10000,
            timeout,
        )
        if (!waitDeployed) {
            throw new GoshError('Timeout error', 'Gosh wallet is not deployed')
        }

        const waitMinted = await whileFinite(
            async () => {
                const { messages } = await wallet.getMessages(
                    { msgType: ['IntIn'], node: ['created_at'] },
                    true,
                )
                const filtered = messages
                    .filter(({ decoded }) => !!decoded)
                    .filter(({ message }) => message.created_at >= start)
                const index = filtered.findIndex(
                    ({ decoded }) => decoded.name === 'acceptMint',
                )
                return index >= 0
            },
            10000,
            timeout,
        )
        if (!waitMinted) {
            throw new GoshError('Timeout error', 'Tokens did not arive during timeout')
        }
        setSummaryProgress(1, 'completed')
    }

    const gosh2eth = async () => {
        if (!data.summary.to.wallet) {
            throw new GoshError('Value error', 'Ethereum address undefined')
        }
        if (!data.gosh.instance) {
            throw new GoshError('Gosh error', 'Gosh wallet undefined')
        }

        const { web3 } = getWeb3()
        const balance = await web3.eth.getBalance(data.summary.to.wallet)
        const startBalance = parseInt(web3.utils.fromWei(balance, 'wei'))

        // Send from gosh
        setSummaryProgress(0, 'pending')
        await data.gosh.instance.withdraw({
            amount: toBigint(
                data.summary.from.amount,
                data.networks[EBridgeNetwork.GOSH].decimals,
            ),
            l1addr: data.summary.to.wallet,
        })
        setSummaryProgress(0, 'completed')

        // Wait on ethereum
        setSummaryProgress(1, 'pending')
        const waitEth = await whileFinite(
            async () => {
                const balance = await web3.eth.getBalance(data.summary.to.wallet)
                const currBalance = parseInt(web3.utils.fromWei(balance, 'wei'))
                return currBalance > startBalance
            },
            10000,
            timeout,
        )
        if (!waitEth) {
            throw new GoshError('Timeout error', 'Wait for ethereum balance')
        }
        setSummaryProgress(1, 'completed')
    }

    const gosh2gosh = async () => {
        if (!AppConfig.tip3root) {
            throw new GoshError('Value error', 'TIP3 root undefined')
        }
        if (!data.gosh.instance) {
            throw new GoshError('Gosh error', 'Gosh wallet undefined')
        }
        if (!data.summary.to.user?.value.pubkey) {
            throw new GoshError('Value error', 'Receiver pubkey undefined')
        }

        // Get receiver wallet and deploy if needed
        setSummaryProgress(0, 'pending')
        const to_wallet = await AppConfig.tip3root.getWallet({
            address: data.summary.to.wallet,
        })
        if (!(await to_wallet.isDeployed())) {
            await data.gosh.instance.createEmptyWallet({
                pubkey: data.summary.to.user.value.pubkey,
            })
            const waitDeployed = await whileFinite(
                async () => {
                    return await to_wallet.isDeployed()
                },
                10000,
                timeout,
            )
            if (!waitDeployed) {
                throw new GoshError('Timeout error', 'Gosh wallet is not deployed')
            }
        }
        setSummaryProgress(0, 'completed')

        // Send tokens to receiver
        setSummaryProgress(1, 'pending')
        await data.gosh.instance.transfer({
            address: to_wallet.address,
            amount: toBigint(
                data.summary.from.amount,
                data.networks[EBridgeNetwork.GOSH].decimals,
            ),
        })
        setSummaryProgress(1, 'completed')
    }

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
            const balance = await data.web3.instance.eth.getBalance(address)
            setData((state) => ({
                ...state,
                web3: { ...state.web3, address: address.toLowerCase() },
                networks: {
                    ...state.networks,
                    [EBridgeNetwork.ETH]: {
                        ...state.networks[EBridgeNetwork.ETH],
                        balance,
                    },
                },
                summary: setSummaryUser(state.summary, {
                    network: EBridgeNetwork.ETH,
                    wallet: address.toLowerCase(),
                    user: null,
                }),
            }))
        } catch (e: any) {
            setStatus((state) => ({ ...state, type: 'error', data: e }))
            console.error(e.message)
        }
    }, [!!data.web3.instance])

    const goshSubscribeCallback = useCallback(async () => {
        if (!data.gosh.instance) {
            return
        }

        const balance = await data.gosh.instance.getBalance()
        setData((state) => ({
            ...state,
            networks: {
                ...state.networks,
                [EBridgeNetwork.GOSH]: {
                    ...state.networks[EBridgeNetwork.GOSH],
                    balance,
                },
            },
        }))
    }, [data.gosh.instance?.address])

    // Connect GOSH account
    useEffect(() => {
        if (initialize) {
            if (!AppConfig.tip3root) {
                setData((state) => ({
                    ...state,
                    error: new GoshError('TIP3 root undefined'),
                }))
            } else {
                connectGosh()
            }
        }
    }, [initialize, connectGosh])

    // Subscribe GOSH account
    useEffect(() => {
        if (!initialize) {
            return
        }

        data.gosh.instance?.account.subscribeMessages(
            'id body msg_type',
            async ({ body, msg_type }) => {
                const decoded = await data.gosh.instance!.decodeMessageBody(
                    body,
                    msg_type,
                )
                const triggers = ['acceptMint', 'acceptTransfer', 'transfer']
                if (decoded && triggers.indexOf(decoded.name) >= 0) {
                    await goshSubscribeCallback()
                }
            },
        )

        return () => {
            if (initialize) {
                data.gosh.instance?.account.free()
            }
        }
    }, [initialize, goshSubscribeCallback])

    // Subscribe ETH account/provider
    useEffect(() => {
        if (!initialize) {
            return
        }

        data.web3.instance?.provider?.on('chainChanged', web3SubscribeCallback)
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
    }, [initialize, web3SubscribeCallback])

    return {
        ...data,
        status,
        reset,
        setStep,
        connectWeb3,
        setSummaryFormValues,
        submitRouteStep,
        submitTransferStep,
    }
}
