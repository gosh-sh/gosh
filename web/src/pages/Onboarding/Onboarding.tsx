import { useEffect } from 'react'
import { useUser } from 'react-gosh'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { useRecoilState, useResetRecoilState } from 'recoil'
import { ToastError } from '../../components/Toast'
import Spinner from '../../components/Spinner'
import { signoutOAuthSupabase, singinOAuthSupabase, supabase } from '../../helpers'
import { OAuthSessionAtom, onboardingDataAtom } from '../../store/onboarding.state'
import GithubOrganizations from './components/GithubOrganizations'
import GoshPhrase from './components/GoshPhrase'
import OAuthSignin from './components/OAuthSignin'
import GoshUsername from './components/GoshUsername'
import GoshDaoInvites from './components/GoshDaoInvites'
import GoshPhraseCheck from './components/GoshPhraseCheck'

const OnboardingPage = () => {
    const location = useLocation()
    const navigate = useNavigate()
    const { persist } = useUser()
    const [oauth, setOAuth] = useRecoilState(OAuthSessionAtom)
    const resetOAuth = useResetRecoilState(OAuthSessionAtom)
    const [data, setData] = useRecoilState(onboardingDataAtom)

    const signinOAuth = async () => {
        try {
            await singinOAuthSupabase('github')
        } catch (e: any) {
            console.error(e.message)
            toast.error(<ToastError error={e} />)
        }
    }

    const signoutOAuth = async () => {
        try {
            await signoutOAuthSupabase()
            resetOAuth()
        } catch (e: any) {
            console.error(e.message)
            toast.error(<ToastError error={e} />)
        }
    }

    useEffect(() => {
        const _getOAuthSession = async () => {
            setOAuth({ session: null, isLoading: true })
            const { data } = await supabase.auth.getSession()
            setOAuth({ session: data.session, isLoading: false })
        }

        _getOAuthSession()
    }, [setOAuth])

    useEffect(() => {
        if (!data.redirectTo) {
            setData((state) => {
                const { isLoading, session } = oauth
                if (isLoading) {
                    return { ...state, step: undefined }
                }
                if (!session) {
                    return { ...state, step: 'signin' }
                }
                return { ...state, step: state.step || 'invites' }
            })
        }
    }, [oauth, data.redirectTo, setData])

    useEffect(() => {
        const params = new URLSearchParams(location.search)
        if (params.get('error')) {
            const e = {
                title: params.get('error'),
                message: params.get('error_description'),
            }
            toast.error(<ToastError error={e} />)
            navigate('/')
        }
    }, [location.search, navigate])

    if (data.redirectTo) {
        return <Navigate to={data.redirectTo} replace />
    }
    if (persist.pin) {
        return <Navigate to="/a/orgs" replace />
    }
    return (
        <div className="container">
            {oauth.isLoading && (
                <div className="text-gray-606060 text-sm py-3">
                    <Spinner className="mr-3" />
                    Please, wait...
                </div>
            )}

            {data.step === 'signin' && <OAuthSignin signinOAuth={signinOAuth} />}
            {data.step === 'invites' && <GoshDaoInvites signoutOAuth={signoutOAuth} />}
            {data.step === 'organizations' && (
                <GithubOrganizations signoutOAuth={signoutOAuth} />
            )}
            {data.step === 'phrase' && <GoshPhrase />}
            {data.step === 'phrase-check' && <GoshPhraseCheck />}
            {data.step === 'username' && <GoshUsername signoutOAuth={signoutOAuth} />}
        </div>
    )
}

export default OnboardingPage