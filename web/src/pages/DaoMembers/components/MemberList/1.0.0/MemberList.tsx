import { TDao, TDaoMemberDetails } from 'react-gosh'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import ToastError from '../../../../../components/Error/ToastError'
import Loader from '../../../../../components/Loader'
import DaoMemberListItem from './MemberListItem'

type TMemeberList_1_0_0Props = {
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
        remove: (username: string[]) => Promise<void>
        isFetching: (username: string) => boolean
    }
}

const MemeberList_1_0_0 = (props: TMemeberList_1_0_0Props) => {
    const { daoDetails, members, removal } = props
    const { isFetching, items } = members
    const navigate = useNavigate()

    const onDelete = async (username: string) => {
        if (window.confirm('Delete member?')) {
            try {
                await removal.remove([username])
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
                        isFetching={removal.isFetching(item.name)}
                        onDelete={onDelete}
                    />
                ))}
            </tbody>
        </table>
    )
}

export default MemeberList_1_0_0
