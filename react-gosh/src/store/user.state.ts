import { atom, selector } from 'recoil'
import { AppConfig } from '../appconfig'
import { GoshProfile, IGoshProfile } from '../resources'
import { TUser, TUserPersist } from '../types'
import { persistAtom } from './base'

const userPersistAtom = atom<TUserPersist>({
    key: 'UserPersistAtom',
    default: {},
    effects_UNSTABLE: [persistAtom],
})

const userAtom = atom<TUser>({
    key: 'UserAtom',
    default: {},
})

const userProfileSelector = selector<IGoshProfile | undefined>({
    key: 'UserProfileSelector',
    get: ({ get }) => {
        const user = get(userAtom)
        if (!user.profile || !user.keys) return
        return new GoshProfile(AppConfig.goshclient, user.profile, user.keys)
    },
    dangerouslyAllowMutability: true,
})

export { userAtom, userPersistAtom, userProfileSelector }
