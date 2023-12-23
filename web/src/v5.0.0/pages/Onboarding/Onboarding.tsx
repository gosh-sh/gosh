import { useEffect } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { ToastError } from '../../../components/Toast'
import GithubOrganizations from './components/GithubOrganizations'
import GoshPhrase from './components/GoshPhrase'
import GoshPhraseCheck from './components/GoshPhraseCheck'
import OAuthSignin from './components/OAuthSignin'
import GoshUsername from './components/GoshUsername'
import GoshDaoInvites from './components/GoshDaoInvites'
import { useUser } from '../../hooks/user.hooks'
import Loader from '../../../components/Loader/Loader'
import { useOnboardingData } from '../../hooks/onboarding.hooks'
import { useOauth } from '../../hooks/oauth.hooks'
import { withRouteAnimation } from '../../hocs'

const OnboardingPage = () => {
  const navigate = useNavigate()
  const { persist } = useUser()
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
      navigate('/')
    }
  }, [oauth.error])

  if (data.redirectTo) {
    return <Navigate to={data.redirectTo} replace />
  }
  if (persist.pin) {
    return <Navigate to="/a/orgs" replace />
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
      {data.step === 'phrase' && <GoshPhrase oauth={oauth} />}
      {data.step === 'phrase-check' && <GoshPhraseCheck oauth={oauth} />}
      {data.step === 'username' && (
        <GoshUsername oauth={oauth} signoutOAuth={signoutOAuth} />
      )}
    </div>
  )
}

export default withRouteAnimation(OnboardingPage)
