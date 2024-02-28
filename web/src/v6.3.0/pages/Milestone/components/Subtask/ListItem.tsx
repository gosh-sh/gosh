import classNames from 'classnames'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronRight } from '@fortawesome/free-solid-svg-icons'
import { TTaskDetails } from '../../../../types/dao.types'
import { useDaoTaskList, useTask } from '../../../../hooks/dao.hooks'
import { TaskStatusBadge } from '../../../../components/Task'

const basis = {
    contaner: 'flex-wrap lg:flex-nowrap',
    name: 'basis-full lg:basis-8/12 grow-0',
    status: 'basis-0 grow lg:basis-2/12 lg:grow-0',
    reward: 'basis-auto grow',
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
            <div className="basis-auto md:grow lg:basis-8/12 lg:grow-0">Name</div>
            <div className={basis.status}>Status</div>
            <div className={basis.reward}>Reward</div>
        </div>
    )
}

type TListItemProps = {
    item: TTaskDetails
}

const ListItem = (props: TListItemProps) => {
    const { item } = props
    const tasks = useDaoTaskList()
    useTask(item.address, { subscribe: true })

    const onItemClick = () => {
        window.history.replaceState(
            null,
            document.title,
            `${document.location.pathname}?subtask=${item.address}`,
        )
        tasks.openItem(item.address)
    }

    return (
        <div
            className={classNames(
                'group flex items-center gap-x-4 gap-y-2 cursor-pointer px-5 py-2 hover:bg-gray-fafafd',
                basis.contaner,
            )}
            onClick={onItemClick}
        >
            <div
                className={classNames(
                    basis.name,
                    'text-sm flex flex-nowrap items-center overflow-hidden',
                )}
            >
                <div className="grow truncate mr-3">{item.name}</div>
                <div>
                    <FontAwesomeIcon
                        icon={faChevronRight}
                        size="sm"
                        className={classNames(
                            'mr-2 text-gray-e6edff transition-transform duration-200',
                            'group-hover:-translate-x-2 group-hover:text-gray-7c8db5',
                        )}
                    />
                </div>
            </div>
            <div className={classNames(basis.status, 'flex items-center')}>
                <TaskStatusBadge item={item} />
            </div>
            <div className={classNames(basis.reward, 'text-xs text-gray-53596d')}>
                {item.reward.toLocaleString()}
            </div>
        </div>
    )
}

export { ListItem, ListItemHeader }
