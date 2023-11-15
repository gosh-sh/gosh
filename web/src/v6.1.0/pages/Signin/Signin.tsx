import { useEffect, useState } from 'react'
import { Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import { useSetRecoilState } from 'recoil'
import { ToastError } from '../../../components/Toast'
import { appModalStateAtom } from '../../../store/app.state'
import { PinCodeModal } from '../../components/Modal'
import { withRouteAnimation } from '../../hocs'
import { useUser } from '../../hooks/user.hooks'
import SigninPhraseForm from './PhraseForm'
import SigninProfileForm from './ProfileForm'

const SigninPage = () => {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const location = useLocation()
    const { persist, getProfiles, signin } = useUser()
    const setModal = useSetRecoilState(appModalStateAtom)
    const [step, setStep] = useState<{ name: string; data: any }>()
    const [setupPin, setSetupPin] = useState<string>()

    const onPhraseSubmit = async (values: { words: string[] }) => {
        try {
            const { words } = values
            const phrase = words.join(' ')
            const profiles = await getProfiles(phrase)
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
                element: <PinCodeModal phrase={setupPin} />,
            })
        }
    }, [setupPin, setModal, navigate, searchParams])

    if (persist.pin) {
        const to = searchParams.get('redirect_to') || '/a/orgs'
        return <Navigate to={`${to}${location.hash}`} />
    }
    return (
        <div className="max-w-2xl mx-auto border border-gray-e8eefd rounded-xl px-6 md:px-16 py-12 my-16">
            <h1 className="text-center font-medium text-3xl">Sign in to Gosh</h1>

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

export default withRouteAnimation(SigninPage)
