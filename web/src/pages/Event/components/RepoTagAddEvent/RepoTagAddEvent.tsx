type TRepoTagAddEventProps = {
    data: any
}

const RepoTagAddEvent = (props: TRepoTagAddEventProps) => {
    const { data } = props

    return (
        <div className="flex flex-col gap-y-1">
            <div className="flex gap-3 text-gray-7c8db5 text-sm">
                <div>Repository:</div>
                <div>{data.repo}</div>
            </div>
            <div className="flex gap-3 text-gray-7c8db5 text-sm">
                <div>Tags to be added:</div>
                <div>{data.daotag.join(', ')}</div>
            </div>
        </div>
    )
}

export { RepoTagAddEvent }
