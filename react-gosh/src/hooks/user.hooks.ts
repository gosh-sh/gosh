import { AccountType } from '@eversdk/appkit'
import { KeyPair } from '@eversdk/core'
import { useEffect, useState } from 'react'
import { useRecoilState, useResetRecoilState } from 'recoil'
import { AppConfig } from '../appconfig'
import { EGoshError, GoshError } from '../errors'
import { retry } from '../helpers'
import { GoshProfile, IGosh, IGoshProfile } from '../resources'
import { userAtom, userPersistAtom } from '../store'
import { TUserSignupProgress, TUserStatePersist } from '../types'
import { useGosh } from './gosh.hooks'

function useUser() {
    const [userPersist, setUserPersist] = useRecoilState(userPersistAtom)
    const [user, setUser] = useRecoilState(userAtom)
    const resetUserPersist = useResetRecoilState(userPersistAtom)
    const resetUser = useResetRecoilState(userAtom)
    const gosh = useGosh()
    const [userSignupProgress, setUserSignupProgress] = useState<TUserSignupProgress>({
        isFetching: false,
    })

    const userSetup = (
        persist: TUserStatePersist,
        decrypted: { phrase: string; keys: KeyPair },
    ) => {
        setUserPersist(persist)
        setUser({ ...persist, ...decrypted })
    }

    const userSignin = async (params: { username: string; phrase: string }) => {
        const { username, phrase } = params
        if (!gosh) throw new GoshError(EGoshError.GOSH_UNDEFINED)

        const validated = await AppConfig.goshclient.crypto.mnemonic_verify({
            phrase,
        })
        if (!validated.valid) throw new GoshError(EGoshError.PHRASE_INVALID)

        const { exists, profile } = await _isProfileExists(gosh, username)
        if (!exists) throw new GoshError(EGoshError.PROFILE_NOT_EXIST)

        const derived = await AppConfig.goshclient.crypto.mnemonic_derive_sign_keys({
            phrase,
        })
        if (!(await profile.isPubkeyCorrect(`0x${derived.public}`))) {
            throw new GoshError(EGoshError.PROFILE_INVALID_PUBKEY)
        }

        resetUserPersist()
        setUserPersist((state) => ({ ...state, username, profile: profile.address }))
    }

    const userSignup = async (params: { username: string; phrase: string }) => {
        const { username, phrase } = params
        if (!gosh) throw new GoshError(EGoshError.GOSH_UNDEFINED)

        const { exists, profile } = await _isProfileExists(gosh, username)
        if (exists) throw new GoshError(EGoshError.PROFILE_EXISTS)

        setUserSignupProgress((state) => ({ ...state, isFetching: true }))
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
            setUserSignupProgress((state) => ({
                ...state,
                isFetching: false,
                isProfileDeployed,
            }))
        }

        resetUserPersist()
        setUserPersist((state) => ({ ...state, username, profile: profile.address }))
    }

    const userSignout = () => {
        resetUser()
        resetUserPersist()
    }

    const _isProfileExists = async (
        gosh: IGosh,
        username: string,
    ): Promise<{ exists: boolean; profile: IGoshProfile }> => {
        const profileAddr = await gosh.getProfileAddr(username)
        const profile = new GoshProfile(AppConfig.goshclient, profileAddr)
        const profileAcc = await profile.account.getAccount()
        return {
            exists: profileAcc.acc_type === AccountType.active,
            profile,
        }
    }

    return {
        persist: userPersist,
        user,
        userSetup,
        userSignin,
        userSignup,
        userSignupProgress,
        userSignout,
    }
}

function useProfile() {
    const { user } = useUser()
    const [profile, setProfile] = useState<IGoshProfile>()

    useEffect(() => {
        const _getProfile = async () => {
            if (!user.profile) return

            const instance = new GoshProfile(
                AppConfig.goshclient,
                user.profile,
                user.keys,
            )
            setProfile(instance)
        }

        _getProfile()
    }, [user.profile, user.keys])

    return profile
}

export { useUser, useProfile }
