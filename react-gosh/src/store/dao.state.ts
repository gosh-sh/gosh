import { atom } from 'recoil'
import { TDaoDetails, TWalletDetails } from '../types'

const daoAtom = atom<TDaoDetails | undefined>({
    key: 'GoshDaoAtom',
    default: undefined,
})

export const walletAtom = atom<TWalletDetails | undefined>({
    key: 'GoshWalletAtom',
    default: undefined,
})

export { daoAtom }
