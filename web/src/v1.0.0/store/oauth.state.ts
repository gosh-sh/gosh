import { atom } from 'recoil'
import { contextVersion } from '../constants'
import { TOAuthSession } from '../types/oauth.types'

export const OAuthSessionAtom = atom<TOAuthSession>({
    key: `OAuthSessionAtom_${contextVersion}`,
    default: { session: null, isLoading: false },
})
