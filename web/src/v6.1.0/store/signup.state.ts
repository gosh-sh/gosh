import { atom } from 'recoil'
import { contextVersion } from '../constants'
import { TDBDaoInvite } from '../types/dao.types'

export const userSignupAtom = atom<{
    username: string
    email: string
    phrase: string[]
    daoinvites: TDBDaoInvite[]
    step: 'username' | 'daoinvite' | 'phrase' | 'phrasecheck' | 'complete'
}>({
    key: `UserSignupAtom_${contextVersion}`,
    default: {
        username: '',
        email: '',
        phrase: [],
        daoinvites: [],
        step: 'username',
    },
})
