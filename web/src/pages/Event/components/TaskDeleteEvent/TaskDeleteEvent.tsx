type TTaskDeleteEventProps = {
    data: any
}

const TaskDeleteEvent = (props: TTaskDeleteEventProps) => {
    const { data } = props

    return (
        <div className="flex flex-col gap-y-1">
            <div className="flex gap-3 text-gray-7c8db5 text-sm">
                <div>Task name:</div>
                <div>{data.taskname}</div>
            </div>
            <div className="flex gap-3 text-gray-7c8db5 text-sm">
                <div>Repository name:</div>
                <div>{data.reponame}</div>
            </div>
        </div>
    )
}

export { TaskDeleteEvent }
