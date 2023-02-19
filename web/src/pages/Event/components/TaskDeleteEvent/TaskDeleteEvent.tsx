import { TSmvEvent } from 'react-gosh'

type TTaskDeleteEventProps = {
    event: TSmvEvent
}

const TaskDeleteEvent = (props: TTaskDeleteEventProps) => {
    const { event } = props

    return (
        <div className="flex flex-col gap-y-1">
            <div className="flex gap-3 text-gray-7c8db5 text-sm">
                <div>Task name:</div>
                <div>{event.data.taskname}</div>
            </div>
            <div className="flex gap-3 text-gray-7c8db5 text-sm">
                <div>Repository name:</div>
                <div>{event.data.reponame}</div>
            </div>
        </div>
    )
}

export { TaskDeleteEvent }
