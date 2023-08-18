import { atom, selector } from 'recoil'
import { contextVersion } from '../constants'
import { TGoshRepositoryList } from '../types/repository.types'

export const daoRepositoryListAtom = atom<TGoshRepositoryList>({
    key: `DaoRepositoryListAtom_${contextVersion}`,
    default: {
        isFetching: false,
        items: [],
    },
})

export const daoRepositoryListSelector = selector<
    TGoshRepositoryList & { isEmpty: boolean }
>({
    key: `DaoRepositoryListSelector_${contextVersion}`,
    get: ({ get }) => {
        const data = get(daoRepositoryListAtom)
        return {
            ...data,
            items: [...data.items].sort((a, b) => (a.name > b.name ? 1 : -1)),
            isEmpty: !data.isFetching && !data.items.length,
        }
    },
})
