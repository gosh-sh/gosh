import { atom } from 'recoil'
import L2Tokens from '../../l2.tokens.json'
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
        token: l2Tokens.find((item) => {
          return item.network === EL2Network.ETH && item.pair_name === 'eth'
        })!,
        user: null,
        wallet: '',
        amount: '0',
      },
      to: {
        token: l2Tokens.find((item) => {
          return item.network === EL2Network.GOSH && item.pair_name === 'weth'
        })!,
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
