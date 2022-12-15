import { faArrowLeft } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Field, Form, Formik } from 'formik'
import { AppConfig, EGoshError, GoshError } from 'react-gosh'
import { toast } from 'react-toastify'
import { useSetRecoilState } from 'recoil'
import * as Yup from 'yup'
import ToastError from '../../components/Error/ToastError'
import { SwitchField, TextareaField } from '../../components/Formik'
import Spinner from '../../components/Spinner'
import { signupStepAtom } from '../../store/signup.state'

type TGoshSignupPhraseProps = {
    phrase: string
    setPhrase(phrase: string): void
}

const GoshSignupPhrase = (props: TGoshSignupPhraseProps) => {
    const { phrase, setPhrase } = props
    const setStep = useSetRecoilState(signupStepAtom)

    const getRandomPhrase = async () => {
        const { phrase } = await AppConfig.goshclient.crypto.mnemonic_from_random({})
        return phrase
    }

    const onFormSubmit = async (values: { phrase: string }) => {
        try {
            const { phrase } = values
            const { valid } = await AppConfig.goshclient.crypto.mnemonic_verify({
                phrase,
            })
            if (!valid) {
                throw new GoshError(EGoshError.PHRASE_INVALID)
            }

            setPhrase(phrase)
            setStep({ index: 4 })
        } catch (e: any) {
            console.error(e.message)
            toast.error(<ToastError error={e} />)
        }
    }

    return (
        <div className="signup signup--phrase">
            <div className="signup__aside signup__aside--step aside-step">
                <div className="aside-step__header">
                    <div className="aside-step__btn-back">
                        <button type="button" onClick={() => setStep({ index: 1 })}>
                            <FontAwesomeIcon icon={faArrowLeft} />
                        </button>
                    </div>
                    <span className="aside-step__title">Back</span>
                </div>

                <p className="aside-step__text">Let's set up your GOSH account</p>

                <p className="aside-step__text-secondary">
                    Make sure to write your seed phrase on paper, you will not be able to
                    retrieve it later
                </p>
            </div>

            <div className="signup__content">
                <div className="signup__phrase-form phrase-form">
                    <Formik
                        initialValues={{
                            phrase,
                            isConfirmed: false,
                        }}
                        onSubmit={onFormSubmit}
                        validationSchema={Yup.object().shape({
                            phrase: Yup.string().required('Phrase is required'),
                            isConfirmed: Yup.boolean().oneOf(
                                [true],
                                'You should accept this',
                            ),
                        })}
                    >
                        {({ isSubmitting, setFieldValue }) => (
                            <Form>
                                <div>
                                    <Field
                                        name="phrase"
                                        component={TextareaField}
                                        errorEnabled={false}
                                        inputProps={{
                                            className: '!px-5 !py-3',
                                            autoComplete: 'off',
                                            placeholder:
                                                'Provide your seed phrase or generate random one',
                                            rows: 4,
                                        }}
                                        help={
                                            <>
                                                <p>GOSH cannot reset this phrase</p>
                                                <p>
                                                    If you forget it, you might lose
                                                    access to your account
                                                </p>
                                            </>
                                        }
                                    />
                                </div>

                                <div className="phrase-form__generate">
                                    <button
                                        type="button"
                                        onClick={async () => {
                                            const phrase = await getRandomPhrase()
                                            setFieldValue('phrase', phrase)
                                        }}
                                    >
                                        Generate phrase
                                    </button>
                                </div>

                                <div className="phrase-form__confirm">
                                    <Field
                                        name="isConfirmed"
                                        component={SwitchField}
                                        className="justify-center"
                                        label="I have written phrase carefuly"
                                        labelClassName="text-sm text-gray-505050"
                                        errorClassName="mt-2 text-center text-sm"
                                    />
                                </div>

                                <div className="phrase-form__submit">
                                    <button type="submit" disabled={isSubmitting}>
                                        {isSubmitting && <Spinner size={'lg'} />}
                                        Continue
                                    </button>
                                </div>
                            </Form>
                        )}
                    </Formik>
                </div>
            </div>
        </div>
    )
}

export default GoshSignupPhrase
