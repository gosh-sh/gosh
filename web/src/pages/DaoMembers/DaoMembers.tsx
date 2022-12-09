import Spinner from '../../components/Spinner'
import { useDaoMemberList, useDaoMemberDelete } from 'react-gosh'
import DaoMemberListItem from './MemberListItem'
import { useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { TDaoLayoutOutletContext } from '../DaoLayout'
import DaoMemberForm from './MemberForm'
import { toast } from 'react-toastify'
import ToastError from '../../components/Error/ToastError'

const DaoMembersPage = () => {
    const { daoName } = useParams()
    const navigate = useNavigate()
    const { dao } = useOutletContext<TDaoLayoutOutletContext>()
    const { items, isFetching, search, setSearch, getItemDetails } = useDaoMemberList(
        dao.adapter,
        0,
    )
    const deleteDaoMember = useDaoMemberDelete(dao.adapter)

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
                </div>
            </div>

            <div className="mt-6">
                <DaoMemberForm dao={dao.adapter} />
            </div>
        </>
    )
}

export default DaoMembersPage
