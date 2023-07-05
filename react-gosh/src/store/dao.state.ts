import { atom } from 'recoil'
import { TDao, TWalletDetails } from '../types'

const daoAtom = atom<TDao | undefined>({
    key: 'GoshDaoAtom1',
    default: undefined,
})

export const walletAtom = atom<TWalletDetails | undefined>({
    key: 'GoshWalletAtom1',
    default: undefined,
})

export { daoAtom }
