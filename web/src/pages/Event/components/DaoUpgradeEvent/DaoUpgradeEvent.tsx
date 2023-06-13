type TDaoUpgradeEventProps = {
    data: any
}

const DaoUpgradeEvent = (props: TDaoUpgradeEventProps) => {
    const { data } = props

    return (
        <div className="flex flex-col gap-y-1">
            <div className="flex gap-3 text-gray-7c8db5 text-sm">
                <div>Version for upgrade to:</div>
                <div>{data.newversion}</div>
            </div>
            <div className="flex gap-3 text-gray-7c8db5 text-sm">
                <div>Comment:</div>
                <div>{data.description}</div>
            </div>
        </div>
    )
}

export { DaoUpgradeEvent }
