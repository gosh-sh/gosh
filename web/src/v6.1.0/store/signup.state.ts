import { atom } from 'recoil'
import { contextVersion } from '../constants'

export const userSignupAtom = atom<{
    username: string
    email: string
    phrase: string[]
    step: 'username' | 'phrase' | 'phrasecheck' | 'complete'
}>({
    key: `UserSignupAtom_${contextVersion}`,
    default: {
        username: '',
        email: '',
        phrase: [],
        step: 'username',
    },
})
