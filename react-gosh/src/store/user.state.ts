import { atom, selector } from 'recoil'
import { AppConfig } from '../appconfig'
import { GoshProfile } from '../gosh/goshprofile'
import { IGoshProfile } from '../gosh/interfaces'
import { TUser, TUserPersist } from '../types'
import { persistAtom } from './base'

const userPersistAtom = atom<TUserPersist>({
    key: 'UserPersistAtom1',
    default: {},
    effects_UNSTABLE: [persistAtom],
})

const userAtom = atom<TUser>({
    key: 'UserAtom1',
    default: {},
})

const userProfileSelector = selector<IGoshProfile | undefined>({
    key: 'UserProfileSelector1',
    get: ({ get }) => {
        const user = get(userAtom)
        if (!user.profile || !user.keys) return
        return new GoshProfile(AppConfig.goshclient, user.profile, user.keys)
    },
    dangerouslyAllowMutability: true,
})

export { userAtom, userPersistAtom, userProfileSelector }
