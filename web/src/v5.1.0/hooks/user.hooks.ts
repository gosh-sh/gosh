import { KeyPair } from '@eversdk/core'
import { userAtom as _userAtom, userPersistAtom as _userPersistAtom } from 'react-gosh'
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
import { EGoshError, GoshError } from '../../errors'
import { appContextAtom } from '../../store/app.state'
import { userAtom, userPersistAtom } from '../../store/user.state'
import { TUserPersist } from '../../types/user.types'
import { validatePhrase } from '../../validators'
import { getSystemContract } from '../blockchain/helpers'
import { userProfileSelector } from '../store/user.state'
import { validateUsername } from '../validators'

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
    const indexes = await AppConfig.goshroot.getUserProfileIndexes(`0x${derived.public}`)
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
    const sc = getSystemContract()
    await _validateCredentials(params)

    const { username, phrase } = params
    const profile = await sc.getUserProfile({ username })
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
    const sc = getSystemContract()
    await _validateCredentials(params)

    const { phrase } = params
    const username = params.username.trim().toLowerCase()
    const profile = await sc.getUserProfile({ username })
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
