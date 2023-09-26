import { atom } from 'recoil'
import { contextVersion } from '../constants'
import { EBridgeNetwork, TBridgeTransferData } from '../types/bridge.types'

export const bridgeTransferAtom = atom<TBridgeTransferData>({
    key: `BridgeTransferAtom${contextVersion}`,
    default: {
        web3: {
            instance: null,
            address: '',
        },
        gosh: {
            instance: null,
            address: '',
        },
        networks: {
            [EBridgeNetwork.ETH]: {
                label: 'Ethereum',
                token: 'ETH',
                balance: 0,
                iconpath: '/images/tokens/ethereum.webp',
            },
            [EBridgeNetwork.GOSH]: {
                label: 'GOSH',
                token: 'WETH',
                balance: 0,
                iconpath: '/images/tokens/gosh.webp',
            },
        },
        summary: {
            from: {
                network: EBridgeNetwork.ETH,
                address: '',
                amount: '0',
            },
            to: {
                network: EBridgeNetwork.GOSH,
                address: '',
                amount: '0',
            },
            progress: [],
        },
        step: 'route',
    },
    dangerouslyAllowMutability: true,
})
