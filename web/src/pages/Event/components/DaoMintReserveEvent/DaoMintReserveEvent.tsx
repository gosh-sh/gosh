import { TSmvEvent } from 'react-gosh'

type TDaoMintReserveEventProps = {
    event: TSmvEvent
}

const DaoMintReserveEvent = (props: TDaoMintReserveEventProps) => {
    const { event } = props

    return (
        <div className="flex gap-3 text-gray-7c8db5 text-sm">
            <div>Number of tokens to mint:</div>
            <div>{event.data.grant}</div>
        </div>
    )
}

export { DaoMintReserveEvent }
