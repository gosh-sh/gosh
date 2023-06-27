import { useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import PreviousStep from './PreviousStep'
import { ToastError } from '../../../components/Toast'
import PhraseForm from '../../../components/PhraseForm'
import { GoshError } from 'react-gosh'
import { Link } from 'react-router-dom'
import { useRecoilState } from 'recoil'
import { onboardingDataAtom } from '../../../store/onboarding.state'

const generateRandomWordNumbers = () => {
    const min = 0
    const max = 11
    const numbers: number[] = []
    while (true) {
        const num = Math.floor(Math.random() * (max - min + 1)) + min
        if (numbers.indexOf(num) < 0) {
            numbers.push(num)
        }
        if (numbers.length === 3) {
            break
        }
    }
    return numbers.sort((a, b) => a - b)
}

const GoshPhraseCheck = () => {
    const [{ phrase }, setOnboarding] = useRecoilState(onboardingDataAtom)
    const [rndNumbers, setRndNumbers] = useState<number[]>([])

    const onBackClick = () => {
        setOnboarding((state) => ({ ...state, step: 'phrase' }))
    }

    const onFormSubmit = async (values: { words: string[] }) => {
        try {
            const { words } = values
            const validated = rndNumbers.map((n, index) => {
                return words[index] === phrase[n]
            })
            if (!validated.every((v) => !!v)) {
                throw new GoshError('Words check failed')
            }
            setOnboarding((state) => ({ ...state, step: 'username' }))
        } catch (e: any) {
            console.error(e.message)
            toast.error(<ToastError error={e} />)
        }
    }

    useEffect(() => {
        setRndNumbers(generateRandomWordNumbers())
    }, [])

    return (
        <div className="signup signup--phrase">
            <div className="signup__aside signup__aside--step aside-step">
                <div className="aside-step__header">
                    <PreviousStep onClick={onBackClick} />
                </div>
                <p className="aside-step__text">Verify the secret</p>
                <p className="aside-step__text-secondary">Enter required words</p>
            </div>

            <div className="signup__content">
                <div className="signup__phrase-form phrase-form">
                    <h3 className="mb-2">
                        Input words{' '}
                        <span className="font-medium">
                            {rndNumbers.map((n) => n + 1).join(' - ')}
                        </span>{' '}
                        of your phrase
                    </h3>
                    <PhraseForm
                        wordCount={3}
                        btnSubmitContent="Continue"
                        onSubmit={onFormSubmit}
                    />
                </div>
            </div>
        </div>
    )
}

export default GoshPhraseCheck
