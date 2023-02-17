import { TSmvEvent } from 'react-gosh'

type TDaoAskMembershipAllowanceEventProps = {
    event: TSmvEvent
}

const DaoAskMembershipAllowanceEvent = (props: TDaoAskMembershipAllowanceEventProps) => {
    const { event } = props

    return (
        <div className="flex gap-3 text-gray-7c8db5 text-sm">
            <div>Allow external users to ask DAO membership:</div>
            <div>{event.data.result ? 'yes' : 'no'}</div>
        </div>
    )
}

export { DaoAskMembershipAllowanceEvent }