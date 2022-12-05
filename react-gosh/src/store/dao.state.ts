import { atom } from 'recoil'
import { TDao, TWalletDetails } from '../types'

const daoAtom = atom<TDao | undefined>({
    key: 'GoshDaoAtom',
    default: undefined,
})

export const walletAtom = atom<TWalletDetails | undefined>({
    key: 'GoshWalletAtom',
    default: undefined,
})

export { daoAtom }
