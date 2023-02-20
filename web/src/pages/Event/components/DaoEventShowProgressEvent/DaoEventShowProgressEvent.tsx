type TDaoEventShowProgressEventProps = {
    data: any
}

const DaoEventShowProgressEvent = (props: TDaoEventShowProgressEventProps) => {
    const { data } = props

    return (
        <div className="flex gap-3 text-gray-7c8db5 text-sm">
            <div>Hide voting results until event is over:</div>
            <div>{data.result ? 'yes' : 'no'}</div>
        </div>
    )
}

export { DaoEventShowProgressEvent }
