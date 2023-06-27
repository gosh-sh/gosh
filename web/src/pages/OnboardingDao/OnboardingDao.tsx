import { useEffect, useState } from 'react'
import { Navigate, useOutletContext, useSearchParams } from 'react-router-dom'
import { TDaoLayoutOutletContext } from '../DaoLayout'
import { Buffer } from 'buffer'
import { supabase } from '../../helpers'
import Loader from '../../components/Loader'
import GoshPhrase from './components/GoshPhrase'
import { useUser } from 'react-gosh'
import GoshUsername from './components/GoshUsername'
import DaoInvitationSubmit from './components/InvitationSubmit'
import GoshPhraseCheck from './components/GoshPhraseCheck'

const OnboardingDaoPage = () => {
    const { dao } = useOutletContext<TDaoLayoutOutletContext>()
    const [searchParams] = useSearchParams()
    const { user } = useUser()
    const [token, setToken] = useState<{
        isFetching: boolean
        isValid: boolean
        id: string | null
        data: any
    }>({ isFetching: false, isValid: false, id: null, data: null })
    const [step, setStep] = useState<'phrase' | 'phrase-check' | 'username' | 'submit'>()
    const [signupState, setSignupState] = useState<{
        phrase: string[]
        username: string
    }>({
        phrase: user.phrase ? user.phrase.split(' ') : [],
        username: user.username || '',
    })

    useEffect(() => {
        const _checkInvitationToken = async () => {
            setToken((state) => ({ ...state, isFetching: true }))

            const token = searchParams.get('token')
            if (!token) {
                setToken((state) => ({ ...state, isFetching: false, isValid: false }))
                return
            }

            const { data: row, error } = await supabase
                .from('dao_invite')
                .select('id, token_expired')
                .eq('token', token)
                .single()
            if (error) {
                setToken((state) => ({ ...state, isFetching: false, isValid: false }))
                return
            }
            if (row.token_expired) {
                setToken((state) => ({ ...state, isFetching: false, isValid: false }))
                return
            }

            const data = JSON.parse(Buffer.from(token, 'base64').toString())
            if (data.dao !== dao.details.name) {
                setToken((state) => ({ ...state, isFetching: false, isValid: false }))
                return
            }

            setToken((state) => ({
                ...state,
                isFetching: false,
                isValid: true,
                id: row.id,
                data,
            }))
        }

        _checkInvitationToken()
    }, [searchParams, dao.details.name])

    useEffect(() => {
        if (token.isFetching) {
            return
        }
        if (token.isValid) {
            setStep(dao.details.isAuthenticated ? 'submit' : 'phrase')
        }
    }, [token.isFetching, token.isValid, dao.details.isAuthenticated])

    if (dao.details.isAuthMember) {
        return <Navigate to={`/o/${dao.details.name}`} />
    }
    return (
        <>
            <h3 className="text-2xl font-medium mb-9">You were invited to this DAO</h3>
            {token.isFetching && <Loader>Check invitation token, please, wait...</Loader>}
            {!token.isFetching && !token.isValid && (
                <div className="mb-6 py-3 px-5 bg-red-ff3b30 text-white text-sm rounded-xl">
                    Invitation token is incorrect or expired
                </div>
            )}
            {!token.isFetching && token.isValid && (
                <>
                    {step === 'phrase' && (
                        <GoshPhrase
                            dao={dao.details}
                            signupState={signupState}
                            setSignupState={setSignupState}
                            setStep={setStep}
                        />
                    )}
                    {step === 'phrase-check' && (
                        <GoshPhraseCheck signupState={signupState} setStep={setStep} />
                    )}
                    {step === 'username' && (
                        <GoshUsername
                            signupState={signupState}
                            setSignupState={setSignupState}
                            setStep={setStep}
                        />
                    )}
                    {step === 'submit' && (
                        <DaoInvitationSubmit
                            dao={dao}
                            username={signupState.username}
                            tokenId={token.id!}
                        />
                    )}
                </>
            )}
        </>
    )
}

export default OnboardingDaoPage
