import { TSmvEvent } from 'react-gosh'

type TDaoMintDisableEventProps = {
    event: TSmvEvent
}

const DaoMintDisableEvent = (props: TDaoMintDisableEventProps) => {
    return (
        <div className="flex gap-3 text-gray-7c8db5 text-sm">
            <div>Disable minting DAO tokens forever:</div>
            <div>true</div>
        </div>
    )
}

export { DaoMintDisableEvent }
