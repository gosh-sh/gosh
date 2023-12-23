import { DaoMemberWallet, DaoMembers, DaoSupply } from '../../components/Dao'
import DaoRepositoriesPage from '../DaoRepositoryList/DaoRepositoryList'
import { useDaoMember } from '../../hooks/dao.hooks'
import { DaoEventsRecent } from './components'

const DaoPage = () => {
  const member = useDaoMember()

  return (
    <div className="row flex-wrap">
      <div className="col !basis-full md:!basis-0">
        <DaoEventsRecent className="mb-5" />
        <DaoRepositoriesPage count={5} />
      </div>
      <div className="col !max-w-full md:!max-w-side-right-md lg:!max-w-side-right">
        <div className="flex flex-col gap-y-5">
          <DaoSupply />
          {!!member.profile && <DaoMemberWallet />}
          <DaoMembers />
        </div>
      </div>
    </div>
  )
}

export default DaoPage
