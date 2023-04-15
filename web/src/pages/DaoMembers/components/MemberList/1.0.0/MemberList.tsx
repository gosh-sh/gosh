import { TDao, TDaoMemberDetails, TUserParam } from 'react-gosh'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { ToastError } from '../../../../../components/Toast'
import Loader from '../../../../../components/Loader'
import DaoMemberListItem from './MemberListItem'

type TDaoMemeberListProps = {
    daoDetails: TDao
    members: {
        isFetching: boolean
        items: TDaoMemberDetails[]
        hasNext: boolean
        search: string
        setSearch: React.Dispatch<React.SetStateAction<string>>
        getMore: () => void
    }
    removal: {
        remove: (
            users: {
                user: TUserParam
                allowance: number
                profile: string
            }[],
        ) => Promise<void>
        isFetching: (username: string) => boolean
    }
}

const DaoMemeberList = (props: TDaoMemeberListProps) => {
    const { daoDetails, members, removal } = props
    const { isFetching, items } = members
    const navigate = useNavigate()

    const onDelete = async (username: string) => {
        if (window.confirm('Delete member?')) {
            try {
                await removal.remove([
                    { user: { name: username, type: 'user' }, allowance: 0, profile: '' },
                ])
                navigate(`/o/${daoDetails.name}/events`)
            } catch (e: any) {
                console.error(e.message)
                toast.error(<ToastError error={e} />)
            }
        }
    }

    return (
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
                            <Loader>Loading members...</Loader>
                        </td>
                    </tr>
                )}

                {items.map((item, index) => (
                    <DaoMemberListItem
                        key={index}
                        item={item}
                        owner={daoDetails.owner}
                        isAuthMember={daoDetails.isAuthMember}
                        isFetching={removal.isFetching(item.user.name)}
                        onDelete={onDelete}
                    />
                ))}
            </tbody>
        </table>
    )
}

export default DaoMemeberList
