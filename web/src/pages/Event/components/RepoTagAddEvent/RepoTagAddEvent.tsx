import { TSmvEvent } from 'react-gosh'

type TRepoTagAddEventProps = {
    event: TSmvEvent
}

const RepoTagAddEvent = (props: TRepoTagAddEventProps) => {
    const { event } = props

    return (
        <div className="flex flex-col gap-y-1">
            <div className="flex gap-3 text-gray-7c8db5 text-sm">
                <div>Repository:</div>
                <div>{event.data.repo}</div>
            </div>
            <div className="flex gap-3 text-gray-7c8db5 text-sm">
                <div>Tags to be added:</div>
                <div>{event.data.daotag.join(', ')}</div>
            </div>
        </div>
    )
}

export { RepoTagAddEvent }
