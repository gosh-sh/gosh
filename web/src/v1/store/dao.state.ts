import { atom, selectorFamily } from 'recoil'
import {
    TDaoDetails,
    TDaoEventList,
    TDaoEventDetails,
    TDaoMember,
    TDaoMemberList,
    TUserDaoList,
} from '../types/dao.types'

export const userDaoListAtom = atom<TUserDaoList>({
    key: 'UserDaoListAtom',
    default: {
        isFetching: false,
        items: [],
    },
})

export const daoDetailsAtom = atom<TDaoDetails>({
    key: 'DaoDetailsAtom',
    default: {
        isFetching: false,
        details: {},
    },
    dangerouslyAllowMutability: true,
})

export const daoMemberAtom = atom<TDaoMember>({
    key: 'DaoMemberAtom',
    default: {
        details: {
            profile: null,
            wallet: null,
            allowance: null,
            balance: null,
            isFetched: false,
            isMember: false,
            isReady: false,
        },
    },
    dangerouslyAllowMutability: true,
})

export const daoMemberListAtom = atom<TDaoMemberList>({
    key: 'DaoMemberListAtom',
    default: {
        isFetching: false,
        items: [],
    },
    dangerouslyAllowMutability: true,
})

export const daoMemberListSelector = selectorFamily<TDaoMemberList, string>({
    key: 'DaoMemberListSelector',
    get:
        (search) =>
        ({ get }) => {
            const data = get(daoMemberListAtom)

            return {
                ...data,
                items: [...data.items]
                    .filter(({ username }) => {
                        return search
                            ? username.startsWith(search.toLowerCase())
                            : !!username
                    })
                    .sort((a, b) => (a.username > b.username ? 1 : -1)),
            }
        },
    dangerouslyAllowMutability: true,
})

export const daoEventListAtom = atom<TDaoEventList>({
    key: 'DaoEventListAtom',
    default: {
        isFetching: false,
        items: [],
    },
    dangerouslyAllowMutability: true,
})

export const daoEventSelector = selectorFamily<TDaoEventDetails | undefined, string>({
    key: 'DaoEventSelector',
    get:
        (address) =>
        ({ get }) => {
            const list = get(daoEventListAtom)
            return list.items.find((item) => item.address === address)
        },
    dangerouslyAllowMutability: true,
})
