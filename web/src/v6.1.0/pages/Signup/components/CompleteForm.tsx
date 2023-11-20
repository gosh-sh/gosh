import { Form, Formik } from 'formik'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../../../components/Form'
import { PERSIST_REDIRECT_KEY } from '../../../../constants'
import { useOauth } from '../../../hooks/oauth.hooks'
import { useUserSignup } from '../../../hooks/user.hooks'

const CompleteForm = () => {
    const navigate = useNavigate()
    const { oauth } = useOauth()
    const { submitCompleteStep } = useUserSignup()
    const [isAnySubmitting, setIsAnySubmitting] = useState<boolean>(false)

    const is_github =
        oauth.session?.user.identities?.find(({ id }) => {
            return id === oauth.session?.user.user_metadata.provider_id
        })?.provider === 'github'

    const onGithubSubmit = async () => {
        try {
            setIsAnySubmitting(true)
            await submitCompleteStep({ provider: true })
        } catch (e: any) {
            console.error(e.message)
        } finally {
            setIsAnySubmitting(false)
        }
    }

    const onSkipSubmit = async () => {
        try {
            setIsAnySubmitting(true)
            await submitCompleteStep({ provider: false })

            const redirect = localStorage.getItem(PERSIST_REDIRECT_KEY)
            localStorage.removeItem(PERSIST_REDIRECT_KEY)
            navigate(redirect || '/a/orgs')
        } catch (e: any) {
            console.error(e.message)
        } finally {
            setIsAnySubmitting(false)
        }
    }

    return (
        <div className="max-w-lg mx-auto">
            <div className="w-32 mx-auto">
                <img
                    src={is_github ? '/images/github.webp' : '/images/success-green.webp'}
                    alt="Almost there"
                />
            </div>
            <div className="mt-7 text-3xl font-medium leading-10 text-center">
                {is_github
                    ? 'Do you want to upload your repository from GitHub'
                    : 'Almost there'}
            </div>
            <div className="mt-10 w-full max-w-xs mx-auto flex flex-col gap-y-4">
                {is_github && (
                    <div>
                        <Formik initialValues={{}} onSubmit={onGithubSubmit}>
                            {({ isSubmitting }) => (
                                <Form>
                                    <Button
                                        type="submit"
                                        size="xl"
                                        className="w-full"
                                        disabled={isSubmitting || isAnySubmitting}
                                        isLoading={isSubmitting}
                                    >
                                        Upload repository from GitHub
                                    </Button>
                                </Form>
                            )}
                        </Formik>
                    </div>
                )}

                <div>
                    <Formik initialValues={{}} onSubmit={onSkipSubmit}>
                        {({ isSubmitting }) => (
                            <Form>
                                <Button
                                    type="submit"
                                    variant="outline-secondary"
                                    size="xl"
                                    className="w-full"
                                    disabled={isSubmitting || isAnySubmitting}
                                    isLoading={isSubmitting}
                                >
                                    {is_github ? 'No, thanks' : 'Create DAO and complete'}
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
