import { useCallback, useEffect, useState } from 'react'
import { Dialog } from '@headlessui/react'
import { useResetRecoilState, useSetRecoilState } from 'recoil'
import { SHA256 } from 'crypto-js'
import { Buffer } from 'buffer'
import {
    chacha20,
    generateRandomBytes,
    AppConfig,
    TUserPersist,
    useUser,
} from 'react-gosh'
import { appModalStateAtom } from '../../store/app.state'
import { toast } from 'react-toastify'

type TPinCodeModalProps = {
    unlock?: boolean
    phrase?: string

    onUnlock?(): void
}

const PinCodeModal = (props: TPinCodeModalProps) => {
    const { phrase, unlock, onUnlock } = props
    const user = useUser()

    const setModal = useSetRecoilState(appModalStateAtom)
    const resetModal = useResetRecoilState(appModalStateAtom)
    const [pin, setPin] = useState<string>('')
    const [tmp, setTmp] = useState<TUserPersist>({ ...user.persist })

    const onPinSubmit = useCallback(
        async (pin: string) => {
            const pinHash = SHA256(pin).toString()
            const pinKey = Number(pin).toString(16)

            if (phrase) {
                const nonce = await generateRandomBytes(AppConfig.goshclient, 12, true)
                const encrypted = await chacha20.encrypt(
                    AppConfig.goshclient,
                    Buffer.from(phrase).toString('base64'),
                    pinKey,
                    nonce,
                )
                setTmp((state) => ({ ...state, nonce, phrase: encrypted, pin: pinHash }))
                setPin('')
            }

            if (tmp.phrase && tmp.nonce) {
                if (pinHash !== tmp.pin) {
                    toast.error('Wrong PIN', { autoClose: 1500 })
                    setPin('')
                    if (!unlock) {
                        setTmp((state) => ({
                            ...state,
                            phrase: undefined,
                            nonce: undefined,
                            pin: undefined,
                        }))
                    }
                    return
                }

                let decrypted = await chacha20.decrypt(
                    AppConfig.goshclient,
                    tmp.phrase,
                    pinKey,
                    tmp.nonce,
                )
                decrypted = Buffer.from(decrypted, 'base64').toString()
                const keys = await AppConfig.goshclient.crypto.mnemonic_derive_sign_keys({
                    phrase: decrypted,
                })

                user.setup(tmp, { phrase: decrypted, keys })
                setModal({ isOpen: false, element: null })
                onUnlock && onUnlock()
            }
        },
        [phrase, unlock, tmp, onUnlock, setModal],
    )

    useEffect(() => {
        if (pin.length === 4) onPinSubmit(pin)
    }, [pin, onPinSubmit])

    return (
        <Dialog.Panel className="rounded-xl bg-white px-8 py-8 w-full max-w-md">
            <Dialog.Title className="text-3xl text-center font-semibold">
                PIN code
            </Dialog.Title>
            <Dialog.Description className="text-center mt-4">
                {tmp.pin ? 'Unlock with PIN code' : 'Create PIN code'}
            </Dialog.Description>

            <div className="mt-4 w-full md:w-1/3 mx-auto">
                <div className="input">
                    <input
                        type="password"
                        className="element text-center"
                        placeholder="PIN code"
                        value={pin}
                        onChange={(e) => setPin(e.target.value)}
                    />
                </div>
            </div>

            {unlock && (
                <button
                    type="button"
                    className="btn btn--body w-full py-2 mt-4 leading-normal"
                    onClick={() => {
                        user.signout()
                        resetModal()
                    }}
                >
                    Sign out
                </button>
            )}
        </Dialog.Panel>
    )
}

export default PinCodeModal
