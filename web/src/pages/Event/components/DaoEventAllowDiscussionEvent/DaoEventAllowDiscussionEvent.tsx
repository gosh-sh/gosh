import { TSmvEvent } from 'react-gosh'

type TDaoEventAllowDiscussionEventProps = {
    event: TSmvEvent
}

const DaoEventAllowDiscussionEvent = (props: TDaoEventAllowDiscussionEventProps) => {
    const { event } = props

    return (
        <div className="flex gap-3 text-gray-7c8db5 text-sm">
            <div>Allow discussions for events:</div>
            <div>{event.data.result ? 'yes' : 'no'}</div>
        </div>
    )
}

export { DaoEventAllowDiscussionEvent }
