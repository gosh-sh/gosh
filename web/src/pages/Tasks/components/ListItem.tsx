import { classNames, TDao, TTaskListItem } from 'react-gosh'
import { IGoshDaoAdapter } from 'react-gosh/dist/gosh/interfaces'
import { useNavigate } from 'react-router-dom'
import { TaskStatusBadge } from './StatusBadge'

type TTaskListItemProps = {
    item: TTaskListItem
    dao: {
        adapter: IGoshDaoAdapter
        details: TDao
    }
}

const TaskListItem = (props: TTaskListItemProps) => {
    const { item, dao } = props
    const navigate = useNavigate()

    const getTaskCost = () => {
        const sumAssign = item.config.assign.reduce(
            (_sum: number, item: any) => _sum + parseInt(item.grant),
            0,
        )
        const sumReview = item.config.review.reduce(
            (_sum: number, item: any) => _sum + parseInt(item.grant),
            0,
        )
        const sumManager = item.config.manager.reduce(
            (_sum: number, item: any) => _sum + parseInt(item.grant),
            0,
        )
        return sumAssign + sumReview + sumManager
    }

    return (
        <tr
            className="hover:bg-gray-fafafd cursor-pointer"
            onClick={() => {
                navigate(`/o/${dao.details.name}/tasks/${item.address}`)
            }}
        >
            <td className="px-5 py-2">{item.name}</td>
            <td className="px-5 py-2 text-sm">{item.repository}</td>
            <td className="px-5 py-2">{getTaskCost()}</td>
            <td className="px-5 py-2">
                <TaskStatusBadge item={item} />
            </td>
            <td className="px-5 py-2">
                {item.tags.map((tag, index) => (
                    <span key={index} className={classNames('mx-1 text-sm')}>
                        {tag}
                    </span>
                ))}
            </td>
        </tr>
    )
}

export { TaskListItem }
