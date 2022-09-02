import { atom } from 'recoil'
import { TDaoDetails } from '../types'

const daoAtom = atom<TDaoDetails | undefined>({
    key: 'GoshDaoAtom',
    default: undefined,
})

export { daoAtom }
