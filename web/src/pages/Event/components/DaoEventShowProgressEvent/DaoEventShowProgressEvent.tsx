import { TSmvEvent } from 'react-gosh'

type TDaoEventShowProgressEventProps = {
    event: TSmvEvent
}

const DaoEventShowProgressEvent = (props: TDaoEventShowProgressEventProps) => {
    const { event } = props

    return (
        <div className="flex gap-3 text-gray-7c8db5 text-sm">
            <div>Hide voting results until event is over:</div>
            <div>{event.data.result ? 'yes' : 'no'}</div>
        </div>
    )
}

export { DaoEventShowProgressEvent }
