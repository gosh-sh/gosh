import { useEffect, useState } from 'react'
import { toast } from 'react-toastify'

import PreviousStep from './PreviousStep'
import { ToastError } from '../../../components/Toast'
import PhraseForm from '../../../components/PhraseForm'
import { GoshError } from 'react-gosh'
import { Link } from 'react-router-dom'

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

type TGoshPhraseCheckProps = {
    signupState: {
        phrase: string[]
        username: string
    }
    setStep: React.Dispatch<React.SetStateAction<'phrase' | 'phrase-check' | 'username'>>
}

const GoshPhraseCheck = (props: TGoshPhraseCheckProps) => {
    const { signupState, setStep } = props
    const [rndNumbers, setRndNumbers] = useState<number[]>([])

    const onBackClick = () => {
        setStep('phrase')
    }

    const onFormSubmit = async (values: {
        words: { value: string; index: number }[]
    }) => {
        try {
            const { words } = values
            const validated = words.map(({ value, index }) => {
                return value === signupState.phrase[index]
            })
            if (!validated.every((v) => !!v)) {
                throw new GoshError('Words check failed')
            }
            setStep('username')
        } catch (e: any) {
            console.error(e.message)
            toast.error(<ToastError error={e} />)
        }
    }

    useEffect(() => {
        setRndNumbers(generateRandomWordNumbers())
    }, [])

    return (
        <div className="flex flex-wrap gap-4 items-center justify-around">
            <div className="basis-4/12">
                <div className="mb-6">
                    <PreviousStep onClick={onBackClick} />
                </div>
                <h3 className="text-3xl font-medium">Verify the secret</h3>
                <div className="mt-2 text-gray-53596d text-sm">Enter required words</div>
                <div className="mt-16 text-gray-53596d text-sm">
                    Already have an account on Gosh?{' '}
                    <Link to="/a/signin" className="text-blue-1e7aec underline">
                        Log in
                    </Link>
                </div>
            </div>

            <div className="basis-6/12">
                <div className="p-8 border border-gray-e6edff rounded-xl">
                    <PhraseForm
                        initialValues={{
                            words: rndNumbers.map((index) => ({ value: '', index })),
                        }}
                        btnSubmitContent="Continue"
                        onSubmit={onFormSubmit}
                    />
                </div>
            </div>
        </div>
    )
}

export default GoshPhraseCheck
