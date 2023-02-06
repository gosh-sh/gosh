import { TSmvEvent } from 'react-gosh'

type TRepoTaskDeleteEventProps = {
    event: TSmvEvent
}

const RepoTaskDeleteEvent = (props: TRepoTaskDeleteEventProps) => {
    const { event } = props

    return (
        <div className="flex gap-3 text-gray-7c8db5 text-sm">
            <pre>{JSON.stringify(event.data, undefined, 2)}</pre>
        </div>
    )
}

export { RepoTaskDeleteEvent }
