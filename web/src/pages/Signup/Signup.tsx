import { useEffect, useState } from 'react'
import { useRecoilState } from 'recoil'
import { Navigate } from 'react-router-dom'
import { GoshError, useUser } from 'react-gosh'
import Spinner from '../../components/Spinner'
import { toast } from 'react-toastify'
import ToastError from '../../components/Error/ToastError'
import GithubOrganizations from './GithubOrganizations'
import { githubSessionAtom, signupStepAtom } from '../../store/signup.state'
import GithubRepositories from './GithubRepositories'
import GoshSignupUsername from './GoshSignupUsername'
import { supabase } from '../../helpers'
import GoshSignupComplete from './GoshSignupComplete'
import GoshSignupStart from './GoshSignupStart'
import GoshSignupPhrase from './GoshSignupPhrase'

const SignupPage = () => {
    const { persist } = useUser()
    const [githubSession, setGithubSession] = useRecoilState(githubSessionAtom)
    const [step, setStep] = useRecoilState(signupStepAtom)
    const [phrase, setPhrase] = useState<string>('')

    const signinGithub = async () => {
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

    const signoutGithub = async () => {
        try {
            const { error } = await supabase.auth.signOut()
            if (error) throw new GoshError(error.message)
            setGithubSession({ session: null, isLoading: false })
        } catch (e: any) {
            console.error(e.message)
            toast.error(<ToastError error={e} />)
        }
    }

    useEffect(() => {
        const _getGitUserSession = async () => {
            setGithubSession({ session: null, isLoading: true })
            const { data } = await supabase.auth.getSession()
            setGithubSession({ session: data.session, isLoading: false })
        }

        _getGitUserSession()
    }, [setGithubSession])

    useEffect(() => {
        setStep((state) => {
            const { isLoading, session } = githubSession
            if (isLoading) return undefined
            if (!session) return { index: 0 }
            return !state ? { index: 1 } : state
        })
    }, [githubSession, setStep])

    if (persist.pin) return <Navigate to="/a/orgs" />
    return (
        <div className="container">
            {githubSession.isLoading && (
                <div className="text-gray-606060 text-sm py-3">
                    <Spinner className="mr-3" />
                    Please, wait...
                </div>
            )}

            {step?.index === 0 && <GoshSignupStart signinGithub={signinGithub} />}
            {step?.index === 1 && <GithubOrganizations signoutGithub={signoutGithub} />}
            {step?.index === 2 && <GithubRepositories {...step.data} />}
            {step?.index === 3 && (
                <GoshSignupPhrase phrase={phrase} setPhrase={setPhrase} />
            )}
            {step?.index === 4 && (
                <GoshSignupUsername phrase={phrase} signoutGithub={signoutGithub} />
            )}
            {step?.index === 5 && <GoshSignupComplete {...step.data} />}
        </div>
    )
}

export default SignupPage
