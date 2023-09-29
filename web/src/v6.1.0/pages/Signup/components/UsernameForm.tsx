import { Field, Form, Formik } from 'formik'
import yup from '../../../yup-extended'
import { FormikInput } from '../../../../components/Formik'
import Alert from '../../../../components/Alert'
import { Button } from '../../../../components/Form'
import { useUserSignup } from '../../../hooks/user.hooks'
import { useOauth } from '../../../hooks/oauth.hooks'

type TFormValues = {
    email: string
    username: string
}

const UsernameForm = () => {
    const { oauth, signout } = useOauth()
    const { data, submitUsernameStep } = useUserSignup()

    const onFormSubmit = async (values: TFormValues) => {
        try {
            await submitUsernameStep({ email: values.email, username: values.username })
        } catch (e: any) {
            console.error(e.message)
        }
    }

    return (
        <div className="flex flex-wrap items-center justify-center gap-14">
            <div className="basis-full lg:basis-4/12 text-center lg:text-start">
                <div className="mb-4 text-3xl font-medium">Welcome to Gosh</div>
                <div className="text-gray-53596d">Choose a short Nickname and Email</div>
            </div>

            <div className="basis-full md:basis-8/12 lg:basis-5/12 xl:basis-4/12">
                <div className="border border-gray-e6edff rounded-xl p-8">
                    <Formik
                        initialValues={{
                            email: data.email || oauth.session?.user.email || '',
                            username: data.username,
                        }}
                        onSubmit={onFormSubmit}
                        validationSchema={yup.object().shape({
                            email: yup.string().email().required(),
                            username: yup.string().username().required(),
                        })}
                    >
                        {({ isSubmitting, setFieldValue }) => (
                            <Form>
                                <div className="mb-4">
                                    <Field
                                        name="email"
                                        component={FormikInput}
                                        autoComplete="off"
                                        placeholder="Email"
                                        disabled={isSubmitting}
                                    />
                                </div>
                                <div className="mb-5">
                                    <Field
                                        name="username"
                                        component={FormikInput}
                                        autoComplete="off"
                                        placeholder="Username"
                                        disabled={isSubmitting}
                                        onChange={(e: any) =>
                                            setFieldValue(
                                                'username',
                                                e.target.value.toLowerCase(),
                                            )
                                        }
                                    />
                                </div>

                                <Alert variant="danger" className="mb-8">
                                    <div className="text-xs">
                                        This is your unique cryptographic identifier in
                                        Gosh. <br />
                                        Please note that after creating your username it
                                        will be impossible to change it in the future
                                    </div>
                                </Alert>

                                <div className="text-center">
                                    <Button
                                        type="submit"
                                        size="xl"
                                        disabled={isSubmitting}
                                        isLoading={isSubmitting}
                                    >
                                        Continue
                                    </Button>
                                </div>
                            </Form>
                        )}
                    </Formik>
                </div>
            </div>
        </div>
    )
}

export { UsernameForm }
