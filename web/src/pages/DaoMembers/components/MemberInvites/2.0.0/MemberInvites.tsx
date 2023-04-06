import { classNames, GoshError, useDaoMemberCreate } from 'react-gosh'
import { IGoshDaoAdapter } from 'react-gosh/dist/gosh/interfaces'
import { toast } from 'react-toastify'
import { ToastError } from '../../../../../components/Toast'
import { Button } from '../../../../../components/Form'
import { supabase } from '../../../../../helpers'
import { EDaoInviteStatus } from '../../../../../store/onboarding.types'
import { TDaoInvite } from '../../../DaoMembers'

type TDaoMemberInvitesProps = {
    dao: IGoshDaoAdapter
    invites: { items: TDaoInvite[]; isFetching: boolean }
    setInvites: React.Dispatch<
        React.SetStateAction<{ items: TDaoInvite[]; isFetching: boolean }>
    >
    revoke(item: TDaoInvite): Promise<void>
}

const DaoMemberInvites = (props: TDaoMemberInvitesProps) => {
    const { dao, invites, setInvites, revoke } = props
    const createDaoMember = useDaoMemberCreate(dao)

    const onInviteProposalCreate = async (item: TDaoInvite) => {
        setInvites((state) => ({
            ...state,
            items: state.items.map((i) => {
                return i.id !== item.id ? i : { ...item, isFetching: true }
            }),
        }))

        try {
            if (!createDaoMember) {
                throw new GoshError('Add DAO member is not supported')
            }

            // Create proposal for add member
            await createDaoMember({
                members: [
                    {
                        user: {
                            name: item.recipientUsername,
                            type: 'user',
                        },
                        allowance: item.recipientAllowance || 0,
                        comment: item.recipientComment || '',
                    },
                ],
            })

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

            toast.success('Proposal created')
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
        <table className="w-full">
            <thead>
                <tr className="text-gray-7c8db5 text-left text-xs">
                    <th className="font-normal w-1/2 whitespace-nowrap">Invited user</th>
                    <th className="font-normal px-3">Karma</th>
                    <th className="font-normal px-3">Status</th>
                    <th></th>
                </tr>
            </thead>
            <tbody>
                {!invites.items.length && (
                    <tr>
                        <td colSpan={4} className="text-sm text-gray-7c8db5 pt-3">
                            There are no unprocessed invites
                        </td>
                    </tr>
                )}

                {invites.items.map((item, index) => (
                    <tr key={index}>
                        <td className="py-2 text-sm">
                            {item.recipientUsername}
                            {item.recipientComment && (
                                <div className="text-xs text-gray-7c8db5">
                                    {item.recipientComment}
                                </div>
                            )}
                        </td>
                        <td className="py-2 px-3 text-sm">{item.recipientAllowance}</td>
                        <td className="py-2 px-3 text-gray-7c8db5 font-light text-sm">
                            {item.recipientStatus || 'pending'}
                        </td>
                        <td className="py-2 text-right">
                            {!item.recipientStatus && (
                                <Button
                                    type="button"
                                    variant="custom"
                                    className={classNames(
                                        '!border-gray-e6edff !py-1 !px-6 text-black',
                                        'hover:bg-gray-fafafd disabled:!opacity-60',
                                    )}
                                    disabled={item.isFetching}
                                    isLoading={item.isFetching}
                                    onClick={() => revoke(item)}
                                >
                                    Revoke
                                </Button>
                            )}
                            {item.recipientStatus === EDaoInviteStatus.ACCEPTED && (
                                <Button
                                    type="button"
                                    variant="custom"
                                    className={classNames(
                                        '!border-gray-e6edff !py-1 !px-6 text-green-600',
                                        'hover:text-white hover:bg-green-600 hover:!border-transparent',
                                        'disabled:opacity-60',
                                    )}
                                    disabled={item.isFetching}
                                    isLoading={item.isFetching}
                                    onClick={() => onInviteProposalCreate(item)}
                                >
                                    Create proposal
                                </Button>
                            )}
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    )
}

export default DaoMemberInvites
