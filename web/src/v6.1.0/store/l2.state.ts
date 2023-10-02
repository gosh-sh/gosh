import { atom } from 'recoil'
import { contextVersion } from '../constants'
import { EL2Network, TL2TransferData } from '../types/l2.types'

export const l2TransferAtom = atom<TL2TransferData>({
    key: `L2TransferAtom${contextVersion}`,
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
            [EL2Network.ETH]: {
                label: 'Ethereum',
                token: 'ETH',
                balance: 0n,
                decimals: 18,
                iconpath: '/images/tokens/ethereum.webp',
            },
            [EL2Network.GOSH]: {
                label: 'GOSH',
                token: 'WETH',
                balance: 0n,
                decimals: 18,
                iconpath: '/images/tokens/gosh.webp',
            },
        },
        summary: {
            from: {
                network: EL2Network.ETH,
                user: null,
                wallet: '',
                amount: '0',
            },
            to: {
                network: EL2Network.GOSH,
                user: null,
                wallet: '',
                amount: '0',
            },
            progress: [],
        },
        step: 'route',
    },
    dangerouslyAllowMutability: true,
})
