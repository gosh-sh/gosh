import { classNames, TSmvEvent } from 'react-gosh'

type TEventStatusBadgeProps = {
    status: TSmvEvent['status']
}

const EventStatusBadge = (props: TEventStatusBadgeProps) => {
    const { status } = props

    return (
        <span
            className={classNames(
                'rounded py-0.5 px-4 text-xs',
                !status.completed
                    ? 'bg-gray-d6e4ee'
                    : status.accepted
                    ? 'bg-lime-100'
                    : 'bg-rose-200',
            )}
        >
            {!status.completed
                ? 'In progress'
                : status.accepted
                ? 'Accepted'
                : 'Rejected'}
        </span>
    )
}

export { EventStatusBadge }
