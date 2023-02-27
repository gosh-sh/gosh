type TDaoAskMembershipAllowanceEventProps = {
    data: any
}

const DaoAskMembershipAllowanceEvent = (props: TDaoAskMembershipAllowanceEventProps) => {
    const { data } = props

    return (
        <div className="flex gap-3 text-gray-7c8db5 text-sm">
            <div>Allow external users to ask DAO membership:</div>
            <div>{data.result ? 'yes' : 'no'}</div>
        </div>
    )
}

export { DaoAskMembershipAllowanceEvent }
