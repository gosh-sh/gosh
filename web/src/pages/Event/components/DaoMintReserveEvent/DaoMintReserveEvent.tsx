type TDaoMintReserveEventProps = {
    data: any
}

const DaoMintReserveEvent = (props: TDaoMintReserveEventProps) => {
    const { data } = props

    return (
        <div className="flex gap-3 text-gray-7c8db5 text-sm">
            <div>Number of tokens to mint:</div>
            <div>{data.grant}</div>
        </div>
    )
}

export { DaoMintReserveEvent }
