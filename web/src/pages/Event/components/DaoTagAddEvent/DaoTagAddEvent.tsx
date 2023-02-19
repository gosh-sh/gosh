import { TSmvEvent } from 'react-gosh'

type TDaoTagAddEventProps = {
    event: TSmvEvent
}

const DaoTagAddEvent = (props: TDaoTagAddEventProps) => {
    const { event } = props

    return (
        <div className="flex flex-col gap-y-1">
            <div className="flex gap-3 text-gray-7c8db5 text-sm">
                <div>Tags to be added for DAO:</div>
                <div>{event.data.daotag.join(', ')}</div>
            </div>
        </div>
    )
}

export { DaoTagAddEvent }
