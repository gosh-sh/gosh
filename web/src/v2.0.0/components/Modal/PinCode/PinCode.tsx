import { useCallback, useRef, useState } from 'react'
import { Dialog } from '@headlessui/react'
import { useResetRecoilState, useSetRecoilState } from 'recoil'
import { SHA256 } from 'crypto-js'
import { Buffer } from 'buffer'
import { appModalStateAtom } from '../../../../store/app.state'
import { toast } from 'react-toastify'
import PinInput from 'react-pin-input'
import { TUserPersist } from '../../../../types/user.types'
import { chacha20, generateRandomBytes } from '../../../../blockchain/utils'
import { AppConfig } from '../../../../appconfig'
import { useUser } from '../../../hooks/user.hooks'
import { Button } from '../../../../components/Form'

type TPinCodeModalProps = {
    unlock?: boolean
    phrase?: string

    onUnlock?(): void
}

const PinCodeModal = (props: TPinCodeModalProps) => {
    const { phrase, unlock, onUnlock } = props
    const user = useUser()
    const pinRef = useRef<PinInput | null | undefined>()
    const setModal = useSetRecoilState(appModalStateAtom)
    const resetModal = useResetRecoilState(appModalStateAtom)
    const [tmp, setTmp] = useState<TUserPersist>({ ...user.persist })

    const onPinSubmit = useCallback(
        async (pin: string) => {
            const pinHash = SHA256(pin).toString()
            const pinKey = Number(pin).toString(16)

            if (phrase) {
                const nonce = await generateRandomBytes(12, true)
                const encrypted = await chacha20.encrypt(
                    Buffer.from(phrase).toString('base64'),
                    pinKey,
                    nonce,
                )
                setTmp((state) => ({ ...state, nonce, phrase: encrypted, pin: pinHash }))
            }

            if (tmp.phrase && tmp.nonce) {
                if (pinHash !== tmp.pin) {
                    toast.error('Wrong PIN', { autoClose: 1500 })
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

                let decrypted = await chacha20.decrypt(tmp.phrase, pinKey, tmp.nonce)
                decrypted = Buffer.from(decrypted, 'base64').toString()
                const keys = await AppConfig.goshclient.crypto.mnemonic_derive_sign_keys({
                    phrase: decrypted,
                })

                user.unlock(tmp, { phrase: decrypted, keys })
                setModal({ isOpen: false, element: null })
                onUnlock && onUnlock()
            }
        },
        [phrase, unlock, tmp, onUnlock, setModal, user],
    )

    return (
        <Dialog.Panel className="rounded-xl bg-white px-8 py-8 w-full max-w-md">
            <Dialog.Title className="text-3xl text-center font-medium">
                PIN code
            </Dialog.Title>
            <Dialog.Description className="text-center mt-4">
                {tmp.pin ? 'Unlock with PIN code' : 'Create PIN code'}
            </Dialog.Description>

            <div className="mt-4 w-full mx-auto">
                <form autoComplete="off">
                    <PinInput
                        ref={(el) => (pinRef.current = el)}
                        length={4}
                        initialValue=""
                        type="numeric"
                        inputMode="number"
                        // secret
                        secretDelay={1}
                        focus
                        autoSelect={false}
                        style={{
                            display: 'flex',
                            flexWrap: 'nowrap',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem',
                            overflow: 'hidden',
                        }}
                        inputStyle={{
                            width: '3.5rem',
                            height: '3.5rem',
                            margin: '0',
                            borderRadius: '0.5rem',
                            borderWidth: '1px',
                            borderStyle: 'solid',
                            borderColor: '#e6edff',
                            fontSize: '1.75rem',
                            color: 'transparent',
                            textShadow: '0 0 0 #000000',
                        }}
                        inputFocusStyle={{
                            borderColor: '#000000',
                        }}
                        onComplete={(v) => {
                            pinRef.current?.clear()
                            onPinSubmit(v)
                        }}
                    />
                </form>
            </div>

            {unlock && (
                <div className="mt-6 text-center">
                    <Button
                        type="button"
                        size="xl"
                        onClick={() => {
                            user.signout()
                            resetModal()
                        }}
                        test-id="btn-pin-signout"
                    >
                        Sign out
                    </Button>
                </div>
            )}
        </Dialog.Panel>
    )
}

export { PinCodeModal }
