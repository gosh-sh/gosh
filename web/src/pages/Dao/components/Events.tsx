import { classNames, TDao, useSmvEventList } from 'react-gosh'
import { IGoshDaoAdapter } from 'react-gosh/dist/gosh/interfaces'
import { Link } from 'react-router-dom'

type TDaoEventsRecentProps = {
    dao: {
        adapter: IGoshDaoAdapter
        details: TDao
    }
}

const DaoEventsRecent = (props: TDaoEventsRecentProps) => {
    const { dao } = props
    const { items: events, getItemDetails: getEventDetails } = useSmvEventList(
        dao.adapter!,
        { perPage: 3 },
    )

    if (dao.details.version === '1.0.0') {
        return null
    }
    return (
        <div className="border border-gray-e6edff rounded-xl px-4 py-5 mb-9">
            <h3 className="text-xl font-medium">Recent proposals</h3>
            {!events.length && (
                <div className="py-10 text-center text-sm text-gray-7c8db5">
                    There are no events <br />
                    in the organization yet
                </div>
            )}
            <div className="mt-5 flex flex-nowrap divide-x divide-gray-e6edff">
                {events.map((item, index) => {
                    getEventDetails(item)
                    const { time, type, address, status } = item
                    return (
                        <div key={index} className="px-4">
                            {time && (
                                <div className="my-1 text-gray-7c8db5 text-xs">
                                    Due - {new Date(time.finishReal).toLocaleString()}
                                </div>
                            )}
                            <div className="mb-4">
                                <Link
                                    to={`/o/${dao.details.name}/events/${address}`}
                                    className="font-medium"
                                >
                                    {type.name}
                                </Link>
                            </div>
                            {status && (
                                <div>
                                    <span
                                        className={classNames(
                                            'rounded py-0.5 px-4 text-xs',
                                            !status.completed
                                                ? 'bg-gray-d6e4ee'
                                                : status.accepted
                                                ? 'bg-lime-100'
                                                : 'bg-rose-200',
                                        )}
                                    >
                                        {!status.completed
                                            ? 'In progress'
                                            : status.accepted
                                            ? 'Accepted'
                                            : 'Rejected'}
                                    </span>
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

export { DaoEventsRecent }
