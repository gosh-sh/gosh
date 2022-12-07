import { useEffect } from 'react'
import { useRecoilState } from 'recoil'
import { Navigate } from 'react-router-dom'
import { GoshError, useUser } from 'react-gosh'
import Spinner from '../../components/Spinner'
import { toast } from 'react-toastify'
import ToastError from '../../components/Error/ToastError'
import GithubOrganizations from './GithubOrganizations'
import { githubSessionAtom, signupStepAtom } from '../../store/signup.state'
import GithubRepositories from './GithubRepositories'
import GoshSignup from './GoshSignup'
import { supabase } from '../../helpers'
import GoshSignupComplete from './GoshSignupComplete'

const SignupPage = () => {
    const { persist } = useUser()
    const [githubSession, setGithubSession] = useRecoilState(githubSessionAtom)
    const [step, setStep] = useRecoilState(signupStepAtom)

    const signinGithub = async () => {
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'github',
                options: {
                    redirectTo: document.location.href,
                    scopes: 'user read:org',
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
            return !state ? { index: 1, data: { session } } : state
        })
    }, [githubSession, setStep])

    if (persist.pin) return <Navigate to="/a/orgs" />
    return (
        <div className="block-auth">
            <h1 className="px-2 text-center font-bold text-32px sm:text-5xl leading-117%">
                Create Gosh account
            </h1>

            {githubSession.isLoading && (
                <div className="text-gray-606060 text-sm py-3">
                    <Spinner className="mr-3" />
                    Please, wait...
                </div>
            )}

            {githubSession.session && (
                <div className="py-3 px-5">
                    Hello, {githubSession.session.user.user_metadata.name}
                    <button
                        type="button"
                        className="btn btn--body px-2 py-1.5 text-sm ml-2"
                        onClick={signoutGithub}
                    >
                        Signout
                    </button>
                </div>
            )}

            {step?.index === 0 && (
                <div className="text-center">
                    <button
                        type="button"
                        className="btn btn--body py-3 px-5 text-xl leading-normal"
                        onClick={signinGithub}
                    >
                        Signin with Github
                    </button>
                </div>
            )}

            {step?.index === 1 && <GithubOrganizations />}
            {step?.index === 2 && <GithubRepositories {...step.data} />}
            {step?.index === 3 && <GoshSignup signoutGithub={signoutGithub} />}
            {step?.index === 4 && <GoshSignupComplete />}
        </div>
    )
}

export default SignupPage
