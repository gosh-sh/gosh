import { TSmvEvent } from 'react-gosh'

type TRepoDescriptionEventProps = {
    event: TSmvEvent
}

const RepoDescriptionEvent = (props: TRepoDescriptionEventProps) => {
    const { event } = props

    return (
        <div className="flex flex-col gap-y-1">
            <div className="flex gap-3 text-gray-7c8db5 text-sm">
                <div>Repository:</div>
                <div>{event.data.repo}</div>
            </div>
            <div className="flex gap-3 text-gray-7c8db5 text-sm">
                <div>Description:</div>
                <div>{event.data.descr}</div>
            </div>
        </div>
    )
}

export { RepoDescriptionEvent }
