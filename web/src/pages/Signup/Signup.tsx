import { useEffect, useState } from 'react'
import { useRecoilState, useResetRecoilState } from 'recoil'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { GoshError, useUser } from 'react-gosh'
import Spinner from '../../components/Spinner'
import { toast } from 'react-toastify'
import ToastError from '../../components/Error/ToastError'
import GithubOrganizations from './GithubOrganizations'
import { oAuthSessionAtom, signupStepAtom } from '../../store/signup.state'
import GoshSignupUsername from './GoshSignupUsername'
import { supabase } from '../../helpers'
import GoshSignupStart from './GoshSignupStart'
import GoshSignupPhrase from './GoshSignupPhrase'

const SignupPage = () => {
    const location = useLocation()
    const navigate = useNavigate()
    const { persist } = useUser()
    const [oAuthSession, setOAuthSession] = useRecoilState(oAuthSessionAtom)
    const resetOAuthSession = useResetRecoilState(oAuthSessionAtom)
    const [step, setStep] = useRecoilState(signupStepAtom)
    const [phrase, setPhrase] = useState<string[]>([])

    const signinOAuth = async () => {
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'github',
                options: {
                    redirectTo: document.location.href,
                    scopes: 'read:user read:org',
                },
            })
            if (error) throw new GoshError(error.message)
        } catch (e: any) {
            console.error(e.message)
            toast.error(<ToastError error={e} />)
        }
    }

    const signoutOAuth = async () => {
        try {
            const { error } = await supabase.auth.signOut()
            if (error) throw new GoshError(error.message)
            resetOAuthSession()
        } catch (e: any) {
            console.error(e.message)
            toast.error(<ToastError error={e} />)
        }
    }

    useEffect(() => {
        const _getGitUserSession = async () => {
            setOAuthSession({ session: null, isLoading: true })
            const { data } = await supabase.auth.getSession()
            setOAuthSession({ session: data.session, isLoading: false })
        }

        _getGitUserSession()
    }, [setOAuthSession])

    useEffect(() => {
        setStep((state) => {
            const { isLoading, session } = oAuthSession
            if (isLoading) return undefined
            if (!session) return { index: 0 }
            return !state ? { index: 1 } : state
        })
    }, [oAuthSession, setStep])

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

    if (persist.pin) return <Navigate to="/a/orgs" />
    return (
        <div className="container">
            {oAuthSession.isLoading && (
                <div className="text-gray-606060 text-sm py-3">
                    <Spinner className="mr-3" />
                    Please, wait...
                </div>
            )}

            {step?.index === 0 && <GoshSignupStart signinOAuth={signinOAuth} />}
            {step?.index === 1 && <GithubOrganizations signoutOAuth={signoutOAuth} />}
            {step?.index === 2 && (
                <GoshSignupPhrase phrase={phrase} setPhrase={setPhrase} />
            )}
            {step?.index === 3 && (
                <GoshSignupUsername phrase={phrase} signoutOAuth={signoutOAuth} />
            )}
        </div>
    )
}

export default SignupPage
