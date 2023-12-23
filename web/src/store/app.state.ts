import React from 'react'
import { atom, selectorFamily } from 'recoil'
import { TToastStatus } from '../types/common.types'

export const appContextAtom = atom<{ version: string | null; daoname?: string }>({
  key: 'AppContextAtom',
  default: { version: null },
})

export const appModalStateAtom = atom<{
  static?: boolean
  isOpen: boolean
  element: React.ReactElement | null
}>({
  key: 'AppModalStateAtom',
  default: {
    static: false,
    isOpen: false,
    element: null,
  },
})

export const appToastStatusAtom = atom<{
  [id: string | number]: { data: TToastStatus; time: number }
}>({
  key: 'AppToastStatusAtom',
  default: {},
})

export const appToastStatusSelector = selectorFamily<TToastStatus, string | number>({
  key: 'AppToastStatusSelector',
  get:
    (id) =>
    ({ get }) => {
      const items = get(appToastStatusAtom)
      return items[id]?.data || { type: null, data: null }
    },
  set:
    (id: string | number) =>
    ({ set }, value) => {
      set(appToastStatusAtom, (state) => ({
        ...state,
        [id]: { data: { ...state[id]?.data, ...value }, time: Date.now() },
      }))
    },
})
