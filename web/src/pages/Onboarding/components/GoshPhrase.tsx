import { Field } from 'formik'
import { useCallback, useEffect } from 'react'
import { AppConfig, EGoshError, GoshError } from 'react-gosh'
import { toast } from 'react-toastify'
import { useRecoilState } from 'recoil'
import { ToastError } from '../../../components/Toast'
import { FormikCheckbox } from '../../../components/Formik'
import { onboardingDataAtom } from '../../../store/onboarding.state'
import PreviousStep from './PreviousStep'
import PhraseForm from '../../../components/PhraseForm'
import yup from '../../../yup-extended'
import Alert from '../../../components/Alert/Alert'

const GoshPhrase = () => {
    const [{ phrase }, setOnboarding] = useRecoilState(onboardingDataAtom)

    const setRandomPhrase = useCallback(async () => {
        const { phrase } = await AppConfig.goshclient.crypto.mnemonic_from_random({})
        setOnboarding((state) => ({ ...state, phrase: phrase.split(' ') }))
    }, [setOnboarding])

    const onBackClick = () => {
        setOnboarding((state) => ({ ...state, step: 'organizations' }))
    }

    const onFormSubmit = async (values: { words: string[] }) => {
        try {
            const { words } = values
            const { valid } = await AppConfig.goshclient.crypto.mnemonic_verify({
                phrase: words.join(' '),
            })
            if (!valid) {
                throw new GoshError(EGoshError.PHRASE_INVALID)
            }
            setOnboarding((state) => ({ ...state, phrase: words, step: 'phrase-check' }))
        } catch (e: any) {
            console.error(e.message)
            toast.error(<ToastError error={e} />)
        }
    }

    useEffect(() => {
        if (!phrase.length) {
            setRandomPhrase()
        }
    }, [phrase, setRandomPhrase])

    return (
        <div className="signup signup--phrase">
            <div className="signup__aside signup__aside--step aside-step">
                <div className="aside-step__header">
                    <PreviousStep onClick={onBackClick} />
                </div>

                <p className="aside-step__text">Let's set up your GOSH account</p>

                <p className="aside-step__text-secondary">
                    Write down the seed phrase in a safe place or enter an existing one if
                    you already have a GOSH account
                </p>
            </div>

            <div className="signup__content">
                <div className="signup__phrase-form phrase-form">
                    <PhraseForm
                        initialValues={{
                            words: phrase,
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
                        btnSubmitProps={{
                            size: 'xl',
                        }}
                        onSubmit={onFormSubmit}
                        onGenerate={setRandomPhrase}
                    >
                        <Alert variant="danger" className="mt-4 text-xs">
                            GOSH cannot reset this phrase! If you forget it, you might
                            lose access to your account
                        </Alert>

                        <div className="mt-8 text-center">
                            <Field
                                className="!inline-block"
                                name="isConfirmed"
                                type="checkbox"
                                component={FormikCheckbox}
                                inputProps={{
                                    label: 'I have written phrase carefuly',
                                }}
                            />
                        </div>
                    </PhraseForm>
                </div>
            </div>
        </div>
    )
}

export default GoshPhrase
