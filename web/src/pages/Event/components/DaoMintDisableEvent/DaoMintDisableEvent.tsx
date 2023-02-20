type TDaoMintDisableEventProps = {
    data: any
}

const DaoMintDisableEvent = (props: TDaoMintDisableEventProps) => {
    const { data } = props
    return (
        <div className="flex gap-3 text-gray-7c8db5 text-sm">
            <div>Disable minting DAO tokens forever:</div>
            <div>true</div>
        </div>
    )
}

export { DaoMintDisableEvent }
