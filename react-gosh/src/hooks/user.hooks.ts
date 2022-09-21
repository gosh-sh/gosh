import { KeyPair } from '@eversdk/core'
import { useState } from 'react'
import { useRecoilState, useRecoilValue, useResetRecoilState } from 'recoil'
import { AppConfig } from '../appconfig'
import { EGoshError, GoshError } from '../errors'
import { retry } from '../helpers'
import { userAtom, userPersistAtom, userProfileSelector } from '../store'
import { TUserSignupProgress, TUserPersist } from '../types'
import { validatePhrase, validateUsername } from '../validators'
import { useGosh } from './gosh.hooks'

function useUser() {
    const [userPersist, setUserPersist] = useRecoilState(userPersistAtom)
    const [user, setUser] = useRecoilState(userAtom)
    const resetUserPersist = useResetRecoilState(userPersistAtom)
    const resetUser = useResetRecoilState(userAtom)
    const gosh = useGosh()
    const [signupProgress, setSignupProgress] = useState<TUserSignupProgress>({
        isFetching: false,
    })

    const setup = (
        persist: TUserPersist,
        decrypted: { phrase: string; keys: KeyPair },
    ) => {
        setUserPersist(persist)
        setUser({ ...persist, ...decrypted })
    }

    const signin = async (params: { username: string; phrase: string }) => {
        if (!gosh) throw new GoshError(EGoshError.GOSH_UNDEFINED)
        await _validateCredentials(params)

        const { username, phrase } = params
        const profile = await gosh.getProfile(username)
        if (!(await profile.isDeployed())) {
            throw new GoshError(EGoshError.PROFILE_NOT_EXIST)
        }

        const derived = await AppConfig.goshclient.crypto.mnemonic_derive_sign_keys({
            phrase,
        })
        if (!(await profile.isPubkeyCorrect(`0x${derived.public}`))) {
            throw new GoshError(EGoshError.PROFILE_PUBKEY_INVALID)
        }

        resetUserPersist()
        setUserPersist((state) => ({ ...state, username, profile: profile.address }))
    }

    const signup = async (params: { username: string; phrase: string }) => {
        if (!gosh) throw new GoshError(EGoshError.GOSH_UNDEFINED)
        await _validateCredentials(params)

        const { username, phrase } = params
        const profile = await gosh.getProfile(username)
        if (await profile.isDeployed()) throw new GoshError(EGoshError.PROFILE_EXISTS)

        setSignupProgress((state) => ({ ...state, isFetching: true }))
        const derived = await AppConfig.goshclient.crypto.mnemonic_derive_sign_keys({
            phrase,
        })

        let isProfileDeployed = false
        try {
            await retry(() => gosh.deployProfile(username, `0x${derived.public}`), 3)
            isProfileDeployed = true
        } catch (e) {
            isProfileDeployed = false
            throw e
        } finally {
            setSignupProgress((state) => ({
                ...state,
                isFetching: false,
                isProfileDeployed,
            }))
        }

        resetUserPersist()
        setUserPersist((state) => ({ ...state, username, profile: profile.address }))
    }

    const signout = () => {
        resetUser()
        resetUserPersist()
    }

    const _validateCredentials = async (params: any) => {
        if (params.username) {
            const { valid, reason } = validateUsername(params.username)
            if (!valid) throw new GoshError(EGoshError.USER_NAME_INVALID, reason)
        }

        if (params.phrase) {
            const { valid, reason } = await validatePhrase(params.phrase)
            if (!valid) throw new GoshError(EGoshError.PHRASE_INVALID, reason)
        }
    }

    return {
        persist: userPersist,
        user,
        setup,
        signin,
        signup,
        signupProgress,
        signout,
    }
}

function useProfile() {
    const profile = useRecoilValue(userProfileSelector)
    return profile
}

export { useUser, useProfile }
