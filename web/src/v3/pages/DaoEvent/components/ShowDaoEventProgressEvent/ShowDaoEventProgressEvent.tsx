type TShowDaoEventProgressEventProps = {
    data: { result: boolean }
}

const ShowDaoEventProgressEvent = (props: TShowDaoEventProgressEventProps) => {
    const { data } = props

    return (
        <div className="flex flex-col gap-2 py-3">
            <div className="flex items-center gap-6">
                <div className="text-xs text-gray-53596d">
                    Hide event progress until it's over
                </div>
                <div className="text-sm">{data.result ? 'on' : 'off'}</div>
            </div>
        </div>
    )
}

export { ShowDaoEventProgressEvent }
