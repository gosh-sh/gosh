import { TTaskDetails, TTaskListItem } from 'react-gosh'

const TaskStatusBadge = (props: { item: TTaskListItem | TTaskDetails }) => {
    const { item } = props

    if (!item.team || !item.team.commit) {
        return (
            <span className="bg-gray-d6e4ee text-xs rounded px-2">Awaiting commits</span>
        )
    }
    if (item.confirmed) {
        return <span className="bg-green-deecdc text-xs rounded px-2">Confirmed</span>
    }
    return null
}

export { TaskStatusBadge }
