import { useEffect } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { ToastError } from '../../../components/Toast'
import { useOnboardingData } from '../../hooks/onboarding.hooks'
import { useOauth } from '../../hooks/oauth.hooks'
import { withRouteAnimation } from '../../hocs'
import { useUser } from '../../hooks/user.hooks'
import Loader from '../../../components/Loader'
import { GithubOrganizations, GoshDaoInvites, OAuthSignin } from './components'

const OnboardingPage = () => {
    const navigate = useNavigate()
    const user = useUser()
    const { signin, signout, oauth } = useOauth()
    const { data } = useOnboardingData(oauth)

    const signinOAuth = async () => {
        try {
            await signin('github')
        } catch (e: any) {
            console.error(e.message)
            toast.error(<ToastError error={e} />)
        }
    }

    const signoutOAuth = async () => {
        try {
            await signout()
        } catch (e: any) {
            console.error(e.message)
            toast.error(<ToastError error={e} />)
        }
    }

    useEffect(() => {
        if (oauth.error) {
            toast.error(<ToastError error={oauth.error} />)
            navigate('/onboarding')
        }
    }, [oauth.error])

    if (!user.persist.phrase) {
        return <Navigate to="/a/signin?redirect_to=/onboarding" />
    }

    if (data.redirectTo) {
        return <Navigate to={data.redirectTo} replace />
    }

    return (
        <div className="container pt-20 pb-8">
            {oauth.isLoading && <Loader>Please, wait...</Loader>}

            {data.step === 'signin' && <OAuthSignin signinOAuth={signinOAuth} />}
            {data.step === 'invites' && (
                <GoshDaoInvites oauth={oauth} signoutOAuth={signoutOAuth} />
            )}
            {data.step === 'organizations' && (
                <GithubOrganizations oauth={oauth} signoutOAuth={signoutOAuth} />
            )}
        </div>
    )
}

export default withRouteAnimation(OnboardingPage)
