import { TSmvEvent } from 'react-gosh'

type TTaskDeleteEventProps = {
    daoName?: string
    event: TSmvEvent
}

const TaskDeleteEvent = (props: TTaskDeleteEventProps) => {
    const { event } = props
    const { data, status } = event

    return (
        <div>
            {status.completed && status.accepted && (
                <div className="bg-green-700 text-white mt-6 px-4 py-3 rounded">
                    <p>Task delete proposal was accepted by SMV</p>
                </div>
            )}

            <h4 className="mt-10 mb-3 text-lg font-semibold">Event details</h4>
            <div>
                Repository: {data.reponame}
                <br />
                Task: {data.taskname}
            </div>
        </div>
    )
}

export default TaskDeleteEvent
