import { useState } from 'react'
import GoshPhrase from './components/GoshPhrase'
import { useUser } from 'react-gosh'
import GoshUsername from './components/GoshUsername'
import { Navigate } from 'react-router-dom'
import GoshPhraseCheck from './components/GoshPhraseCheck'

const OnboardingAiPage = () => {
    const { persist } = useUser()
    const [step, setStep] = useState<'phrase' | 'phrase-check' | 'username'>('phrase')
    const [signupState, setSignupState] = useState<{
        phrase: string[]
        username: string
    }>({ phrase: [], username: '' })

    if (persist.pin && persist.username) {
        return <Navigate to="/ai" />
    }
    return (
        <div className="container py-32">
            {step === 'phrase' && (
                <GoshPhrase
                    signupState={signupState}
                    setSignupState={setSignupState}
                    setStep={setStep}
                />
            )}
            {step === 'phrase-check' && (
                <GoshPhraseCheck signupState={signupState} setStep={setStep} />
            )}
            {step === 'username' && (
                <GoshUsername
                    signupState={signupState}
                    setSignupState={setSignupState}
                    setStep={setStep}
                />
            )}
        </div>
    )
}

export default OnboardingAiPage
