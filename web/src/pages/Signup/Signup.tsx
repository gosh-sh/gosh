import { useEffect, useState } from 'react'
import { Form, Formik, Field } from 'formik'
import * as Yup from 'yup'
import TextareaField from '../../components/FormikForms/TextareaField'
import SwitchField from '../../components/FormikForms/SwitchField'
import { useResetRecoilState, useSetRecoilState } from 'recoil'
import { useNavigate } from 'react-router-dom'
import { TonClient } from '@eversdk/core'
import { appModalStateAtom } from '../../store/app.state'
import PinCodeModal from '../../components/Modal/PinCode'
import { AppConfig, userStatePersistAtom } from 'react-gosh'
import Spinner from '../../components/Spinner'

type TFormValues = {
    phrase: string
    isConfirmed: boolean
}

const SignupPage = () => {
    const navigate = useNavigate()
    const userStatePersistReset = useResetRecoilState(userStatePersistAtom)
    const setModal = useSetRecoilState(appModalStateAtom)
    const [phrase, setPhrase] = useState<string>('')

    const generatePhrase = async (client: TonClient | any) => {
        const result = await client.crypto.mnemonic_from_random({})
        setPhrase(result.phrase)
    }

    const onFormSubmit = async (values: TFormValues) => {
        // Derive sign keys from phrase and deploy profile
        const derived = await AppConfig.goshclient.crypto.mnemonic_derive_sign_keys({
            phrase: values.phrase,
        })
        const gosh = await AppConfig.goshroot.getGosh(AppConfig.goshversion)
        await gosh.deployProfile(`0x${derived.public}`)

        // Reset state and create PIN-code
        userStatePersistReset()
        setModal({
            static: true,
            isOpen: true,
            element: (
                <PinCodeModal
                    phrase={values.phrase}
                    onUnlock={() => navigate('/account/orgs', { replace: true })}
                />
            ),
        })
    }

    useEffect(() => {
        generatePhrase(AppConfig.goshclient)
    }, [])

    return (
        <div className="block-auth">
            <h1 className="px-2 text-center font-bold text-32px sm:text-5xl leading-117%">
                Create Gosh account
            </h1>
            <div className="px-9 sm:px-2 mt-2 mb-10 text-center text-gray-606060 text-lg sm:text-xl leading-normal">
                It's your seed phrase, please write it on paper
            </div>

            <Formik
                initialValues={{ phrase, isConfirmed: false }}
                onSubmit={onFormSubmit}
                validationSchema={Yup.object().shape({
                    phrase: Yup.string().required('`Phrase` is required'),
                    isConfirmed: Yup.boolean().oneOf([true], 'You should accept this'),
                })}
                enableReinitialize={true}
            >
                {({ isSubmitting }) => (
                    <Form className="px-5 sm:px-124px">
                        <div>
                            <Field
                                name="phrase"
                                component={TextareaField}
                                errorEnabled={false}
                                inputProps={{
                                    className: '!px-7 !py-6',
                                    autoComplete: 'off',
                                    placeholder: 'GOSH root seed phrase',
                                    readOnly: true,
                                }}
                            />
                        </div>

                        <div className="mt-72px">
                            <Field
                                name="isConfirmed"
                                component={SwitchField}
                                className="justify-center"
                                label="I have written phrase carefuly"
                                labelClassName="text-base text-gray-505050"
                                errorClassName="mt-2 text-center"
                            />
                        </div>

                        <div className="mt-6">
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="btn btn--body w-full py-3 text-xl leading-normal"
                            >
                                {isSubmitting && <Spinner className="mr-3" size={'lg'} />}
                                Create account
                            </button>
                        </div>
                    </Form>
                )}
            </Formik>
        </div>
    )
}

export default SignupPage
