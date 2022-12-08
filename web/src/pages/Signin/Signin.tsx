import { useSetRecoilState } from 'recoil'
import { Navigate, useNavigate } from 'react-router-dom'
import { appModalStateAtom } from '../../store/app.state'
import PinCodeModal from '../../components/Modal/PinCode'
import { useUser } from 'react-gosh'
import { toast } from 'react-toastify'
import ToastError from '../../components/Error/ToastError'
import { useEffect, useState } from 'react'
import SigninPhraseForm from './PhraseForm'
import SigninProfileForm from './ProfileForm'

const SigninPage = () => {
    const navigate = useNavigate()
    const { persist, signinProfiles, signin } = useUser()
    const setModal = useSetRecoilState(appModalStateAtom)
    const [step, setStep] = useState<{ name: string; data: any }>()
    const [setupPin, setSetupPin] = useState<string>()

    const onPhraseSubmit = async (values: { phrase: string }) => {
        try {
            const { phrase } = values
            const profiles = await signinProfiles(phrase)
            if (profiles.length > 1) {
                setStep({
                    name: 'ProfileRequired',
                    data: { profiles, phrase },
                })
            } else {
                await signin({ username: profiles[0].name, phrase })
                setSetupPin(phrase)
            }
        } catch (e: any) {
            console.error(e.message)
            toast.error(<ToastError error={e} />)
            return
        }
    }

    const onProfileSubmit = async (values: { username: string }) => {
        try {
            const { username } = values
            await signin({ username, phrase: step?.data.phrase })
            setSetupPin(step?.data.phrase)
        } catch (e: any) {
            console.error(e.message)
            toast.error(<ToastError error={e} />)
            return
        }
    }

    useEffect(() => {
        // Create PIN-code for phrase
        if (setupPin) {
            setModal({
                static: true,
                isOpen: true,
                element: (
                    <PinCodeModal
                        phrase={setupPin}
                        onUnlock={() => navigate('/a/orgs', { replace: true })}
                    />
                ),
            })
        }
    }, [setupPin, setModal, navigate])

    if (persist.pin) return <Navigate to="/a/orgs" />
    return (
        <div className="block-auth">
            <h1 className="px-2 text-center font-bold text-32px sm:text-5xl leading-56px">
                Sign in to Gosh
            </h1>

            {!step && <SigninPhraseForm onSubmit={onPhraseSubmit} />}
            {step?.name === 'ProfileRequired' && (
                <SigninProfileForm
                    profiles={step.data.profiles}
                    onSubmit={onProfileSubmit}
                />
            )}
        </div>
    )
}

export default SigninPage
