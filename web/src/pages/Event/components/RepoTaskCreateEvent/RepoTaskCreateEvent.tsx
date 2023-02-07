import { TSmvEvent } from 'react-gosh'

type TRepoTaskCreateEventProps = {
    event: TSmvEvent
}

const RepoTaskCreateEvent = (props: TRepoTaskCreateEventProps) => {
    const { event } = props

    return (
        <div className="flex gap-3 text-gray-7c8db5 text-sm">
            <pre>{JSON.stringify(event.data, undefined, 2)}</pre>
        </div>
    )
}

export { RepoTaskCreateEvent }
