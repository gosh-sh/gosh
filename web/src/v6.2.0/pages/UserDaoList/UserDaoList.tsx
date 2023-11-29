import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons'
import { ButtonLink, Input } from '../../../components/Form'
import { ListBoundaryUser, ListBoundaryPartner } from './components'
import Loader from '../../../components/Loader'
import { usePartnerDaoList, useUserDaoList } from '../../hooks/dao.hooks'
import { PARTNER_DAO_NAMES } from '../../../constants'

const UserDaoListPage = () => {
    const userDaoList = useUserDaoList()
    const partnerDaoList = usePartnerDaoList()

    return (
        <>
            <div className="row mb-8">
                <div className="col !basis-full md:!basis-0">
                    <Input
                        type="search"
                        placeholder="Search GOSH DAO... (disabled)"
                        autoComplete="off"
                        disabled={true}
                        before={
                            <FontAwesomeIcon
                                icon={faMagnifyingGlass}
                                className="text-gray-7c8db5 font-extralight py-3 pl-4"
                            />
                        }
                        test-id="input-dao-search"
                    />
                </div>
                <div className="col md:!grow-0">
                    <ButtonLink
                        to="/a/orgs/create"
                        variant="outline-secondary"
                        size="xl"
                        className="block w-full"
                        test-id="link-dao-create"
                    >
                        Create new DAO
                    </ButtonLink>
                </div>
            </div>

            <div className="mb-4">
                <div className="flex items-center justify-between pb-2 gap-4">
                    <h1 className="text-xl font-medium mb-4">Your organizations</h1>
                    {userDaoList.isFetching && (
                        <Loader className="text-sm">Updating...</Loader>
                    )}
                </div>
                <ListBoundaryUser />
            </div>

            {!!PARTNER_DAO_NAMES.length && (
                <div className="mt-24 mb-4">
                    <div className="flex items-center justify-between pb-2 gap-4">
                        <h1 className="text-xl font-medium mb-4">Most popular DAOs</h1>
                        {partnerDaoList.isFetching && (
                            <Loader className="text-sm">Updating...</Loader>
                        )}
                    </div>
                    <ListBoundaryPartner />
                </div>
            )}
        </>
    )
}

export default UserDaoListPage
