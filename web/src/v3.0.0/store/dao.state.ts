import { atom, selectorFamily } from 'recoil'
import _ from 'lodash'
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

export const daoDetailsAtom = atom<{ [daoname: string]: TDaoDetails }>({
  key: `DaoDetailsAtom_${contextVersion}`,
  default: {},
  dangerouslyAllowMutability: true,
})

export const daoDetailsSelector = selectorFamily<TDaoDetails, string | undefined>({
  key: `DaoDetailsSelector_${contextVersion}`,
  get:
    (daoname) =>
    ({ get }) => {
      const atom = get(daoDetailsAtom)
      const empty = { isFetching: false, isFetchingData: false, details: {} }
      const data = (daoname ? atom[daoname] : empty) || empty

      return Object.keys(data).length ? data : empty
    },
  set:
    (daoname) =>
    ({ set }, newvalue) => {
      if (daoname) {
        set(daoDetailsAtom, (state) => ({
          ...state,
          [daoname]: newvalue as TDaoDetails,
        }))
      }
    },
  dangerouslyAllowMutability: true,
})

export const daoMemberAtom = atom<{ [daoname: string]: TDaoMember }>({
  key: `DaoMemberAtom_${contextVersion}`,
  default: {},
  dangerouslyAllowMutability: true,
})

export const daoMemberSelector = selectorFamily<TDaoMember, string | undefined>({
  key: `DaoMemberSelector_${contextVersion}`,
  get:
    (daoname) =>
    ({ get }) => {
      const atom = get(daoMemberAtom)
      const empty = {
        profile: null,
        wallet: null,
        allowance: null,
        balance: null,
        vesting: null,
        isFetched: false,
        isMember: false,
        isLimited: false,
        isReady: false,
      }

      return (daoname ? atom[daoname] : empty) || empty
    },
  set:
    (daoname) =>
    ({ set }, newvalue) => {
      if (daoname) {
        set(daoMemberAtom, (state) => ({
          ...state,
          [daoname]: newvalue as TDaoMember,
        }))
      }
    },
  dangerouslyAllowMutability: true,
})

export const daoMemberListAtom = atom<{ [daoname: string]: TDaoMemberList }>({
  key: `DaoMemberListAtom_${contextVersion}`,
  default: {},
  dangerouslyAllowMutability: true,
})

export const daoMemberListSelector = selectorFamily<
  TDaoMemberList,
  { daoname?: string; search?: string }
>({
  key: `DaoMemberListSelector_${contextVersion}`,
  get:
    ({ daoname, search }) =>
    ({ get }) => {
      const atom = get(daoMemberListAtom)
      const empty = { isFetching: false, items: [] }
      const data = (daoname ? atom[daoname] : empty) || empty

      return {
        ...data,
        items: [...data.items]
          .filter(({ username }) => {
            return search ? username.startsWith(search.toLowerCase()) : !!username
          })
          .sort((a, b) => (a.username > b.username ? 1 : -1)),
      }
    },
  set:
    ({ daoname }) =>
    ({ set }, newvalue) => {
      if (daoname) {
        set(daoMemberListAtom, (state) => ({
          ...state,
          [daoname]: newvalue as TDaoMemberList,
        }))
      }
    },
  dangerouslyAllowMutability: true,
})

export const daoEventListAtom = atom<{ [daoname: string]: TDaoEventList }>({
  key: `DaoEventListAtom_${contextVersion}`,
  default: {},
  dangerouslyAllowMutability: true,
})

export const daoEventListSelector = selectorFamily<TDaoEventList, string | undefined>({
  key: `DaoEventListSelector_${contextVersion}`,
  get:
    (daoname) =>
    ({ get }) => {
      const atom = get(daoEventListAtom)
      const empty = { isFetching: false, items: [] }
      const data = (daoname ? atom[daoname] : empty) || empty

      return {
        ...data,
        items: [...data.items].sort((a, b) => {
          if (a.updatedAt === b.updatedAt) {
            return 0
          }
          return a.updatedAt > b.updatedAt ? -1 : 1
        }),
      }
    },
  set:
    (daoname) =>
    ({ set }, newvalue) => {
      if (daoname) {
        set(daoEventListAtom, (state) => ({
          ...state,
          [daoname]: newvalue as TDaoEventList,
        }))
      }
    },
  dangerouslyAllowMutability: true,
})

export const daoEventSelector = selectorFamily<TDaoEventDetails | undefined, string>({
  key: `DaoEventSelector_${contextVersion}`,
  get:
    (address) =>
    ({ get }) => {
      const atom = get(daoEventListAtom)
      const list = _.flatten(Object.values(atom).map(({ items }) => items))
      return list.find((item) => item.address === address)
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

export const daoTaskListAtom = atom<{ [daoname: string]: TDaoTaskList }>({
  key: `DaoTaskListAtom_${contextVersion}`,
  default: {},
  dangerouslyAllowMutability: true,
})

export const daoTaskListSelector = selectorFamily<TDaoTaskList, string | undefined>({
  key: `DaoTaskListSelector_${contextVersion}`,
  get:
    (daoname) =>
    ({ get }) => {
      const atom = get(daoTaskListAtom)
      const empty = { isFetching: false, items: [] }
      const data = (daoname ? atom[daoname] : empty) || empty

      return {
        ...data,
        items: [...data.items].sort((a, b) => (a.name > b.name ? 1 : -1)),
      }
    },
  set:
    (daoname) =>
    ({ set }, newvalue) => {
      if (daoname) {
        set(daoTaskListAtom, (state) => ({
          ...state,
          [daoname]: newvalue as TDaoTaskList,
        }))
      }
    },
  dangerouslyAllowMutability: true,
})

export const daoTaskSelector = selectorFamily<TTaskDetails | undefined, string>({
  key: `DaoTaskSelector_${contextVersion}`,
  get:
    (address) =>
    ({ get }) => {
      const atom = get(daoTaskListAtom)
      const list = _.flatten(Object.values(atom).map(({ items }) => items))
      return list.find((item) => item.address === address)
    },
  dangerouslyAllowMutability: true,
})
