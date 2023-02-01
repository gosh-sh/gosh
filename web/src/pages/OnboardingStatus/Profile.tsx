import { faArrowRightFromBracket } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Form, Formik } from 'formik'
import { useRecoilValue } from 'recoil'
import Spinner from '../../components/Spinner'
import { OAuthSessionAtom } from '../../store/onboarding.state'
import { TOnboardingDao } from './OnboardingStatus'

type TProfileProps = {
    data: TOnboardingDao[]
    signinOAuth(): Promise<void>
    signoutOAuth(): Promise<void>
    onSubmit(): Promise<void>
}

const Profile = (props: TProfileProps) => {
    const { data, signinOAuth, signoutOAuth, onSubmit } = props
    const oAuthSession = useRecoilValue(OAuthSessionAtom)

    const isDataValid = data
        .map((item) => {
            if (item.validated && !item.validated.valid) {
                return false
            }
            return !item.repos.some((repo) => repo.validated?.valid === false)
        })
        .every((item) => !!item)

    if (oAuthSession.isLoading) {
        return null
    }
    if (!oAuthSession.isLoading && !oAuthSession.session) {
        return (
            <>
                <p className="aside-step__text">
                    Please, sign in with your Github account
                </p>

                <button
                    type="button"
                    className="aside-step__btn-upload"
                    onClick={signinOAuth}
                >
                    Sign in with Github
                </button>
            </>
        )
    }
    return (
        <>
            <div className="aside-step__header">
                <button
                    type="button"
                    className="aside-step__btn-signout"
                    onClick={signoutOAuth}
                >
                    <div className="aside-step__btn-signout-slide">
                        <span className="aside-step__btn-signout-user">
                            Hey, {oAuthSession.session?.user.user_metadata.name}
                        </span>
                        <span className="aside-step__btn-signout-text">Sign out</span>
                    </div>
                    <FontAwesomeIcon
                        icon={faArrowRightFromBracket}
                        size="lg"
                        className="aside-step__btn-signout-icon"
                    />
                </button>
            </div>

            <p className="aside-step__text">
                Please, rename organizations and repositories with errors
            </p>

            <Formik onSubmit={onSubmit} initialValues={{}}>
                {({ isSubmitting }) => (
                    <Form>
                        <button
                            type="submit"
                            className="aside-step__btn-upload"
                            disabled={!isDataValid || isSubmitting}
                        >
                            {isSubmitting && <Spinner size="lg" className="mr-2" />}
                            Save changes
                        </button>
                    </Form>
                )}
            </Formik>
        </>
    )
}

export default Profile
