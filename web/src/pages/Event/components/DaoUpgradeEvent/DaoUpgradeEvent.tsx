import { TSmvEvent } from 'react-gosh'

type TDaoUpgradeEventProps = {
    event: TSmvEvent
}

const DaoUpgradeEvent = (props: TDaoUpgradeEventProps) => {
    const { event } = props

    return (
        <div className="flex gap-3 text-gray-7c8db5 text-sm">
            <div>Version for upgrade to:</div>
            <div>{event.data.newversion}</div>
        </div>
    )
}

export { DaoUpgradeEvent }
