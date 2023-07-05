import CopyClipboard from '../../../../../components/CopyClipboard'
import Spinner from '../../../../../components/Spinner'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTimes } from '@fortawesome/free-solid-svg-icons'
import { TDaoMemberListItem } from '../../../../types/dao.types'
import { shortString } from '../../../../../utils'
import Skeleton from '../../../../../components/Skeleton'
import { useDao, useDaoDeleteMemeber, useDaoMember } from '../../../../hooks/dao.hooks'
import { useNavigate } from 'react-router-dom'
import { ToastStatus } from '../../../../../components/Toast'

const ListItemSkeleton = () => {
    return (
        <tr>
            {Array.from(new Array(5)).map((_, i) => (
                <td key={i}>
                    <Skeleton className="px-3 py-2" skeleton={{ height: 10 }}>
                        <rect x="0" y="0" rx="6" ry="6" width="100%" height="10" />
                    </Skeleton>
                </td>
            ))}
        </tr>
    )
}

type TListItemProps = {
    item: TDaoMemberListItem
}

const ListItem = (props: TListItemProps) => {
    const { item } = props
    const navigate = useNavigate()
    const dao = useDao()
    const member = useDaoMember()
    const { status, deleteMember } = useDaoDeleteMemeber()

    const onDelete = async (username: string) => {
        if (window.confirm('Delete member?')) {
            try {
                await deleteMember([username])
                navigate(`/o/${dao.details.name}/events`)
            } catch (e: any) {
                console.error(e.message)
            }
        }
    }

    return (
        <>
            <tr>
                <td className="px-3 py-2">{item.username}</td>
                <td className="px-3 py-2 text-gray-7c8db5 font-light">
                    {item.allowance}
                </td>
                <td className="px-3 py-2 text-gray-7c8db5 font-light text-sm">
                    <CopyClipboard
                        componentProps={{ text: item.profile.address }}
                        label={shortString(item.profile.address, 6, 6)}
                    />
                </td>
                <td className="px-3 py-2 text-gray-7c8db5 font-light text-sm">
                    <CopyClipboard
                        componentProps={{ text: item.wallet.address }}
                        label={shortString(item.wallet.address, 6, 6)}
                    />
                </td>
                <td className="px-3 py-2 text-gray-7c8db5 font-light text-right">
                    {member.details.isMember && (
                        <button
                            type="button"
                            className="hover:text-red-dd3a3a disabled:opacity-20 disabled:pointer-events-none"
                            onClick={() => onDelete(item.username)}
                            disabled={
                                item.isFetching ||
                                item.profile.address === dao.details.owner
                            }
                        >
                            {item.isFetching ? (
                                <Spinner size="xs" />
                            ) : (
                                <FontAwesomeIcon icon={faTimes} size="lg" />
                            )}
                        </button>
                    )}
                </td>
            </tr>

            <ToastStatus status={status} />
        </>
    )
}

export { ListItem, ListItemSkeleton }
