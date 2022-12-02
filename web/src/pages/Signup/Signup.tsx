import { useEffect, useState } from 'react'
import { Form, Formik, Field } from 'formik'
import * as Yup from 'yup'
import { TextareaField, TextField, SwitchField } from '../../components/Formik'
import { useSetRecoilState } from 'recoil'
import { Navigate, useNavigate } from 'react-router-dom'
import { TonClient } from '@eversdk/core'
import { appModalStateAtom } from '../../store/app.state'
import PinCodeModal from '../../components/Modal/PinCode'
import { AppConfig, useUser } from 'react-gosh'
import Spinner from '../../components/Spinner'
import { toast } from 'react-toastify'
import ToastError from '../../components/Error/ToastError'
import { SignupProgress } from './SignupProgress'

type TFormValues = {
    username: string
    phrase: string
    isConfirmed: boolean
}

const SignupPage = () => {
    const navigate = useNavigate()
    const { persist, signup, signupProgress } = useUser()
    const setModal = useSetRecoilState(appModalStateAtom)
    const [phrase, setPhrase] = useState<string>('')

    const generatePhrase = async (client: TonClient | any) => {
        const result = await client.crypto.mnemonic_from_random({})
        setPhrase(result.phrase)
    }

    const onFormSubmit = async (values: TFormValues) => {
        try {
            await signup({
                ...values,
                username: (values.username.startsWith('@')
                    ? values.username
                    : `@${values.username}`
                ).trim(),
            })

            // Create PIN-code
            setModal({
                static: true,
                isOpen: true,
                element: (
                    <PinCodeModal
                        phrase={values.phrase}
                        onUnlock={() => navigate('/a/orgs', { replace: true })}
                    />
                ),
            })
        } catch (e: any) {
            console.error(e.message)
            toast.error(<ToastError error={e} />)
            return
        }
    }

    useEffect(() => {
        generatePhrase(AppConfig.goshclient)
    }, [])

    if (persist.username) return <Navigate to="/a/orgs" />
    return (
        <div className="block-auth">
            <h1 className="px-2 text-center font-bold text-32px sm:text-5xl leading-117%">
                Create Gosh account
            </h1>
            <div className="px-9 sm:px-2 mt-2 mb-10 text-center text-gray-606060 text-lg sm:text-xl leading-normal">
                It's your seed phrase, please write it on paper
            </div>

            <Formik
                initialValues={{ username: '', phrase, isConfirmed: false }}
                onSubmit={onFormSubmit}
                validationSchema={Yup.object().shape({
                    username: Yup.string()
                        .matches(/^@?[\w-]+$/, 'Username has invalid characters')
                        .max(64, 'Max length is 64 characters')
                        .required('Username is required'),
                    phrase: Yup.string().required('Phrase is required'),
                    isConfirmed: Yup.boolean().oneOf([true], 'You should accept this'),
                })}
                enableReinitialize={true}
            >
                {({ isSubmitting }) => (
                    <Form className="px-5 sm:px-124px">
                        <div className="mb-3">
                            <Field
                                name="username"
                                component={TextField}
                                inputProps={{
                                    autoComplete: 'off',
                                    placeholder: 'Username',
                                }}
                            />
                        </div>

                        <div>
                            <Field
                                name="phrase"
                                component={TextareaField}
                                errorEnabled={false}
                                inputProps={{
                                    className: '!px-7 !py-6',
                                    autoComplete: 'off',
                                    placeholder: 'Seed phrase',
                                }}
                                helpClassName="mt-1"
                                help={
                                    <>
                                        <p>GOSH cannot reset this phrase.</p>
                                        <p>
                                            If you forget it, you might lose access to
                                            your account
                                        </p>
                                    </>
                                }
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

            <SignupProgress progress={signupProgress} className="mt-4 mx-5 sm:mx-124px" />
        </div>
    )
}

export default SignupPage
