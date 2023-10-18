import { atom, selectorFamily } from 'recoil'
import { contextVersion } from '../constants'
import {
    TUserNotificationSettings,
    TDaoNotificationSettings,
} from '../types/notification.types'

export const userSettingsAtom = atom<TUserNotificationSettings>({
    key: `UserSettingsAtom_${contextVersion}`,
    default: {
        isFetching: false,
        data: {
            email: null,
            email_enabled: null,
        },
    },
})

export const daoSettingsAtom = atom<{ [daoname: string]: TDaoNotificationSettings }>({
    key: `DaoSettingsAtom_${contextVersion}`,
    default: {},
})

export const daoSettingsSelector = selectorFamily<
    TDaoNotificationSettings,
    string | undefined
>({
    key: `DaoSettingsSelector_${contextVersion}`,
    get:
        (daoname) =>
        ({ get }) => {
            const atom = get(daoSettingsAtom)
            const empty = { isFetching: false, data: { types: {} } }
            const data = (daoname ? atom[daoname] : empty) || empty

            return Object.keys(data).length ? data : empty
        },
    set:
        (daoname) =>
        ({ set }, newvalue) => {
            if (daoname) {
                set(daoSettingsAtom, (state) => ({
                    ...state,
                    [daoname]: newvalue as TDaoNotificationSettings,
                }))
            }
        },
})
