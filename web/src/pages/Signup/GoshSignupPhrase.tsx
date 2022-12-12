import { faArrowLeft } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Field, Form, Formik } from 'formik'
import { AppConfig, classNames, EGoshError, GoshError } from 'react-gosh'
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
        <div className="flex justify-between items-start pt-36 pb-5">
            <div className="basis-1/2 px-24">
                <div className="mt-28">
                    <button
                        type="button"
                        className={classNames(
                            'rounded-full border w-10 h-10 mr-6 text-gray-200',
                            'hover:text-gray-400 hover:bg-gray-50',
                        )}
                        onClick={() => setStep({ index: 1 })}
                    >
                        <FontAwesomeIcon icon={faArrowLeft} />
                    </button>
                    <span className="text-xl font-medium">Back</span>
                </div>

                <p className="mt-8 mb-4 text-2xl leading-normal font-medium">
                    Let's set up your GOSH account
                </p>

                <p className="text-gray-53596d">
                    Make sure to write your seed phrase on paper, you will not be able to
                    retrieve it later
                </p>
            </div>

            <div className="basis-1/2 border rounded-xl p-10">
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
                                        className: '!px-7 !py-6',
                                        autoComplete: 'off',
                                        placeholder:
                                            'Provide your seed phrase or generate random one',
                                    }}
                                    help={
                                        <>
                                            <p>GOSH cannot reset this phrase</p>
                                            <p>
                                                If you forget it, you might lose access to
                                                your account
                                            </p>
                                        </>
                                    }
                                />
                                <div className="text-end">
                                    <button
                                        type="button"
                                        className="btn btn--body py-1.5 px-2 text-xs leading-normal"
                                        onClick={async () => {
                                            const phrase = await getRandomPhrase()
                                            setFieldValue('phrase', phrase)
                                        }}
                                    >
                                        Generate phrase
                                    </button>
                                </div>
                            </div>

                            <div className="mt-16">
                                <Field
                                    name="isConfirmed"
                                    component={SwitchField}
                                    className="justify-center"
                                    label="I have written phrase carefuly"
                                    labelClassName="text-base text-gray-505050"
                                    errorClassName="mt-2 text-center"
                                />
                            </div>

                            <div className="mt-5 w-3/4 mx-auto">
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="btn btn--body w-full py-3 leading-normal font-medium"
                                >
                                    {isSubmitting && (
                                        <Spinner className="mr-3" size={'lg'} />
                                    )}
                                    Continue
                                </button>
                            </div>
                        </Form>
                    )}
                </Formik>
            </div>
        </div>
    )
}

export default GoshSignupPhrase
