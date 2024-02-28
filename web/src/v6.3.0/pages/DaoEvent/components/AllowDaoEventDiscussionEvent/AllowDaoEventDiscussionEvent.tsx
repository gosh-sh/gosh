type TAllowDaoEventDiscussionEventProps = {
    data: { result: boolean }
}

const AllowDaoEventDiscussionEvent = (props: TAllowDaoEventDiscussionEventProps) => {
    const { data } = props

    return (
        <div className="flex flex-col gap-2 py-3">
            <div className="flex items-center gap-6">
                <div className="text-xs text-gray-53596d">
                    Allow discussions on events
                </div>
                <div className="text-sm">{data.result ? 'on' : 'off'}</div>
            </div>
        </div>
    )
}

export { AllowDaoEventDiscussionEvent }
