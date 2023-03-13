import { useOutletContext } from 'react-router-dom'
import { TDaoLayoutOutletContext } from '../DaoLayout'
import { toast } from 'react-toastify'
import { ToastError } from '../../components/Toast'
import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../../helpers'
import { EDaoInviteStatus } from '../../store/onboarding.types'
import { DaoMemberInvites, DaoMemberList, DaoMemberForm } from './components'
import { shortString } from 'react-gosh'

export type TDaoInvite = {
    id: string
    recipientEmail: string
    recipientStatus: string | null
    recipientUsername: string
    recipientAllowance: number | null
    recipientComment: string | null
    isFetching: boolean
}

const DaoMembersPage = () => {
    const inviteRef = useRef<HTMLDivElement | null>(null)
    const { dao } = useOutletContext<TDaoLayoutOutletContext>()
    const [invites, setInvites] = useState<{
        items: TDaoInvite[]
        isFetching: boolean
    }>({
        items: [],
        isFetching: false,
    })

    const getDaoInvites = useCallback(async () => {
        if (!dao.details.isAuthMember) {
            return
        }

        setInvites((state) => ({ ...state, isFetching: true }))
        try {
            const { data, error } = await supabase
                .from('dao_invite')
                .select(`*`)
                .eq('dao_name', dao.details.name)
                .not('token_expired', 'eq', true)
                .or(
                    [
                        'recipient_status.is.null',
                        `recipient_status.eq.${EDaoInviteStatus.ACCEPTED}`,
                    ].join(','),
                )
            if (error) {
                throw new Error(error.message)
            }

            setInvites((state) => ({
                ...state,
                items: (data || []).map((item) => ({
                    id: item.id,
                    recipientEmail: item.recipient_email,
                    recipientStatus: item.recipient_status,
                    recipientUsername:
                        item.recipient_username ||
                        item.recipient_email ||
                        shortString(item.token, 8, 8),
                    recipientAllowance: item.recipient_allowance,
                    recipientComment: item.recipient_comment,
                    isFetching: false,
                })),
            }))
        } catch (e: any) {
            console.error(e.message)
            toast.error(<ToastError error={e} />)
        } finally {
            setInvites((state) => ({ ...state, isFetching: false }))
        }
    }, [dao.details.name, dao.details.isAuthMember])

    const scrollToInviteRef = () => {
        inviteRef.current?.scrollIntoView({
            behavior: 'smooth',
            inline: 'center',
        })
    }

    useEffect(() => {
        getDaoInvites()
    }, [getDaoInvites])

    return (
        <>
            <DaoMemberList dao={dao} scrollToInviteRef={scrollToInviteRef} />

            {dao.details.isAuthMember && (
                <div
                    className="mt-6 flex flex-wrap items-start gap-y-6 gap-x-4"
                    ref={(ref) => {
                        inviteRef.current = ref
                    }}
                >
                    <div className="border rounded-xl p-5 md:p-8 basis-full lg:basis-5/12">
                        <DaoMemberForm dao={dao} getDaoInvites={getDaoInvites} />
                    </div>
                    <div className="border rounded-xl overflow-hidden grow lg:basis-6/12">
                        <DaoMemberInvites
                            dao={dao.adapter}
                            invites={invites}
                            setInvites={setInvites}
                            getDaoInvites={getDaoInvites}
                        />
                    </div>
                </div>
            )}
        </>
    )
}

export default DaoMembersPage
