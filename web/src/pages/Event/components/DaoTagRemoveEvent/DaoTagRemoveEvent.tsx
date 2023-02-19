import { TSmvEvent } from 'react-gosh'

type TDaoTagRemoveEventProps = {
    event: TSmvEvent
}

const DaoTagRemoveEvent = (props: TDaoTagRemoveEventProps) => {
    const { event } = props

    return (
        <div className="flex flex-col gap-y-1">
            <div className="flex gap-3 text-gray-7c8db5 text-sm">
                <div>Tags to be removed from DAO:</div>
                <div>{event.data.daotag.join(', ')}</div>
            </div>
        </div>
    )
}

export { DaoTagRemoveEvent }
