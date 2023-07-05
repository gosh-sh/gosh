import { atom, selector } from 'recoil'
import { TRepositoryList } from '../types/repository.types'

export const daoRepositoryListAtom = atom<TRepositoryList>({
    key: 'DaoRepositoryListAtom',
    default: {
        isFetching: false,
        items: [],
    },
})

export const daoRepositoryListSelector = selector<TRepositoryList & { isEmpty: boolean }>(
    {
        key: 'DaoRepositoryListSelector',
        get: ({ get }) => {
            const data = get(daoRepositoryListAtom)
            return {
                ...data,
                items: [...data.items].sort((a, b) => (a.name > b.name ? 1 : -1)),
                isEmpty: !data.isFetching && !data.items.length,
            }
        },
    },
)
