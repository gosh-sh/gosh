import Spinner from '../../components/Spinner'
import { useDaoMemberList, useDaoMemberDelete } from 'react-gosh'
import DaoMemberListItem from './MemberListItem'
import { useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { TDaoLayoutOutletContext } from '../DaoLayout'
import DaoMemberForm from './MemberForm'
import { toast } from 'react-toastify'
import ToastError from '../../components/Error/ToastError'
import DaoMemberInvites from './MemberInvites'
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../helpers'
import { EDaoInviteStatus } from '../../store/onboarding.types'

export type TDaoInvite = {
    id: string
    recipientEmail: string
    recipientStatus: string | null
    recipientUsername: string
    isFetching: boolean
}

const DaoMembersPage = () => {
    const { daoName } = useParams()
    const navigate = useNavigate()
    const { dao } = useOutletContext<TDaoLayoutOutletContext>()
    const deleteDaoMember = useDaoMemberDelete(dao.adapter)
    const { items, isFetching, search, setSearch, getItemDetails } = useDaoMemberList(
        dao.adapter,
        0,
    )
    const [invites, setInvites] = useState<{
        items: TDaoInvite[]
        isFetching: boolean
    }>({
        items: [],
        isFetching: false,
    })

    const getDaoInvites = useCallback(async () => {
        setInvites((state) => ({ ...state, isFetching: true }))
        try {
            const { data, error } = await supabase
                .from('dao_invite')
                .select(`id,recipient_email,recipient_status,recipient_username`)
                .eq('dao_name', daoName)
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
                    recipientUsername: item.recipient_username || item.recipient_email,
                    isFetching: false,
                })),
            }))
        } catch (e: any) {
            console.error(e.message)
            toast.error(<ToastError error={e} />)
        } finally {
            setInvites((state) => ({ ...state, isFetching: false }))
        }
    }, [daoName])

    const onMemberDelete = async (username: string) => {
        if (window.confirm('Delete member?')) {
            try {
                await deleteDaoMember.remove([username])
                navigate(`/o/${daoName}/events`)
            } catch (e: any) {
                console.error(e.message)
                toast.error(<ToastError error={e} />)
            }
        }
    }

    useEffect(() => {
        getDaoInvites()
    }, [getDaoInvites])

    return (
        <>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <h1 className="text-xl font-medium grow sm:grow-0">Members</h1>
                <div className="input grow">
                    <input
                        className="element !py-2 !text-sm"
                        type="search"
                        placeholder="Search member by profile..."
                        autoComplete="off"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <div className="w-full sm:w-auto">
                    <a
                        href="#create-member-anchor"
                        className="block btn btn--body !px-3 !py-1.5 w-full text-center"
                    >
                        Create member
                    </a>
                </div>
            </div>

            <div className="mt-8 mb-2">
                <div className="border rounded-xl px-1 py-2 overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="text-gray-7c8db5 text-left text-xs">
                                <th className="font-normal px-3 py-2 w-4/12">name</th>
                                <th className="font-normal px-3 py-2">balance</th>
                                <th className="font-normal px-3 py-2 w-3/12">profile</th>
                                <th className="font-normal px-3 py-2 w-3/12">wallet</th>
                                <th className="font-normal px-3 py-2"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {isFetching && (
                                <tr className="text-gray-606060 text-sm">
                                    <td colSpan={5} className="px-3 py-2">
                                        <Spinner className="mr-3" />
                                        Loading members...
                                    </td>
                                </tr>
                            )}

                            {items.map((item, index) => {
                                getItemDetails(item)
                                return (
                                    <DaoMemberListItem
                                        key={index}
                                        item={item}
                                        owner={dao.details.owner}
                                        isAuthMember={dao.details.isAuthMember}
                                        isFetching={deleteDaoMember.isFetching(item.name)}
                                        onDelete={onMemberDelete}
                                    />
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="mt-6 flex flex-wrap items-start gap-y-6 gap-x-4">
                <div
                    id="create-member-anchor"
                    className="border rounded-xl p-5 md:p-8 basis-full lg:basis-5/12"
                >
                    <DaoMemberForm dao={dao.adapter} getDaoInvites={getDaoInvites} />
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
        </>
    )
}

export default DaoMembersPage
