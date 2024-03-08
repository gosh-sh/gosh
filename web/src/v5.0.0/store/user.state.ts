import { selector } from 'recoil'
import { AppConfig } from '../../appconfig'
import { userAtom } from '../../store/user.state'
import { UserProfile } from '../blockchain/userprofile'
import { contextVersion } from '../constants'

const userProfileSelector = selector<UserProfile | null>({
  key: `UserProfileSelector_${contextVersion}`,
  get: ({ get }) => {
    const user = get(userAtom)
    if (!user.profile || !user.keys) {
      return null
    }
    return new UserProfile(AppConfig.goshclient, user.profile, user.keys)
  },
  dangerouslyAllowMutability: true,
})

export { userProfileSelector }
