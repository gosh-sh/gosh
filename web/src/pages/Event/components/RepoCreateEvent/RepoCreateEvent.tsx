import { TSmvEvent } from 'react-gosh'

type TRepoCreateEventProps = {
    event: TSmvEvent
}

const RepoCreateEvent = (props: TRepoCreateEventProps) => {
    const { event } = props

    return (
        <div className="flex gap-3 text-gray-7c8db5 text-sm">
            <div>Repository name:</div>
            <div>{event.data.repoName}</div>
        </div>
    )
}

export { RepoCreateEvent }
