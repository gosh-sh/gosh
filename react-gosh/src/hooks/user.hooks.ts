import { KeyPair } from '@eversdk/core'
import { useState } from 'react'
import { useRecoilState, useRecoilValue, useResetRecoilState } from 'recoil'
import { AppConfig } from '../appconfig'
import { EGoshError, GoshError } from '../errors'
import { GoshAdapterFactory } from '../gosh'
import { IGoshAdapter } from '../gosh/interfaces'
import { userAtom, userPersistAtom, userProfileSelector } from '../store'
import { TUserSignupProgress, TUserPersist } from '../types'
import { validatePhrase } from '../validators'

function useUser() {
    const [userPersist, setUserPersist] = useRecoilState(userPersistAtom)
    const [user, setUser] = useRecoilState(userAtom)
    const resetUserPersist = useResetRecoilState(userPersistAtom)
    const resetUser = useResetRecoilState(userAtom)
    const [signupProgress, setSignupProgress] = useState<TUserSignupProgress>({
        isFetching: false,
    })

    const getProfiles = async (phrase: string) => {
        const derived = await AppConfig.goshclient.crypto.mnemonic_derive_sign_keys({
            phrase,
        })
        return await AppConfig.goshroot.getProfileIndexes(derived.public)
    }

    const setup = (
        persist: TUserPersist,
        decrypted: { phrase: string; keys: KeyPair },
    ) => {
        Object.keys(AppConfig.versions)
            .map((version) => {
                return GoshAdapterFactory.create(version)
            })
            .map((gosh) => {
                const { username } = persist
                const { keys } = decrypted
                if (username && keys) gosh.setAuth(username, keys)
                else gosh.resetAuth()
            })

        setUserPersist(persist)
        setUser({ ...persist, ...decrypted })
    }

    const signinProfiles = async (phrase: string) => {
        const gosh = GoshAdapterFactory.createLatest()
        await _validateCredentials(gosh, { phrase })

        const indexes = await getProfiles(phrase)
        if (!indexes.length) {
            throw new GoshError(EGoshError.PROFILE_NOT_EXIST)
        }
        return indexes
    }

    const signin = async (params: { username: string; phrase: string }) => {
        const gosh = GoshAdapterFactory.createLatest()
        await _validateCredentials(gosh, params)

        const { username, phrase } = params
        const profile = await gosh.getProfile({ username })
        if (!(await profile.isDeployed())) {
            throw new GoshError(EGoshError.PROFILE_NOT_EXIST)
        }

        const derived = await AppConfig.goshclient.crypto.mnemonic_derive_sign_keys({
            phrase,
        })
        if (!(await profile.isOwnerPubkey(derived.public))) {
            throw new GoshError(EGoshError.PROFILE_PUBKEY_INVALID)
        }

        resetUserPersist()
        setUserPersist((state) => ({ ...state, username, profile: profile.address }))
    }

    const signup = async (params: { username: string; phrase: string }) => {
        const gosh = GoshAdapterFactory.createLatest()
        await _validateCredentials(gosh, params)

        const { username, phrase } = params
        const profile = await gosh.getProfile({ username })
        if (await profile.isDeployed()) {
            throw new GoshError(
                EGoshError.PROFILE_EXISTS,
                `GOSH username '${username}' is already taken`,
            )
        }

        setSignupProgress((state) => ({ ...state, isFetching: true }))
        const derived = await AppConfig.goshclient.crypto.mnemonic_derive_sign_keys({
            phrase,
        })

        let isProfileDeployed = false
        try {
            await gosh.deployProfile(username, derived.public)
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

    const _validateCredentials = async (gosh: IGoshAdapter, params: any) => {
        if (params.username) {
            const { valid, reason } = gosh.isValidUsername(params.username)
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
        signinProfiles,
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
