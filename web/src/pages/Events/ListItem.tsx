import { faCalendarDays } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Link } from 'react-router-dom'
import Spinner from '../../components/Spinner'
import { TSmvEventListItem } from 'react-gosh'

type TEventListItemProps = {
    daoName: string
    event: TSmvEventListItem
}

const EventListItem = (props: TEventListItemProps) => {
    const { daoName, event } = props

    return (
        <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-2 py-3">
            <div>
                <div className="mb-2">
                    <Link
                        to={`/o/${daoName}/events/${event.address}`}
                        className="text-lg font-semibold hover:underline"
                    >
                        {event.type.name}
                    </Link>
                </div>
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                    {event.time && (
                        <div className="text-sm text-gray-606060">
                            <FontAwesomeIcon icon={faCalendarDays} className="mr-2" />
                            {new Date(event.time.start).toLocaleString()}
                            <span className="mx-1">-</span>
                            {new Date(event.time.finish).toLocaleString()}
                        </div>
                    )}
                </div>
            </div>
            <div>
                {event.status && (
                    <span className="mr-3">
                        {!event.status.completed ? (
                            <>
                                <Spinner size="sm" className="mr-2" />
                                Running
                            </>
                        ) : event.status.accepted ? (
                            <span className="text-green-900">Accepted</span>
                        ) : (
                            <span className="text-rose-600">Rejected</span>
                        )}
                    </span>
                )}

                {event.votes && (
                    <>
                        <span className="text-green-900 text-xl">{event.votes.yes}</span>
                        <span className="mx-1">/</span>
                        <span className="text-rose-600 text-xl">{event.votes.no}</span>
                    </>
                )}
            </div>
        </div>
    )
}

export default EventListItem
