import { KeyPair } from '@eversdk/core'
import {
    snapshot_UNSTABLE,
    useGotoRecoilSnapshot,
    useRecoilCallback,
    useRecoilState,
    useRecoilValue,
    useResetRecoilState,
    useSetRecoilState,
} from 'recoil'
import { AppConfig } from '../../appconfig'
import { userAtom, userPersistAtom, userProfileSelector } from '../../store/user.state'
import { TUserPersist } from '../../types/user.types'
import { validatePhrase } from '../../validators'
import { EGoshError, GoshError } from '../../errors'
import { validateUsername } from '../validators'
import { getSystemContract } from '../blockchain/helpers'
import { userPersistAtom as _userPersistAtom, userAtom as _userAtom } from 'react-gosh'
import { appContextAtom, appToastStatusSelector } from '../../store/app.state'
import { userSignupAtom } from '../store/signup.state'
import { useOauth } from './oauth.hooks'
import { useCreateDao } from './dao.hooks'
import { supabase } from '../../supabase'

export function useUser() {
    const [userPersist, setUserPersist] = useRecoilState(userPersistAtom)
    const [user, setUser] = useRecoilState(userAtom)
    const resetUserPersist = useResetRecoilState(userPersistAtom)
    const gotoSnapshot = useGotoRecoilSnapshot()

    // TODO: for react-gosh; REMOVE after refactor
    const _setUserPersist = useSetRecoilState(_userPersistAtom)
    const _setUser = useSetRecoilState(_userAtom)
    const _resetUserPersist = useResetRecoilState(_userPersistAtom)
    // /TODO: for react-gosh; REMOVE after refactor

    const resetState = useRecoilCallback(() => () => {
        const snapshot = snapshot_UNSTABLE(({ set }) => {
            set(appContextAtom, { version: AppConfig.getLatestVersion() })
        })
        gotoSnapshot(snapshot)
    })

    const getProfiles = async (phrase: string) => {
        const { valid, reason } = await validatePhrase(phrase)
        if (!valid) {
            throw new GoshError(EGoshError.PHRASE_INVALID, { reason })
        }

        const derived = await AppConfig.goshclient.crypto.mnemonic_derive_sign_keys({
            phrase,
        })
        const indexes = await AppConfig.goshroot.getUserProfileIndexes(
            `0x${derived.public}`,
        )
        if (!indexes.length) {
            throw new GoshError(EGoshError.PROFILE_NOT_EXIST)
        }
        return indexes
    }

    const unlock = (
        persist: TUserPersist,
        decrypted: { phrase: string; keys: KeyPair },
    ) => {
        setUserPersist(persist)
        setUser({ ...persist, ...decrypted })

        // TODO: for react-gosh; REMOVE after refactor
        _setUserPersist(persist)
        _setUser({ ...persist, ...decrypted })
        // /TODO: for react-gosh; REMOVE after refactor
    }

    const signin = async (params: { username: string; phrase: string }) => {
        await _validateCredentials(params)

        const { username, phrase } = params
        const profile = await AppConfig.goshroot.getUserProfile({ username })
        if (!(await profile.isDeployed())) {
            throw new GoshError(EGoshError.PROFILE_NOT_EXIST)
        }
        const derived = await AppConfig.goshclient.crypto.mnemonic_derive_sign_keys({
            phrase,
        })
        if (!(await profile.isOwnerPubkey(`0x${derived.public}`))) {
            throw new GoshError(EGoshError.PROFILE_PUBKEY_INVALID)
        }
        resetUserPersist()
        setUserPersist((state) => ({ ...state, username, profile: profile.address }))

        // TODO: for react-gosh; REMOVE after refactor
        _resetUserPersist()
        _setUserPersist((state) => ({ ...state, username, profile: profile.address }))
        // /TODO: for react-gosh; REMOVE after refactor
    }

    const signup = async (params: { username: string; phrase: string }) => {
        await _validateCredentials(params)

        const { phrase } = params
        const username = params.username.trim().toLowerCase()
        const profile = await AppConfig.goshroot.getUserProfile({ username })
        if (await profile.isDeployed()) {
            throw new GoshError(
                EGoshError.PROFILE_EXISTS,
                `GOSH username '${username}' is already taken`,
            )
        }

        const derived = await AppConfig.goshclient.crypto.mnemonic_derive_sign_keys({
            phrase,
        })
        await getSystemContract().createUserProfile(username, `0x${derived.public}`)
        resetUserPersist()
        setUserPersist((state) => ({ ...state, username, profile: profile.address }))

        // TODO: for react-gosh; REMOVE after refactor
        _resetUserPersist()
        _setUserPersist((state) => ({ ...state, username, profile: profile.address }))
        // /TODO: for react-gosh; REMOVE after refactor

        return {
            username,
            profile: profile.address,
            keys: derived,
        }
    }

    const signout = () => {
        resetState()
    }

    const _validateCredentials = async (params: any) => {
        if (params.username) {
            const { valid, reason } = await validateUsername(params.username)
            if (!valid) {
                throw new GoshError(EGoshError.USER_NAME_INVALID, reason)
            }
        }

        if (params.phrase) {
            const { valid, reason } = await validatePhrase(params.phrase)
            if (!valid) {
                throw new GoshError(EGoshError.PHRASE_INVALID, reason)
            }
        }
    }

    return {
        persist: userPersist,
        user,
        unlock,
        getProfiles,
        signin,
        signup,
        signout,
    }
}

export function useProfile() {
    const profile = useRecoilValue(userProfileSelector)
    return profile
}

export function useUserSignup() {
    const { signup: _signup } = useUser()
    const { signin } = useOauth()
    const { createDao } = useCreateDao()
    const [data, setData] = useRecoilState(userSignupAtom)
    const [status, setStatus] = useRecoilState(appToastStatusSelector('__signupuser'))

    const updateStep = (step: 'username' | 'phrase' | 'complete') => {
        setData((state) => ({ ...state, step }))
    }

    const updatePhrase = (phrase: string[]) => {
        setData((state) => ({ ...state, phrase }))
    }

    const updateUsernameStep = async (params: { email: string; username: string }) => {
        try {
            const username = params.username.trim().toLowerCase()
            const profile = await AppConfig.goshroot.getUserProfile({ username })
            if (await profile.isDeployed()) {
                throw new GoshError(
                    EGoshError.PROFILE_EXISTS,
                    `GOSH username '${username}' is already taken`,
                )
            }

            const { phrase } = await AppConfig.goshclient.crypto.mnemonic_from_random({})
            setData((state) => ({
                ...state,
                email: params.email.toLowerCase(),
                username,
                phrase: state.phrase.length ? state.phrase : phrase.split(' '),
                step: 'phrase',
            }))
        } catch (e: any) {
            setStatus((state) => ({ ...state, type: 'error', data: e }))
            throw e
        }
    }

    const updatePhraseCreateStep = async (phrase: string[]) => {
        try {
            const { valid, reason } = await validatePhrase(phrase.join(' '))
            if (!valid) {
                throw new GoshError('Value error', {
                    code: EGoshError.PHRASE_INVALID,
                    message: reason,
                })
            }
            setData((state) => ({ ...state, phrase, step: 'phrasecheck' }))
        } catch (e: any) {
            setStatus((state) => ({ ...state, type: 'error', data: e }))
            throw e
        }
    }

    const updatePhraseCheckStep = async (params: {
        words: string[]
        numbers: number[]
    }) => {
        const { words, numbers } = params
        try {
            // Check random words against phrase
            const validated = words.map((w, index) => {
                return w === data.phrase[numbers[index]]
            })
            if (!validated.every((v) => !!v)) {
                throw new GoshError('Value error', 'Words check failed')
            }

            // Create GOSH account
            setStatus((state) => ({
                ...state,
                type: 'pending',
                data: 'Create GOSH account',
            }))
            const { keys } = await _signup({
                phrase: data.phrase.join(' '),
                username: data.username,
            })

            // Create DB record for user
            setStatus((state) => ({
                ...state,
                type: 'pending',
                data: 'Update database',
            }))
            const dbUser = await _getDbUser(data.username)
            if (!dbUser) {
                await _createDbUser({
                    username: data.username,
                    pubkey: keys.public,
                    email: data.email,
                })
            }

            setStatus((state) => ({ ...state, type: 'dismiss', data: null }))
        } catch (e: any) {
            setStatus((state) => ({ ...state, type: 'error', data: e }))
            throw e
        }
    }

    const updateCompleteStep = async (params: { provider: 'github' | null }) => {
        const { provider } = params

        try {
            if (provider) {
                await signin(provider, {
                    redirectTo: `${document.location.origin}/onboarding`,
                })
            } else {
                await createDao({
                    name: data.username,
                    tags: [],
                    supply: 20,
                    isMintOn: true,
                })
            }
        } catch (e: any) {
            setStatus((state) => ({ ...state, type: 'error', data: e }))
            throw e
        }
    }

    const _getDbUser = async (username: string) => {
        const { data, error } = await supabase.client
            .from('users')
            .select()
            .eq('gosh_username', username)
            .single()
        if (error?.code === 'PGRST116') {
            return null
        }
        if (error) {
            throw new GoshError(error.message)
        }
        return data
    }

    const _createDbUser = async (params: {
        username: string
        pubkey: string
        email: string
    }) => {
        const { username, pubkey, email } = params
        const { data, error } = await supabase.client
            .from('users')
            .insert({ gosh_username: username, gosh_pubkey: `0x${pubkey}`, email })
            .select()
            .single()
        if (error) {
            throw new GoshError(error.message)
        }
        return data
    }

    return {
        data,
        status,
        updateStep,
        updatePhrase,
        updateUsernameStep,
        updatePhraseCreateStep,
        updatePhraseCheckStep,
        updateCompleteStep,
    }
}
