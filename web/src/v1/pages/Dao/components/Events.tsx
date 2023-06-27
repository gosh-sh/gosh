import { classNames, TDao, useSmvEventList } from 'react-gosh'
import { IGoshDaoAdapter } from 'react-gosh/dist/gosh/interfaces'
import { Link } from 'react-router-dom'

type TDaoEventsRecentProps = {
    dao: {
        adapter: IGoshDaoAdapter
        details: TDao
    }
    className?: string
}

const DaoEventsRecent = (props: TDaoEventsRecentProps) => {
    const { dao, className } = props
    const { items: events, getItemDetails: getEventDetails } = useSmvEventList(
        dao.adapter!,
        { perPage: 3 },
    )

    if (dao.details.version === '1.0.0') {
        return null
    }
    return (
        <div
            className={classNames(
                'border border-gray-e6edff rounded-xl px-4 py-5',
                className,
            )}
        >
            <h3 className="text-xl font-medium">Recent proposals</h3>
            {!events.length && (
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
                {events.map((item, index) => {
                    getEventDetails(item)
                    const { time, type, address, status } = item
                    return (
                        <div key={index} className="col !basis-full lg:!basis-0 !px-6">
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
