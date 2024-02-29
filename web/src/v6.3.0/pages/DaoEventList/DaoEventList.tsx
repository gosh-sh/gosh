import classNames from 'classnames'
import { useEffect, useState } from 'react'
import { matchPath } from 'react-router-dom'
import Loader from '../../../components/Loader'
import { DaoMemberWallet, DaoMembers, DaoSupply } from '../../components/Dao'
import { useDaoEventList, useDaoMember } from '../../hooks/dao.hooks'
import DaoEventPage from '../DaoEvent/DaoEvent'
import { ListBoundary } from './components'

const DaoEventListPage = () => {
  const member = useDaoMember()
  const [eventOpened, setEventOpened] = useState<string>()
  const eventList = useDaoEventList()

  useEffect(() => {
    const matched = matchPath('/o/:dao/events/:address', document.location.pathname)
    if (matched?.params.address) {
      eventList.openItem(matched.params.address)
      setEventOpened(matched.params.address)
    } else {
      eventList.closeItems()
      setEventOpened(undefined)
    }
  }, [document.location.pathname])

  return (
    <>
      <div className="row flex-wrap">
        <div className="col !basis-full md:!basis-0 !w-0">
          <div className="flex items-center justify-between pb-2 mb-4 gap-4">
            <h3 className="text-xl font-medium">DAO events</h3>
            {eventList.isFetching && <Loader className="text-xs">Updating...</Loader>}
          </div>

          <ListBoundary />
        </div>

        <div className="col !max-w-full md:!max-w-side-right-md xl:!max-w-side-right">
          <div className="flex flex-col gap-y-5">
            <DaoSupply />
            {member.isMember && <DaoMemberWallet />}
            <DaoMembers />
          </div>
        </div>
      </div>

      <div
        className={classNames(
          'fixed w-full lg:w-[80%] top-0 right-0 h-screen bg-white overflow-y-auto',
          'border border-gray-e6edff rounded-l-xl px-5 py-3.5 body-scroll-lock',
          'transition-all duration-300 shadow-xl',
          eventOpened ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        {eventOpened && <DaoEventPage address={eventOpened} />}
      </div>
    </>
  )
}

export default DaoEventListPage
