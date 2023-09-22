import { Form, Formik } from 'formik'
import { Button } from '../../../../components/Form'
import { useUserSignup } from '../../../hooks/user.hooks'
import { useNavigate } from 'react-router-dom'

const CompleteForm = () => {
    const navigate = useNavigate()
    const { updateCompleteStep } = useUserSignup()

    const onGithubSubmit = async () => {
        try {
            await updateCompleteStep({ provider: 'github' })
        } catch (e: any) {
            console.error(e.message)
        }
    }

    const onSkipSubmit = async () => {
        try {
            await updateCompleteStep({ provider: null })
            navigate('/a/orgs')
        } catch (e: any) {
            console.error(e.message)
        }
    }

    return (
        <div className="max-w-lg mx-auto">
            <div className="w-32 mx-auto">
                <img src="/images/github.webp" alt="Github" />
            </div>
            <div className="mt-7 text-3xl font-medium leading-10 text-center">
                Do you want to upload your repository from GitHub
            </div>
            <div className="mt-10 w-full max-w-xs mx-auto">
                <div>
                    <Formik initialValues={{}} onSubmit={onGithubSubmit}>
                        {({ isSubmitting }) => (
                            <Form>
                                <Button
                                    type="submit"
                                    size="xl"
                                    className="w-full"
                                    disabled={isSubmitting}
                                    isLoading={isSubmitting}
                                >
                                    Upload repository from GitHub
                                </Button>
                            </Form>
                        )}
                    </Formik>
                </div>
                <div className="mt-4">
                    <Formik initialValues={{}} onSubmit={onSkipSubmit}>
                        {({ isSubmitting }) => (
                            <Form>
                                <Button
                                    type="submit"
                                    variant="outline-secondary"
                                    size="xl"
                                    className="w-full"
                                    disabled={isSubmitting}
                                    isLoading={isSubmitting}
                                >
                                    No, thanks
                                </Button>
                            </Form>
                        )}
                    </Formik>
                </div>
            </div>
        </div>
    )
}

export { CompleteForm }
