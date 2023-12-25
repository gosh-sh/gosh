import { atom, selectorFamily } from 'recoil'
import { contextVersion } from '../constants'
import { TGoshRepositoryList } from '../types/repository.types'

export const daoRepositoryListAtom = atom<{ [daoname: string]: TGoshRepositoryList }>({
  key: `DaoRepositoryListAtom_${contextVersion}`,
  default: {},
})

export const daoRepositoryListSelector = selectorFamily<
  TGoshRepositoryList,
  string | undefined
>({
  key: `DaoRepositoryListSelector_${contextVersion}`,
  get:
    (daoname) =>
    ({ get }) => {
      const atom = get(daoRepositoryListAtom)
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
        set(daoRepositoryListAtom, (state) => ({
          ...state,
          [daoname]: newvalue as TGoshRepositoryList,
        }))
      }
    },
})
