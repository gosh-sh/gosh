import Skeleton from '../../../../components/Skeleton'
import classNames from 'classnames'
import { TDaoEventDetails } from '../../../types/dao.types'
import { DaoEventStatusBadge } from '../../../components/DaoEvent'
import { getDurationDelta } from '../../../../utils'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCircle, faCircleCheck } from '@fortawesome/free-regular-svg-icons'
import { useDao, useDaoEvent, useDaoEventList } from '../../../hooks/dao.hooks'

const basis = {
  contaner: 'flex-wrap justify-between lg:flex-nowrap',
  name: 'basis-full lg:basis-4/12 xl:basis-6/12 grow-0',
  status: 'basis-0 grow lg:basis-2/12 lg:grow-0',
  value: 'basis-0 grow lg:basis-2/12 lg:grow-0',
  date: 'basis-0 grow',
}

const ListItemSkeleton = () => {
  return (
    <div className="flex px-5 py-2 gap-x-4">
      {Array.from(new Array(4)).map((_, i) => (
        <div key={i} className={classNames(i === 0 ? basis.name : basis.status)}>
          <Skeleton className="py-2" skeleton={{ height: 10 }}>
            <rect x="0" y="0" rx="6" ry="6" width="100%" height="10" />
          </Skeleton>
        </div>
      ))}
    </div>
  )
}

const ListItemHeader = (props: React.HTMLAttributes<HTMLDivElement>) => {
  const { className } = props

  return (
    <div
      className={classNames(
        'flex items-center px-5 py-3 gap-x-4',
        'text-xs text-gray-53596d',
        className,
      )}
    >
      <div className="basis-auto md:grow lg:basis-4/12 xl:basis-6/12 lg:grow-0">
        Event name
      </div>
      <div className={basis.status}>Status</div>
      <div className={basis.value}>Value</div>
      <div className={basis.date}>End date</div>
    </div>
  )
}

type TListItemProps = {
  event: TDaoEventDetails
}

const ListItem = (props: TListItemProps) => {
  const { event } = props
  const dao = useDao()
  const eventList = useDaoEventList()
  useDaoEvent(event.address, { subscribe: true })

  const onItemClick = () => {
    window.history.replaceState(
      null,
      document.title,
      `/o/${dao.details.name}/events/${event.address}`,
    )
    eventList.openItem(event.address)
  }

  return (
    <div
      className={classNames(
        'dao-eventlist-item flex items-center px-5 py-2 gap-x-4 gap-y-2 cursor-pointer',
        event.isOpen ? 'bg-gray-f6f6f9' : 'hover:bg-gray-fafafd',
        basis.contaner,
      )}
      onClick={onItemClick}
    >
      <div className={classNames(basis.name, 'text-sm truncate')}>
        <FontAwesomeIcon
          icon={event.votes.yours > 0 ? faCircleCheck : faCircle}
          className={classNames(
            'mr-2',
            event.votes.yours > 0 ? 'text-green-34c759' : 'text-gray-e6edff',
          )}
          size="lg"
        />
        {event.label}
      </div>
      <div className={classNames(basis.status, 'flex items-center')}>
        <DaoEventStatusBadge event={event} />
      </div>
      <div className={classNames(basis.value, 'text-xs text-gray-53596d')}>
        {event.votes.total.toLocaleString()}
      </div>
      <div className={classNames(basis.date, 'text-xs text-gray-53596d')}>
        {event.status.completed
          ? 'Completed'
          : event.time.finish > 0
          ? getDurationDelta(event.time.finish, '[d:d] [h:h] [m:m]')
          : '-'}
      </div>
    </div>
  )
}

export { ListItem, ListItemSkeleton, ListItemHeader }
