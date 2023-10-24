import { Field, Form, Formik } from 'formik'
import { FormikCheckbox, FormikInput } from '../../../components/Formik'
import { Button } from '../../../components/Form'
import { useUserNotificationSettings } from '../../hooks/notification.hooks'
import yup from '../../yup-extended'

type TFormValues = {
    email_enabled?: boolean
    app_enabled?: boolean
    email?: string
}

const AccountNotificationsPage = () => {
    const { userSettings, updateUserSettings } = useUserNotificationSettings()

    const onSaveSubmit = async (values: TFormValues) => {
        try {
            await updateUserSettings(values)
        } catch (e: any) {
            console.error(e.message)
        }
    }

    return (
        <Formik
            initialValues={{
                email_enabled: !!userSettings.data.email_enabled,
                app_enabled: !!userSettings.data.app_enabled,
                email: userSettings.data.email || '',
            }}
            validationSchema={yup.object().shape({
                email: yup.string().email().required(),
            })}
            onSubmit={onSaveSubmit}
            enableReinitialize
        >
            {({ isSubmitting, values, setFieldValue }) => (
                <Form>
                    <div>
                        <h1 className="mb-6 first-line:text-xl font-medium">
                            Email notifications
                        </h1>

                        <div>
                            <Field
                                name="email_enabled"
                                type="checkbox"
                                component={FormikCheckbox}
                                inputProps={{
                                    label: 'Receive updates by email',
                                }}
                                disabled={isSubmitting || userSettings.isFetching}
                                onChange={() => {
                                    const value = !values.email_enabled
                                    setFieldValue('email_enabled', value)
                                    onSaveSubmit({ email_enabled: value })
                                }}
                            />
                        </div>
                        <div className="mt-8">
                            <h3 className="mb-4 text-lg font-medium">Email</h3>
                            <div className="flex flex-wrap items-center gap-x-12 gap-y-4">
                                <div className="basis-full lg:basis-4/12 flex flex-nowrap items-start gap-4">
                                    <div className="grow">
                                        <Field
                                            name="email"
                                            component={FormikInput}
                                            placeholder="Email"
                                            autoComplete="off"
                                            disabled={
                                                isSubmitting || userSettings.isFetching
                                            }
                                        />
                                    </div>
                                    <Button
                                        type="submit"
                                        variant="outline-secondary"
                                        disabled={isSubmitting || userSettings.isFetching}
                                        isLoading={isSubmitting}
                                    >
                                        Save
                                    </Button>
                                </div>
                                <div className="text-sm text-gray-53596d max-w-full lg:max-w-[18em]">
                                    This email is used to send updates about your DAOs
                                </div>
                            </div>
                        </div>
                    </div>

                    <hr className="my-8" />

                    <div>
                        <h1 className="mb-6 first-line:text-xl font-medium">
                            App notifications
                        </h1>
                        <div>
                            <Field
                                name="app_enabled"
                                type="checkbox"
                                component={FormikCheckbox}
                                inputProps={{
                                    label: 'Receive notifications in app',
                                }}
                                disabled={isSubmitting || userSettings.isFetching}
                                onChange={() => {
                                    const value = !values.app_enabled
                                    setFieldValue('app_enabled', value)
                                    onSaveSubmit({ app_enabled: value })
                                }}
                            />
                        </div>
                    </div>
                </Form>
            )}
        </Formik>
    )
}

export default AccountNotificationsPage
