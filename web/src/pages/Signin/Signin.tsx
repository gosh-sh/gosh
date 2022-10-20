import { Form, Formik, Field, ErrorMessage } from 'formik'
import * as Yup from 'yup'
import { TextField, TextareaField } from '../../components/Formik'
import { useSetRecoilState } from 'recoil'
import { Navigate, useNavigate } from 'react-router-dom'
import Spinner from '../../components/Spinner'
import { appModalStateAtom } from '../../store/app.state'
import PinCodeModal from '../../components/Modal/PinCode'
import { useUser } from 'react-gosh'
import { toast } from 'react-toastify'
import ToastError from '../../components/Error/ToastError'

type TFormValues = {
    username: string
    phrase: string
}

const SigninPage = () => {
    const navigate = useNavigate()
    const { persist, signin } = useUser()
    const setModal = useSetRecoilState(appModalStateAtom)

    const onFormSubmit = async (values: TFormValues) => {
        try {
            await signin({
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

    if (persist.username) return <Navigate to="/a/orgs" />
    return (
        <div className="block-auth">
            <h1 className="px-2 text-center font-bold text-32px sm:text-5xl leading-56px">
                Sign in to Gosh
            </h1>
            <div className="px-9 sm:px-2 mt-0 sm:mt-2 mb-10 text-center text-gray-606060 text-lg sm:text-xl leading-normal">
                Please, write your seed phrase
            </div>

            <Formik
                initialValues={{ username: '', phrase: '' }}
                onSubmit={onFormSubmit}
                validationSchema={Yup.object().shape({
                    username: Yup.string()
                        .max(64, 'Max length is 64 characters')
                        .required('Username is required'),
                    phrase: Yup.string().required('Phrase is required'),
                })}
            >
                {({ isSubmitting, touched, errors }) => (
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
                            />
                        </div>

                        <div className="mt-10 text-red-dd3a3a text-center text-base h-6">
                            {touched.phrase && errors.phrase && (
                                <ErrorMessage name={'phrase'} />
                            )}
                        </div>

                        <div className="mt-2">
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="btn btn--body w-full py-3 text-xl leading-normal"
                            >
                                {isSubmitting && <Spinner className="mr-3" size={'lg'} />}
                                Sign in
                            </button>
                        </div>
                    </Form>
                )}
            </Formik>
        </div>
    )
}

export default SigninPage
