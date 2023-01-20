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

            <div className="mt-6 flex">
                <div
                    id="create-member-anchor"
                    className="basis-full md:basis-1/2 border rounded-xl p-5 md:p-8"
                >
                    <DaoMemberForm dao={dao.adapter} />
                </div>
            </div>
        </>
    )
}

export default DaoMembersPage
