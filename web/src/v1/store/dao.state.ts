import { atom } from 'recoil'
import { TDaoDetailsState, TUserDaoList } from '../types/dao.types'

export const userDaoListAtom = atom<TUserDaoList>({
    key: 'UserDaoListAtom',
    default: {
        isFetching: false,
        items: [],
    },
})

export const daoDetailsAtom = atom<TDaoDetailsState>({
    key: 'DaoDetailsAtom',
    default: {
        isFetching: false,
        details: {},
    },
})
