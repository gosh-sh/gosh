import { Field } from 'formik'
import { useCallback, useEffect } from 'react'
import { AppConfig, EGoshError, GoshError } from 'react-gosh'
import { toast } from 'react-toastify'
import { ToastError } from '../../../components/Toast'
import { SwitchField } from '../../../components/Formik'
import { Link } from 'react-router-dom'
import PhraseForm from '../../../components/PhraseForm'
import yup from '../../../yup-extended'

type TGoshPhraseProps = {
    signupState: {
        phrase: string[]
        username: string
    }
    setSignupState: React.Dispatch<
        React.SetStateAction<{
            phrase: string[]
            username: string
        }>
    >
    setStep: React.Dispatch<React.SetStateAction<'phrase' | 'phrase-check' | 'username'>>
}

const GoshPhrase = (props: TGoshPhraseProps) => {
    const { signupState, setSignupState, setStep } = props

    const setRandomPhrase = useCallback(async () => {
        const result = await AppConfig.goshclient.crypto.mnemonic_from_random({})
        setSignupState((state) => ({ ...state, phrase: result.phrase.split(' ') }))
    }, [setSignupState])

    const onFormSubmit = async (values: {
        words: { value: string; index: number }[]
    }) => {
        try {
            const words = values.words.map(({ value }) => value)
            const { valid } = await AppConfig.goshclient.crypto.mnemonic_verify({
                phrase: words.join(' '),
            })
            if (!valid) {
                throw new GoshError(EGoshError.PHRASE_INVALID)
            }
            setSignupState((state) => ({ ...state, phrase: words }))
            setStep('phrase-check')
        } catch (e: any) {
            console.error(e.message)
            toast.error(<ToastError error={e} />)
        }
    }

    useEffect(() => {
        if (!signupState.phrase.length) {
            setRandomPhrase()
        }
    }, [signupState.phrase, setRandomPhrase])

    return (
        <div className="flex flex-wrap gap-4 items-center justify-around">
            <div className="basis-4/12">
                <h3 className="text-3xl font-medium">Save the phrase</h3>
                <div className="mt-2 text-gray-53596d text-sm">
                    The secret phrase is a crucial element for the security of your
                    account
                </div>
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
                            words: signupState.phrase.map((v, i) => ({
                                value: v,
                                index: i,
                            })),
                            isConfirmed: false,
                        }}
                        validationSchema={yup.object().shape({
                            isConfirmed: yup
                                .boolean()
                                .oneOf([true], 'You should accept this'),
                        })}
                        btnGenerate
                        btnClear
                        btnSubmitContent="Continue"
                        onSubmit={onFormSubmit}
                        onGenerate={async (words) => {
                            setSignupState((state) => ({ ...state, phrase: words }))
                        }}
                    >
                        <div className="mt-8 text-center">
                            <Field
                                name="isConfirmed"
                                component={SwitchField}
                                className="justify-center"
                                label="I have written phrase carefuly"
                                labelClassName="text-sm text-gray-505050"
                                errorClassName="mt-2 text-center text-sm"
                            />
                        </div>
                    </PhraseForm>
                </div>
            </div>
        </div>
    )
}

export default GoshPhrase
