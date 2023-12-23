import { atom, selector } from 'recoil'
import { AppConfig } from '../appconfig'
import { TUser, TUserPersist } from '../types/user.types'
import { UserProfile } from '../blockchain/userprofile'
import { persistAtom } from './base'

const userPersistAtom = atom<TUserPersist>({
  key: 'UserPersistAtom',
  default: {},
  effects_UNSTABLE: [persistAtom],
})

const userAtom = atom<TUser>({
  key: 'UserAtom',
  default: {},
  dangerouslyAllowMutability: true,
})

const userProfileSelector = selector<UserProfile | null>({
  key: 'UserProfileSelector',
  get: ({ get }) => {
    const user = get(userAtom)
    if (!user.profile || !user.keys) {
      return null
    }
    return new UserProfile(AppConfig.goshclient, user.profile, user.keys)
  },
  dangerouslyAllowMutability: true,
})

export { userAtom, userPersistAtom, userProfileSelector }
