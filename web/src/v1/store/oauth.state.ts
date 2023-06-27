import { atom } from 'recoil'
import { TOAuthSession } from '../types/oauth.types'

export const OAuthSessionAtom = atom<TOAuthSession>({
    key: 'OAuthSessionAtom',
    default: { session: null, isLoading: false },
})
