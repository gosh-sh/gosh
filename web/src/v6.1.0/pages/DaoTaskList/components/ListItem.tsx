import Skeleton from '../../../../components/Skeleton'
import classNames from 'classnames'
import { TTaskDetails } from '../../../types/dao.types'
import { useDao, useDaoTaskList, useTask } from '../../../hooks/dao.hooks'
import { Link } from 'react-router-dom'
import { TaskStatusBadge } from '../../../components/Task'
import { lockToStr } from '../../../components/Task/helpers'

const basis = {
    contaner: 'flex-wrap lg:flex-nowrap',
    name: 'basis-full lg:basis-4/12 grow-0',
    repository: 'basis-0 grow lg:basis-2/12 lg:grow-0',
    status: 'basis-0 grow lg:basis-2/12 lg:grow-0',
    reward: 'basis-0 grow lg:basis-2/12 lg:grow-0',
    vesting: 'basis-auto grow',
}

const ListItemSkeleton = () => {
    return (
        <div className="flex px-5 py-2 gap-x-4">
            {Array.from(new Array(5)).map((_, i) => (
                <div key={i} className={classNames(i === 0 ? basis.name : basis.status)}>
                    <Skeleton className="py-2" skeleton={{ height: 10 }}>
                        <rect x="0" y="0" rx="6" ry="6" width="100%" height="10" />
                    </Skeleton>
                </div>
            ))}
        </div>
    )
}

const ListItemHeader = (props: React.HTMLAttributes<HTMLDivElement>) => {
    const { className } = props

    return (
        <div
            className={classNames(
                'flex items-center px-5 py-3 gap-x-4',
                'text-xs text-gray-53596d',
                className,
            )}
        >
            <div className="basis-auto md:grow lg:basis-4/12 lg:grow-0">Name</div>
            <div className={basis.repository}>Repository</div>
            <div className={basis.status}>Status</div>
            <div className={basis.reward}>Reward</div>
            <div className={basis.vesting}>Vesting</div>
        </div>
    )
}

type TListItemProps = {
    item: TTaskDetails
}

const ListItem = (props: TListItemProps) => {
    const { item } = props
    const dao = useDao()
    const taskList = useDaoTaskList()
    useTask(item.address, { subscribe: true })

    const onItemClick = () => {
        window.history.replaceState(
            null,
            document.title,
            `/o/${dao.details.name}/tasks/${item.address}`,
        )
        taskList.openItem(item.address)
    }

    return (
        <div
            className={classNames(
                'dao-tasklist-item flex items-center px-5 py-2 gap-x-4 gap-y-2 cursor-pointer',
                item.isOpen ? 'bg-gray-f6f6f9' : 'hover:bg-gray-fafafd',
                basis.contaner,
            )}
            onClick={onItemClick}
        >
            <div className={classNames(basis.name, 'text-sm truncate')}>{item.name}</div>
            <div className={classNames(basis.repository, 'text-xs')}>
                <Link
                    to={`/o/${dao.details.name}/r/${item.repository.name}`}
                    className="text-blue-2b89ff"
                >
                    {item.repository.name}
                </Link>
            </div>
            <div className={classNames(basis.status, 'flex items-center')}>
                <TaskStatusBadge item={item} />
            </div>
            <div className={classNames(basis.reward, 'text-xs text-gray-53596d')}>
                {item.reward.toLocaleString()}
            </div>
            <div
                className={classNames(
                    basis.vesting,
                    'text-xs text-gray-53596d whitespace-nowrap',
                )}
            >
                {lockToStr(item.vestingEnd)}
            </div>
        </div>
    )
}

export { ListItem, ListItemSkeleton, ListItemHeader }
