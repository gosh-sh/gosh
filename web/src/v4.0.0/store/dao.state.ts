import { atom, selectorFamily } from 'recoil'
import { contextVersion } from '../constants'
import {
    TDaoDetails,
    TDaoEventList,
    TDaoEventDetails,
    TDaoMember,
    TDaoMemberList,
    TUserDaoList,
    TDaoInviteList,
    TDaoTaskList,
    TTaskDetails,
} from '../types/dao.types'

export const userDaoListAtom = atom<TUserDaoList>({
    key: `UserDaoListAtom_${contextVersion}`,
    default: {
        isFetching: false,
        items: [],
    },
})

export const daoDetailsAtom = atom<TDaoDetails>({
    key: `DaoDetailsAtom_${contextVersion}`,
    default: {
        isFetching: false,
        isFetchingData: false,
        details: {},
    },
    dangerouslyAllowMutability: true,
})

export const daoMemberAtom = atom<TDaoMember>({
    key: `DaoMemberAtom_${contextVersion}`,
    default: {
        profile: null,
        wallet: null,
        allowance: null,
        balance: null,
        vesting: null,
        isFetched: false,
        isMember: false,
        isLimited: false,
        isReady: false,
    },
    dangerouslyAllowMutability: true,
})

export const daoMemberListAtom = atom<TDaoMemberList>({
    key: `DaoMemberListAtom_${contextVersion}`,
    default: {
        isFetching: false,
        items: [],
    },
    dangerouslyAllowMutability: true,
})

export const daoMemberListSelector = selectorFamily<TDaoMemberList, string>({
    key: `DaoMemberListSelector_${contextVersion}`,
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
    key: `DaoEventListAtom_${contextVersion}`,
    default: {
        isFetching: false,
        items: [],
    },
    dangerouslyAllowMutability: true,
})

export const daoEventSelector = selectorFamily<TDaoEventDetails | undefined, string>({
    key: `DaoEventSelector_${contextVersion}`,
    get:
        (address) =>
        ({ get }) => {
            const list = get(daoEventListAtom)
            return list.items.find((item) => item.address === address)
        },
    dangerouslyAllowMutability: true,
})

export const daoInviteListAtom = atom<TDaoInviteList>({
    key: `DaoInviteListAtom${contextVersion}`,
    default: {
        isFetching: false,
        items: [],
    },
})

export const daoTaskListAtom = atom<TDaoTaskList>({
    key: `DaoTaskListAtom_${contextVersion}`,
    default: {
        isFetching: false,
        items: [],
    },
    dangerouslyAllowMutability: true,
})

export const daoTaskSelector = selectorFamily<TTaskDetails | undefined, string>({
    key: `DaoTaskSelector_${contextVersion}`,
    get:
        (address) =>
        ({ get }) => {
            const list = get(daoTaskListAtom)
            return list.items.find((item) => item.address === address)
        },
    dangerouslyAllowMutability: true,
})
