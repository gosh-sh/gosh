import { Link } from 'react-router-dom'
import { useDao, useDaoEventList } from '../../../hooks/dao.hooks'
import { DaoEventStatusBadge } from '../../../components/DaoEvent'
import classNames from 'classnames'

type TDaoEventsRecentProps = React.HTMLAttributes<HTMLDivElement>

const DaoEventsRecent = (props: TDaoEventsRecentProps) => {
  const { className } = props
  const dao = useDao()
  const eventList = useDaoEventList({ count: 3, initialize: true })

  return (
    <div
      className={classNames('border border-gray-e6edff rounded-xl px-4 py-5', className)}
    >
      <h3 className="text-xl font-medium">Recent proposals</h3>

      {eventList.isEmpty && (
        <div className="py-10 text-center text-sm text-gray-7c8db5">
          There are no events <br />
          in the organization yet
        </div>
      )}

      <div
        className={classNames(
          'row mt-5 !-mx-6',
          'divide-gray-e6edff divide-y lg:divide-y-0 lg:divide-x',
        )}
      >
        {eventList.items.slice(0, 3).map((item, index) => {
          const { time, label, address } = item
          return (
            <div key={index} className="col !basis-full lg:!basis-0 !px-6">
              <div className="my-1 text-gray-7c8db5 text-xs">
                Due - {new Date(time.finish).toLocaleString()}
              </div>
              <div className="mb-4">
                <Link
                  to={`/o/${dao.details.name}/events/${address}`}
                  className="font-medium"
                >
                  {label}
                </Link>
              </div>
              <div>
                <DaoEventStatusBadge event={item} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export { DaoEventsRecent }
