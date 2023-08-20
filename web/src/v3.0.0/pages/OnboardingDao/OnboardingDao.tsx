import { useEffect, useState } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { Buffer } from 'buffer'
import GoshPhrase from './components/GoshPhrase'
import GoshUsername from './components/GoshUsername'
import DaoInvitationSubmit from './components/InvitationSubmit'
import GoshPhraseCheck from './components/GoshPhraseCheck'
import { useDao, useDaoMember } from '../../hooks/dao.hooks'
import { supabase } from '../../../supabase'
import Loader from '../../../components/Loader'
import { useUser } from '../../hooks/user.hooks'
import Alert from '../../../components/Alert/Alert'

const OnboardingDaoPage = () => {
    const [searchParams] = useSearchParams()
    const { user } = useUser()
    const dao = useDao()
    const member = useDaoMember()
    const [token, setToken] = useState<{
        isFetching: boolean
        isValid: boolean
        id: string | null
        data: any
    }>({ isFetching: true, isValid: false, id: null, data: null })
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
            if (!dao.details.name) {
                return
            }

            setToken((state) => ({ ...state, isFetching: true }))

            const token = searchParams.get('token')
            if (!token) {
                setToken((state) => ({ ...state, isFetching: false, isValid: false }))
                return
            }

            const { data: row, error } = await supabase.client
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
            setStep(user.profile ? 'submit' : 'phrase')
        }
    }, [token.isFetching, token.isValid, user.profile])

    if (member.isMember) {
        return <Navigate to={`/o/${dao.details.name}`} />
    }
    return (
        <>
            <h3 className="text-2xl font-medium mb-9">You were invited to this DAO</h3>
            {token.isFetching && <Loader>Check invitation token, please, wait...</Loader>}
            {!token.isFetching && !token.isValid && (
                <Alert variant="danger" className="text-sm">
                    Invitation token is incorrect or expired
                </Alert>
            )}
            {!token.isFetching && token.isValid && (
                <>
                    {step === 'phrase' && (
                        <GoshPhrase
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
