import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons'
import { ButtonLink } from '../../../components/Form'
import { ListBoundaryUser, ListBoundaryPartner } from './components'
import Loader from '../../../components/Loader'
import { usePartnerDaoList, useUserDaoList } from '../../hooks/dao.hooks'
import { PARTNER_DAO_NAMES } from '../../../constants'
import { UserSelect } from '../../components/UserSelect'
import { Select2ClassNames } from '../../../helpers'
import { useNavigate } from 'react-router-dom'

const UserDaoListPage = () => {
  const navigate = useNavigate()
  const userDaoList = useUserDaoList()
  const partnerDaoList = usePartnerDaoList()

  return (
    <>
      <div className="row mb-8">
        <div className="col !basis-full md:!basis-0">
          <UserSelect
            searchUser={false}
            searchDaoGlobal
            classNames={{
              ...Select2ClassNames,
              valueContainer: () => '!px-4 !py-1.5',
            }}
            placeholder={
              <div className="flex items-center gap-x-4">
                <FontAwesomeIcon
                  icon={faMagnifyingGlass}
                  className="text-gray-7c8db5 font-extralight"
                />
                Search GOSH DAO...
              </div>
            }
            noOptionsMessage={({ inputValue }) => {
              if (inputValue) {
                return 'DAO not found'
              }
              return 'Type DAO name in search field'
            }}
            onChange={(option) => {
              navigate(`/o/${option.value.name}`)
            }}
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
