import { faRotateRight } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { classNames, useDaoMemberCreate } from 'react-gosh'
import { IGoshDaoAdapter } from 'react-gosh/dist/gosh/interfaces'
import { toast } from 'react-toastify'
import ToastError from '../../components/Error/ToastError'
import Spinner from '../../components/Spinner'
import { supabase } from '../../helpers'
import { EDaoInviteStatus } from '../../store/onboarding.types'
import { TDaoInvite } from './DaoMembers'

type TDaoMemberInvitesProps = {
    dao: IGoshDaoAdapter
    invites: { items: TDaoInvite[]; isFetching: boolean }
    setInvites: React.Dispatch<
        React.SetStateAction<{ items: TDaoInvite[]; isFetching: boolean }>
    >
    getDaoInvites(): Promise<void>
}

const DaoMemberInvites = (props: TDaoMemberInvitesProps) => {
    const { dao, invites, setInvites, getDaoInvites } = props
    const createDaoMember = useDaoMemberCreate(dao)

    const onInviteRevoke = async (item: any) => {
        setInvites((state) => ({
            ...state,
            items: state.items.map((i) => {
                return i.id !== item.id ? i : { ...item, isFetching: true }
            }),
        }))

        try {
            // Update database
            const { error } = await supabase
                .from('dao_invite')
                .update({ recipient_status: EDaoInviteStatus.REVOKED })
                .eq('id', item.id)
            if (error) {
                throw new Error(error.message)
            }
            setInvites((state) => ({
                ...state,
                items: state.items.filter((i) => i.id !== item.id),
            }))
        } catch (e: any) {
            console.error(e.message)
            toast.error(<ToastError error={e} />)
            setInvites((state) => ({
                ...state,
                items: state.items.map((i) => {
                    return i.id !== item.id ? i : { ...item, isFetching: false }
                }),
            }))
        }
    }

    const onInviteProposalCreate = async (item: any) => {
        setInvites((state) => ({
            ...state,
            items: state.items.map((i) => {
                return i.id !== item.id ? i : { ...item, isFetching: true }
            }),
        }))

        try {
            // Create proposal for add member
            await createDaoMember([item.recipientUsername])

            // Update database
            const { error } = await supabase
                .from('dao_invite')
                .update({ recipient_status: EDaoInviteStatus.PROPOSAL_CREATED })
                .eq('id', item.id)
            if (error) {
                throw new Error(error.message)
            }
            setInvites((state) => ({
                ...state,
                items: state.items.filter((i) => i.id !== item.id),
            }))
        } catch (e: any) {
            console.error(e.message)
            toast.error(<ToastError error={e} />)
            setInvites((state) => ({
                ...state,
                items: state.items.map((i) => {
                    return i.id !== item.id ? i : { ...item, isFetching: false }
                }),
            }))
        }
    }

    return (
        <div className="flex flex-col h-full">
            <div className="p-5 grow overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="text-gray-7c8db5 text-left text-xs">
                            <th className="font-normal w-1/2">Invited user</th>
                            <th className="font-normal px-3">Status</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {!invites.items.length && (
                            <tr>
                                <td colSpan={3} className="text-sm text-gray-7c8db5 pt-3">
                                    There are no unprocessed invites
                                </td>
                            </tr>
                        )}

                        {invites.items.map((item, index) => (
                            <tr key={index}>
                                <td className="py-2">{item.recipientUsername}</td>
                                <td className="py-2 px-3 text-gray-7c8db5 font-light text-sm">
                                    {item.recipientStatus || 'pending'}
                                </td>
                                <td className="py-2">
                                    {!item.recipientStatus && (
                                        <button
                                            type="button"
                                            className={classNames(
                                                'btn text-sm text-rose-600/60',
                                                'hover:text-rose-600 disabled:text-rose-600/20',
                                            )}
                                            disabled={item.isFetching}
                                            onClick={() => onInviteRevoke(item)}
                                        >
                                            Revoke
                                        </button>
                                    )}
                                    {item.recipientStatus ===
                                        EDaoInviteStatus.ACCEPTED && (
                                        <button
                                            type="button"
                                            className={classNames(
                                                'btn text-sm text-green-800/60',
                                                'hover:text-green-800 disabled:text-green-800/20',
                                            )}
                                            disabled={item.isFetching}
                                            onClick={() => onInviteProposalCreate(item)}
                                        >
                                            Proposal
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div>
                <button
                    type="button"
                    className="block bg-gray-fafafd text-gray-7c8db5 text-center w-full py-3"
                    onClick={getDaoInvites}
                    disabled={invites.isFetching}
                >
                    {invites.isFetching ? (
                        <Spinner className="icon" />
                    ) : (
                        <FontAwesomeIcon icon={faRotateRight} className="icon" />
                    )}
                    <span className="ml-3">Refresh</span>
                </button>
            </div>
        </div>
    )
}

export default DaoMemberInvites
