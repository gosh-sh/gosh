import { Link } from 'react-router-dom'
import { TDao, TSmvEventListItem } from 'react-gosh'
import { EventProgressBar, EventStatusBadge } from '../../components/Event'

type TEventListItemProps = {
    dao: TDao
    event: TSmvEventListItem
}

const EventListItem = (props: TEventListItemProps) => {
    const { dao, event } = props

    return (
        <div className="px-5 py-6">
            <div className="mb-4">
                <Link
                    to={`/o/${dao.name}/events/${event.address}`}
                    className="text-xl text-blue-348eff font-medium"
                >
                    {event.type.name}
                </Link>
            </div>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                {event.status && <EventStatusBadge status={event.status} />}
                {event.time && (
                    <span className="text-gray-7c8db5 text-sm">
                        {event.time.finish ? (
                            <>
                                Created {new Date(event.time.start).toLocaleDateString()}
                                <span className="mx-1">-</span>
                                Executed{' '}
                                {new Date(event.time.finish).toLocaleDateString()}
                            </>
                        ) : (
                            'Review required'
                        )}
                    </span>
                )}
                {(dao.isEventProgressOn || event.status?.completed) && (
                    <div className="grow">
                        <EventProgressBar votes={event.votes} />
                    </div>
                )}
            </div>
        </div>
    )
}

export default EventListItem
