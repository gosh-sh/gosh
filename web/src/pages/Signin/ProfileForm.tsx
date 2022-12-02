import { Field, Form, Formik } from 'formik'
import * as Yup from 'yup'
import { TAddress } from 'react-gosh'
import Spinner from '../../components/Spinner'
import { TextField } from '../../components/Formik'

type TSigninProfileFormProps = {
    profiles: { pubkey: string; name: string; profile: TAddress }[]
    onSubmit(values: { username: string }): Promise<void>
}

const SigninProfileForm = (props: TSigninProfileFormProps) => {
    const { profiles, onSubmit } = props

    if (!profiles.length)
        return (
            <div>
                <div className="text-center text-gray-606060 text-lg mt-4 mb-5 px-6">
                    We couldn't find a profiles by your keys, please, provide your GOSH
                    username
                </div>

                <Formik
                    initialValues={{ username: '' }}
                    validationSchema={Yup.object().shape({
                        username: Yup.string()
                            .max(64, 'Max length is 64 characters')
                            .required('Username is required'),
                    })}
                    onSubmit={onSubmit}
                >
                    {({ isSubmitting, values }) => (
                        <Form className="px-4 sm:px-124px">
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

                            <div className="text-center">
                                <button
                                    type="submit"
                                    className="btn btn--body px-6 py-3 text-xl leading-normal"
                                    disabled={isSubmitting || !values.username}
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
        )

    return (
        <div>
            <div className="text-center text-gray-606060 text-lg mt-4 mb-5 px-6">
                We found multiple profiles for your keys, please, select one
            </div>

            <Formik
                initialValues={{ username: '' }}
                validationSchema={Yup.object().shape({
                    username: Yup.string()
                        .max(64, 'Max length is 64 characters')
                        .required('Username is required'),
                })}
                onSubmit={onSubmit}
            >
                {({ isSubmitting, values }) => (
                    <Form className="px-4 text-center">
                        <div className="mb-3">
                            <Field
                                name="username"
                                component={'select'}
                                className="px-2 py-3 rounded-md border focus:outline-none"
                                disabled={isSubmitting}
                            >
                                <option value="">Select profile</option>
                                {profiles?.map((item, index) => (
                                    <option key={index} value={item.name}>
                                        {item.name}
                                    </option>
                                ))}
                            </Field>
                        </div>

                        <button
                            type="submit"
                            className="btn btn--body px-6 py-3 text-xl leading-normal"
                            disabled={isSubmitting || !values.username}
                        >
                            {isSubmitting && <Spinner className="mr-3" size={'lg'} />}
                            Continue
                        </button>
                    </Form>
                )}
            </Formik>
        </div>
    )
}

export default SigninProfileForm
