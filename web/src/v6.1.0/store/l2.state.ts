import { atom } from 'recoil'
import L2Tokens from '../../l2.tokens.dev.json'
import { contextVersion } from '../constants'
import { EL2Network, TL2Token, TL2TransferData } from '../types/l2.types'

export const l2Tokens = L2Tokens as TL2Token[]

export const l2TransferAtom = atom<TL2TransferData>({
    key: `L2TransferAtom${contextVersion}`,
    default: {
        web3: {
            instance: null,
            chain_id: '',
            chain_supported: true,
            address: '',
            token: null,
            balance: 0n,
        },
        gosh: {
            instance: null,
            address: '',
            token: null,
            balance: 0n,
        },
        withdrawals: [],
        comissions: {
            [`${EL2Network.ETH}:${EL2Network.GOSH}`]: 0n,
            [`${EL2Network.GOSH}:${EL2Network.ETH}`]: 0n,
            [`${EL2Network.GOSH}:${EL2Network.GOSH}`]: 0n,
        },
        summary: {
            from: {
                token: {
                    network: EL2Network.ETH,
                    name: 'Ethereum',
                    symbol: 'ETH',
                    decimals: 18,
                    iconpath: '/images/tokens/ethereum.webp',
                    rootaddr: null,
                    pair: ['WETH'],
                },
                user: null,
                wallet: '',
                amount: '0',
            },
            to: {
                token: {
                    network: EL2Network.GOSH,
                    name: 'Ethereum',
                    symbol: 'WETH',
                    decimals: 18,
                    iconpath: '/images/tokens/gosh.webp',
                    rootaddr:
                        '0:8cec263b47253fff2fdd289721d7f71565bfcc6aecf3e7a17d1d5785861169c3',
                    pair: ['ETH', 'WETH'],
                },
                user: null,
                wallet: '',
                amount: '0',
            },
            progress: { route: '', steps: [] },
        },
        step: 'route',
    },
    dangerouslyAllowMutability: true,
})
