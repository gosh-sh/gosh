import { TTaskDetails } from '../../../types/dao.types'

const TaskStatusBadge = (props: { item: TTaskDetails }) => {
  const { item } = props

  if (item.isReady || (item.isSubtask && item.team)) {
    return (
      <span className="bg-green-2fbf5340 text-xs rounded-lg px-2 py-1">Confirmed</span>
    )
  }

  return <span className="bg-gray-d6e4ee text-xs rounded-lg px-2 py-1">In progress</span>
}

export { TaskStatusBadge }
