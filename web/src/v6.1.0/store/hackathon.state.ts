import _ from 'lodash'
import { atom, selectorFamily } from 'recoil'
import { contextVersion } from '../constants'
import { TDaoHackathonList, THackathonDetails } from '../types/hackathon.types'

export const metadata_empty = {
    is_fetching: false,
    is_fetched: false,
    title: '',
    description: { readme: '', rules: '', prize: '' },
    prize: { total: 0, places: [] },
    dates: { start: 0, voting: 0, finish: 0 },
    raw: '',
}

export const participants_empty = {
    is_fetching: false,
    items: [],
}

export const daoHackathonListAtom = atom<{ [daoname: string]: TDaoHackathonList }>({
    key: `DaoHackathonListAtom_${contextVersion}`,
    default: {},
    dangerouslyAllowMutability: true,
})

export const daoHackathonListSelector = selectorFamily<
    TDaoHackathonList,
    string | undefined
>({
    key: `DaoHackathonListSelector_${contextVersion}`,
    get:
        (daoname) =>
        ({ get }) => {
            const atom = get(daoHackathonListAtom)
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
                set(daoHackathonListAtom, (state) => ({
                    ...state,
                    [daoname]: newvalue as TDaoHackathonList,
                }))
            }
        },
    dangerouslyAllowMutability: true,
})

export const daoHackathonSelector = selectorFamily<THackathonDetails | undefined, string>(
    {
        key: `DaoHackathonSelector_${contextVersion}`,
        get:
            (repo_name) =>
            ({ get }) => {
                const atom = get(daoHackathonListAtom)
                const list = _.flatten(Object.values(atom).map(({ items }) => items))
                return list.find((item) => item.name === repo_name)
            },
        dangerouslyAllowMutability: true,
    },
)
