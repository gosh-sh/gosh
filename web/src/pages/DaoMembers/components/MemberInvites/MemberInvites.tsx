import { faRotateRight } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { classNames } from 'react-gosh'
import { IGoshDaoAdapter } from 'react-gosh/dist/gosh/interfaces'
import { toast } from 'react-toastify'
import ToastError from '../../../../components/Error/ToastError'
import { Button } from '../../../../components/Form'
import { supabase } from '../../../../helpers'
import { EDaoInviteStatus } from '../../../../store/onboarding.types'
import { TDaoInvite } from '../../DaoMembers'
import { DaoMemberInvites_1_0_0 } from './1.0.0/MemberInvites'
import { DaoMemberInvites_1_1_0 } from './1.1.0/MemberInvites'

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
    const version = dao.getVersion()

    const onInviteRevoke = async (item: TDaoInvite) => {
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

    return (
        <div className="flex flex-col h-full">
            <div className="p-5 grow overflow-x-auto">
                {version === '1.0.0' && (
                    <DaoMemberInvites_1_0_0
                        dao={dao}
                        invites={invites}
                        setInvites={setInvites}
                        revoke={onInviteRevoke}
                    />
                )}
                {version === '1.1.0' && (
                    <DaoMemberInvites_1_1_0
                        dao={dao}
                        invites={invites}
                        setInvites={setInvites}
                        revoke={onInviteRevoke}
                    />
                )}
            </div>
            <div>
                <Button
                    type="button"
                    className={classNames(
                        'w-full',
                        '!rounded-none',
                        '!text-gray-7c8db5 !bg-gray-fafafd',
                        'disabled:opacity-70',
                    )}
                    disabled={invites.isFetching}
                    isLoading={invites.isFetching}
                    onClick={getDaoInvites}
                >
                    {!invites.isFetching && (
                        <FontAwesomeIcon icon={faRotateRight} className="mr-2" />
                    )}
                    Refresh
                </Button>
            </div>
        </div>
    )
}

export { DaoMemberInvites }
