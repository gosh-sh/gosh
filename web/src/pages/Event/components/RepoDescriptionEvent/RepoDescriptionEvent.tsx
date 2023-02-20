type TRepoDescriptionEventProps = {
    data: any
}

const RepoDescriptionEvent = (props: TRepoDescriptionEventProps) => {
    const { data } = props

    return (
        <div className="flex flex-col gap-y-1">
            <div className="flex gap-3 text-gray-7c8db5 text-sm">
                <div>Repository:</div>
                <div>{data.repo}</div>
            </div>
            <div className="flex gap-3 text-gray-7c8db5 text-sm">
                <div>Description:</div>
                <div>{data.descr}</div>
            </div>
        </div>
    )
}

export { RepoDescriptionEvent }
