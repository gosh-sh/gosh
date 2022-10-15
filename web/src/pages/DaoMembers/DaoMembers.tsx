import Spinner from '../../components/Spinner'
import { useDaoMemberList, useDaoMemberDelete } from 'react-gosh'
import DaoMemberListItem from './MemberListItem'
import { useOutletContext } from 'react-router-dom'
import { TDaoLayoutOutletContext } from '../DaoLayout'
import DaoMemberForm from './MemberForm'
import { toast } from 'react-toastify'
import ToastError from '../../components/Error/ToastError'

const DaoMembersPage = () => {
    const { dao } = useOutletContext<TDaoLayoutOutletContext>()
    const { items, isFetching, search, setSearch, onLoadItemDetails } = useDaoMemberList(
        dao.adapter,
        0,
    )
    const deleteDaoMember = useDaoMemberDelete(dao.adapter)

    const onMemberDelete = async (username: string) => {
        if (window.confirm('Delete member?')) {
            try {
                await deleteDaoMember.remove([username])
            } catch (e: any) {
                console.error(e.message)
                toast.error(<ToastError error={e} />)
            }
        }
    }

    return (
        <>
            <div className="input">
                <input
                    className="element !py-1.5"
                    type="search"
                    placeholder="Search member by profile..."
                    autoComplete="off"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            <div className="mt-8 mb-2">
                {isFetching && (
                    <div className="text-gray-606060">
                        <Spinner className="mr-3" />
                        Loading members...
                    </div>
                )}

                <div className="divide-y divide-gray-c4c4c4">
                    {items.map((item, index) => {
                        onLoadItemDetails(item)
                        return (
                            <DaoMemberListItem
                                key={index}
                                item={item}
                                daoOwner={dao.details.owner}
                                isDaoOwner={dao.details.isAuthOwner}
                                isFetching={deleteDaoMember.isFetching(item.name)}
                                onDelete={onMemberDelete}
                            />
                        )
                    })}
                </div>
            </div>

            <div className="mt-6">
                <DaoMemberForm dao={dao.adapter} />
            </div>
        </>
    )
}

export default DaoMembersPage
