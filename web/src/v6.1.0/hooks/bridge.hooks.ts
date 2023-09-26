import { useRecoilState, useResetRecoilState } from 'recoil'
import Web3 from 'web3'
import ELockAbi from '../../blockchain/abi/elock.abi.json'
import { bridgeTransferAtom } from '../store/bridge.state'
import { useCallback, useEffect } from 'react'
import { AppConfig } from '../../appconfig'
import { appToastStatusSelector } from '../../store/app.state'
import { GoshError } from '../../errors'
import { useUser } from './user.hooks'
import { whileFinite } from '../../utils'
import { EBridgeNetwork, TBridgeTransferStatusItem } from '../types/bridge.types'
import { TIP3Wallet } from '../../blockchain/tip3wallet'

export function useBridgeTransfer(options: { initialize?: boolean } = {}) {
    const { initialize } = options
    const { user } = useUser()
    const [data, setData] = useRecoilState(bridgeTransferAtom)
    const resetData = useResetRecoilState(bridgeTransferAtom)
    const [status, setStatus] = useRecoilState(appToastStatusSelector('__bridge'))

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

    const getGoshWallet = useCallback(async () => {
        if (!user.keys?.public) {
            return
        }

        const wallet = await AppConfig.tip3root!.getWallet({
            data: { pubkey: `0x${user.keys.public}` },
            keys: user.keys,
        })

        let balance = 0
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
            summary: setSummaryAddress(state.summary, {
                key: EBridgeNetwork.GOSH,
                address: wallet.address,
            }),
        }))
    }, [user.keys?.public])

    const web3Connect = async () => {
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
                        balance: parseFloat(web3.utils.fromWei(balance, 'ether')),
                    },
                },
                summary: setSummaryAddress(state.summary, {
                    key: EBridgeNetwork.ETH,
                    address,
                }),
            }))
        } catch (e: any) {
            setStatus((state) => ({ ...state, type: 'error', data: e }))
            throw e
        }
    }

    const reset = async () => {
        resetData()
        await getGoshWallet()
    }

    const setStep = (step: 'route') => {
        setData((state) => ({ ...state, step }))
    }

    const setSummaryFormValues = (values: {
        from_network?: string
        from_amount?: string
        to_network?: string
        to_address?: string
    }) => {
        if (values.from_network) {
            setData((state) => {
                const { to } = state.summary

                let to_network = to.network
                if (
                    values.from_network === EBridgeNetwork.ETH &&
                    to.network === EBridgeNetwork.ETH
                ) {
                    to_network = EBridgeNetwork.GOSH
                } else if (
                    values.from_network === EBridgeNetwork.GOSH &&
                    to.network === EBridgeNetwork.GOSH
                ) {
                    to_network = EBridgeNetwork.ETH
                }

                return {
                    ...state,
                    summary: {
                        ...state.summary,
                        from: {
                            network: values.from_network!,
                            address: getNetworkAddress(values.from_network!),
                            amount: state.summary.from.amount,
                        },
                        to:
                            to.network !== to_network
                                ? {
                                      network: to_network,
                                      address: getNetworkAddress(to_network),
                                      amount: state.summary.from.amount,
                                  }
                                : state.summary.to,
                    },
                }
            })
        } else if (values.from_amount && parseFloat(values.from_amount) > 0) {
            setData((state) => ({
                ...state,
                summary: {
                    ...state.summary,
                    from: { ...state.summary.from, amount: values.from_amount! },
                    to: { ...state.summary.to, amount: values.from_amount! },
                },
            }))
        } else if (values.to_network) {
            setData((state) => ({
                ...state,
                summary: {
                    ...state.summary,
                    to: {
                        network: values.to_network!,
                        address: getNetworkAddress(values.to_network!),
                        amount: state.summary.to.amount,
                    },
                },
            }))
        } else if (values.to_address) {
            setData((state) => ({
                ...state,
                summary: {
                    ...state.summary,
                    to: {
                        ...state.summary.to,
                        address: values.to_address!,
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

    const setSummaryAddress = (
        state: typeof data['summary'],
        network: { key: string; address: string },
    ) => {
        const { key, address } = network
        return {
            ...state,
            from: {
                ...state.from,
                address: state.from.network === key ? address : state.from.address,
            },
            to: {
                ...state.to,
                address: state.to.network === key ? address : state.to.address,
            },
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
        if (!user.keys?.public) {
            throw new GoshError('Value error', 'GOSH user pubkey undefined')
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

        const start = Math.round(Date.now() / 1000)

        // Send to Ethereum
        setSummaryProgress(0, 'pending')
        const elock = new data.web3.instance.eth.Contract(
            ELockAbi.abi,
            AppConfig.elockaddr,
        )
        // @ts-ignore
        const edata = elock.methods.deposit(`0x${user.keys.public}`).encodeABI()
        const receipt = await data.web3.instance.eth.sendTransaction({
            from: data.web3.address,
            to: AppConfig.elockaddr,
            value: data.web3.instance.utils.toWei(data.summary.from.amount, 'ether'),
            data: edata,
            gas: 1000000,
        })
        console.debug('ETH receipt', receipt)
        setSummaryProgress(0, 'completed')

        // Wait on GOSH
        setSummaryProgress(1, 'pending')
        const waitDeployed = await whileFinite(
            async () => {
                return data.gosh.instance!.isDeployed()
            },
            5000,
            1200000,
        )
        if (!waitDeployed) {
            throw new GoshError('Timeout error', 'Gosh wallet is not deployed')
        }

        const waitMinted = await whileFinite(
            async () => {
                const { messages } = await data.gosh.instance!.getMessages(
                    { msgType: ['IntIn'], node: ['created_at'] },
                    true,
                )
                console.debug('Start', start)
                console.debug('Messages', messages)

                const filtered = messages
                    .filter(({ decoded }) => !!decoded)
                    .filter(({ message }) => message.created_at >= start)
                console.debug('Filtered', filtered)

                const index = filtered.findIndex(
                    ({ decoded }) => decoded.name === 'acceptMint',
                )
                return index >= 0
            },
            5000,
            1200000,
        )
        if (!waitMinted) {
            throw new GoshError('Timeout error', 'Tokens did not arive during timeout')
        }
        setSummaryProgress(1, 'completed')
    }

    const gosh2eth = async () => {
        if (!data.summary.to.address) {
            throw new GoshError('Value error', 'Ethereum address undefined')
        }
        if (!data.gosh.instance) {
            throw new GoshError('Gosh error', 'Gosh wallet undefined')
        }

        const { web3 } = getWeb3()
        const balance = await web3.eth.getBalance(data.summary.to.address)
        const startBalance = parseInt(web3.utils.fromWei(balance, 'wei'))

        // Send to gosh
        setSummaryProgress(0, 'pending')
        await data.gosh.instance.withdraw({
            amount: Math.round(parseFloat(data.summary.to.amount) * 10 ** 18),
            l1addr: data.summary.to.address,
        })
        setSummaryProgress(0, 'completed')

        // Wait on ethereum
        setSummaryProgress(1, 'pending')
        const waitEth = await whileFinite(
            async () => {
                const balance = await web3.eth.getBalance(data.summary.to.address)
                const currBalance = parseInt(web3.utils.fromWei(balance, 'wei'))
                return currBalance > startBalance
            },
            5000,
            1200000,
        )
        if (!waitEth) {
            throw new GoshError('Timeout error', 'Wait for ethereum balance')
        }
        setSummaryProgress(1, 'completed')
    }

    const onWeb3Change = useCallback(async () => {
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
                web3: { ...state.web3, address },
                networks: {
                    ...state.networks,
                    [EBridgeNetwork.ETH]: {
                        ...state.networks[EBridgeNetwork.ETH],
                        balance: parseFloat(
                            data.web3.instance!.utils.fromWei(balance, 'ether'),
                        ),
                    },
                },
                summary: setSummaryAddress(state.summary, {
                    key: EBridgeNetwork.ETH,
                    address,
                }),
            }))
        } catch (e: any) {
            setStatus((state) => ({ ...state, type: 'error', data: e }))
            console.error(e.message)
        }
    }, [!!data.web3.instance])

    useEffect(() => {
        if (initialize) {
            getGoshWallet()
        }
    }, [initialize, getGoshWallet])

    useEffect(() => {
        if (!initialize) {
            return
        }

        data.web3.instance?.provider?.on('chainChanged', () => {
            onWeb3Change()
        })
        data.web3.instance?.provider?.on('accountsChanged', () => {
            onWeb3Change()
        })

        return () => {
            data.web3.instance?.provider?.removeListener('chainChanged', () => {})
            data.web3.instance?.provider?.removeListener('accountsChanged', () => {})
        }
    }, [initialize, onWeb3Change])

    return {
        ...data,
        status,
        reset,
        setStep,
        web3Connect,
        setSummaryFormValues,
        submitRouteStep,
        submitTransferStep,
    }
}
