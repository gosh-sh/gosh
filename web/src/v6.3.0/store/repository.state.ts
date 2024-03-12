import { atom, selectorFamily } from 'recoil'
import { contextVersion } from '../constants'
import { TGoshRepositoryList, TRepoTokenWallet } from '../types/repository.types'

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

export const repo_token_wallet_atom = atom<{ [repo_path: string]: TRepoTokenWallet }>({
  key: `repo_token_wallet_atom-${contextVersion}`,
  default: {},
  dangerouslyAllowMutability: true,
})

export const repoTokenWalletSelector = selectorFamily<
  TRepoTokenWallet | null,
  string | undefined
>({
  key: `repo_token_wallet_selector-${contextVersion}`,
  get:
    (repo_path) =>
    ({ get }) => {
      const atom = get(repo_token_wallet_atom)
      return repo_path ? atom[repo_path] : null
    },
  set:
    (repo_path) =>
    ({ set }, newvalue) => {
      if (repo_path) {
        set(repo_token_wallet_atom, (state) => ({
          ...state,
          [repo_path]: newvalue as TRepoTokenWallet,
        }))
      }
    },
  dangerouslyAllowMutability: true,
})
