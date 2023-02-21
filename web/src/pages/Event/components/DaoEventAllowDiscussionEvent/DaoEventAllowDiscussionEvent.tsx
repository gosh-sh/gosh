type TDaoEventAllowDiscussionEventProps = {
    data: any
}

const DaoEventAllowDiscussionEvent = (props: TDaoEventAllowDiscussionEventProps) => {
    const { data } = props

    return (
        <div className="flex gap-3 text-gray-7c8db5 text-sm">
            <div>Allow discussions for events:</div>
            <div>{data.result ? 'yes' : 'no'}</div>
        </div>
    )
}

export { DaoEventAllowDiscussionEvent }
