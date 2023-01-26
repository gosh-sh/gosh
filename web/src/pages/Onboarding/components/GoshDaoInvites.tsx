import { faRotateRight } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useCallback, useEffect } from 'react'
import { classNames } from 'react-gosh'
import { useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil'
import Spinner from '../../../components/Spinner'
import { supabase } from '../../../helpers'
import {
    daoInvitesSelector,
    OAuthSessionAtom,
    onboardingDataAtom,
} from '../../../store/onboarding.state'
import ListEmpty from './ListEmpty'
import emptylogo from '../../../assets/images/emptylogo.svg'
import { TOnboardingInvite } from '../../../store/onboarding.types'
import OAuthProfile from './OAuthProfile'
import { toast } from 'react-toastify'
import ToastError from '../../../components/Error/ToastError'

type TGoshDaoInvitesProps = {
    signoutOAuth(): Promise<void>
}

const GoshDaoInvites = (props: TGoshDaoInvitesProps) => {
    const { signoutOAuth } = props
    const { session } = useRecoilValue(OAuthSessionAtom)
    const setOnboarding = useSetRecoilState(onboardingDataAtom)
    const [invites, setInvites] = useRecoilState(daoInvitesSelector)

    const onContinueClick = useCallback(() => {
        setOnboarding((state) => ({ ...state, step: 'organizations' }))
    }, [setOnboarding])

    const onChangeStatusClick = (status: boolean, item: TOnboardingInvite) => {
        setInvites((state) => ({
            ...state,
            items: state.items.map((i) => {
                if (i.id !== item.id) {
                    return i
                }
                return { ...item, accepted: status }
            }),
        }))
    }

    const getDaoInvites = useCallback(async () => {
        if (!session) {
            return
        }

        setInvites((state) => ({ ...state, isFetching: true }))
        const { data, error } = await supabase
            .from('dao_invite')
            .select('id, dao_name')
            .eq('recipient_email', session.user.email)
            .is('recipient_status', null)
        if (error) {
            console.error(error.message)
            toast.error(<ToastError error={error.message} />)
            return
        }

        // If there are no invites, go to next step automatically
        if (!data || !data.length) {
            setInvites({ items: [], isFetching: false })
            onContinueClick()
            return
        }

        // Set fetched invites to state
        setInvites((state) => ({
            ...state,
            items: data.map((item) => {
                const found = state.items.find((i) => i.id === item.id)
                if (found) {
                    return found
                }
                return { id: item.id, daoName: item.dao_name, accepted: null }
            }),
            isFetching: false,
        }))
    }, [session, setInvites, onContinueClick])

    useEffect(() => {
        getDaoInvites()
    }, [])

    if (!session) return null
    return (
        <div className="signup signup--organizations">
            <div className="signup__aside signup__aside--step aside-step">
                <div className="aside-step__header">
                    <OAuthProfile onSignout={signoutOAuth} />
                </div>

                <p className="aside-step__text">
                    Checkout your pending invites to DAOs on GOSH
                </p>

                <button
                    type="button"
                    className="aside-step__btn-upload"
                    onClick={onContinueClick}
                    disabled={!!invites.items.filter((i) => i.accepted === null).length}
                >
                    Continue
                </button>
            </div>
            <div className="signup__content">
                <div className="signup__reload-items">
                    <button
                        type="button"
                        disabled={invites.isFetching}
                        onClick={getDaoInvites}
                    >
                        {invites.isFetching ? (
                            <Spinner size="xs" className="icon" />
                        ) : (
                            <FontAwesomeIcon icon={faRotateRight} className="icon" />
                        )}
                        Refresh
                    </button>
                </div>

                {!invites.isFetching && !invites.items.length && (
                    <ListEmpty>You have no pending invites to DAOs on GOSH</ListEmpty>
                )}

                {invites.items.map((item, index) => {
                    return (
                        <div key={index} className="signup__orgitem orgitem">
                            <div className="orgitem__main hover:!bg-white hover:!cursor-auto">
                                <div className="orgitem__media">
                                    <img src={emptylogo} alt="Avatar" />
                                </div>
                                <div className="orgitem__content">
                                    <div className="orgitem__header">
                                        <div className="orgitem__title">
                                            {item.daoName}
                                        </div>
                                    </div>
                                    <div className="orgitem__description text-right">
                                        <button
                                            type="button"
                                            className={classNames(
                                                'btn text-green-800 mr-4 px-2 py-1',
                                                'hover:bg-green-800 hover:text-white',
                                                item.accepted === true
                                                    ? 'bg-green-800 !text-white'
                                                    : null,
                                            )}
                                            onClick={() => {
                                                onChangeStatusClick(true, item)
                                            }}
                                        >
                                            Accept
                                        </button>
                                        <button
                                            type="button"
                                            className={classNames(
                                                'btn text-rose-600 px-2 py-1',
                                                'hover:bg-rose-600 hover:text-white',
                                                item.accepted === false
                                                    ? 'bg-rose-600 !text-white'
                                                    : null,
                                            )}
                                            onClick={() => {
                                                onChangeStatusClick(false, item)
                                            }}
                                        >
                                            Reject
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

export default GoshDaoInvites
