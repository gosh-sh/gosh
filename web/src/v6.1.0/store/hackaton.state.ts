import { atom, selectorFamily } from 'recoil'
import _ from 'lodash'
import { contextVersion } from '../constants'
import { TDaoHackatonList, THackatonDetails } from '../types/hackaton.types'

export const daoHackatonListAtom = atom<{ [daoname: string]: TDaoHackatonList }>({
    key: `DaoHackatonListAtom_${contextVersion}`,
    default: {},
    dangerouslyAllowMutability: true,
})

export const daoHackatonListSelector = selectorFamily<
    TDaoHackatonList,
    string | undefined
>({
    key: `DaoHackatonListSelector_${contextVersion}`,
    get:
        (daoname) =>
        ({ get }) => {
            const atom = get(daoHackatonListAtom)
            const empty = { is_fetching: false, items: [] }
            const data = (daoname ? atom[daoname] : empty) || empty

            return {
                ...data,
                items: [...data.items].sort((a, b) => {
                    if (a.address === b.address) {
                        return 0
                    }
                    return a.address > b.address ? -1 : 1
                }),
            }
        },
    set:
        (daoname) =>
        ({ set }, newvalue) => {
            if (daoname) {
                set(daoHackatonListAtom, (state) => ({
                    ...state,
                    [daoname]: newvalue as TDaoHackatonList,
                }))
            }
        },
    dangerouslyAllowMutability: true,
})

export const daoHackatonSelector = selectorFamily<THackatonDetails | undefined, string>({
    key: `DaoHackatonSelector_${contextVersion}`,
    get:
        (repo_name) =>
        ({ get }) => {
            const atom = get(daoHackatonListAtom)
            const list = _.flatten(Object.values(atom).map(({ items }) => items))
            return list.find((item) => item.name === repo_name)
        },
    dangerouslyAllowMutability: true,
})
