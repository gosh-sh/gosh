type TRepoCreateEventProps = {
    data: any
}

const RepoCreateEvent = (props: TRepoCreateEventProps) => {
    const { data } = props

    return (
        <div className="flex gap-3 text-gray-7c8db5 text-sm">
            <div>Repository name:</div>
            <div>{data.repoName}</div>
        </div>
    )
}

export { RepoCreateEvent }
