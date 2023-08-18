import { Form, Formik } from 'formik'
import { Button } from '../../../../components/Form'
import OAuthProfile from '../../Onboarding/components/OAuthProfile'
import { TOnboardingStatusDao } from '../../../types/onboarding.types'
import { TOAuthSession } from '../../../types/oauth.types'

type TProfileProps = {
    oauth: TOAuthSession
    data: TOnboardingStatusDao[]
    onSignin(): Promise<void>
    onSignout(): Promise<void>
    onSubmit(): Promise<void>
}

const Profile = (props: TProfileProps) => {
    const { oauth, data, onSignin, onSignout, onSubmit } = props

    const isDataValid = data
        .map((item) => {
            if (item.validated && !item.validated.valid) {
                return false
            }
            return !item.repos.some((repo) => repo.validated?.valid === false)
        })
        .every((item) => !!item)

    if (oauth.isLoading) {
        return null
    }
    if (!oauth.isLoading && !oauth.session) {
        return (
            <>
                <div className="mb-8 text-3xl font-medium">
                    Please, sign in with your Github account
                </div>
                <div className="text-center">
                    <Button type="button" size="xl" onClick={onSignin}>
                        Sign in with Github
                    </Button>
                </div>
            </>
        )
    }
    return (
        <>
            <div className="mb-6">
                <OAuthProfile oauth={oauth} onSignout={onSignout} />
            </div>
            <div className="mb-8 text-3xl font-medium">
                Please, rename organizations and repositories with errors
            </div>

            <Formik onSubmit={onSubmit} initialValues={{}}>
                {({ isSubmitting }) => (
                    <Form>
                        <div className="text-center">
                            <Button
                                type="submit"
                                size="xl"
                                disabled={!isDataValid || isSubmitting}
                                isLoading={isSubmitting}
                            >
                                Save changes
                            </Button>
                        </div>
                    </Form>
                )}
            </Formik>
        </>
    )
}

export default Profile
