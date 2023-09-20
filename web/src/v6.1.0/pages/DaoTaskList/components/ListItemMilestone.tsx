import classNames from 'classnames'
import { TTaskDetails } from '../../../types/dao.types'
import { useDao, useDaoTaskList, useMilestone } from '../../../hooks/dao.hooks'
import { Link } from 'react-router-dom'
import { TaskStatusBadge } from '../../../components/Task'
import { lockToStr } from '../../../components/Task/helpers'
import { Button } from '../../../../components/Form'
import { useSetRecoilState } from 'recoil'
import { appModalStateAtom } from '../../../../store/app.state'
import { MilestoneTaskCreateModal } from '../../../components/Modal'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronDown, faChevronRight } from '@fortawesome/free-solid-svg-icons'
import { AnimatePresence, motion } from 'framer-motion'
import { ListItem } from './ListItem'
import { useUser } from '../../../hooks/user.hooks'

const basis = {
    contaner: 'flex-wrap lg:flex-nowrap',
    name: 'basis-full lg:basis-4/12 grow-0',
    repository: 'basis-0 grow lg:basis-2/12 lg:grow-0',
    status: 'basis-0 grow lg:basis-2/12 lg:grow-0',
    reward: 'basis-0 grow lg:basis-2/12 lg:grow-0',
    vesting: 'basis-auto grow',
}

type TListItemMilestoneProps = {
    item: TTaskDetails
}

const ListItemMilestone = (props: TListItemMilestoneProps) => {
    const { item } = props
    const { user } = useUser()
    const dao = useDao()
    const taskList = useDaoTaskList()
    const setModal = useSetRecoilState(appModalStateAtom)
    useMilestone(item.address, { subscribe: true })

    const attrId = `dao-tasklist-item-${item.name}`
    const isManager = user.profile === item.team?.managers[0].profile

    const onItemClick = (e: any) => {
        const expand = document.querySelector(`#${attrId} .item-expand`)
        if (expand?.contains(e.target)) {
            taskList.expandItem(item.address)
        } else {
            window.history.replaceState(
                null,
                document.title,
                `/o/${dao.details.name}/tasks/milestone/${item.address}`,
            )
            taskList.openItem(item.address)
        }
    }

    const onCreateMilestoneTask = () => {
        setModal({
            static: true,
            isOpen: true,
            element: (
                <MilestoneTaskCreateModal
                    milename={item.name}
                    reponame={item.repository.name}
                    budget={item.balance}
                />
            ),
        })
    }

    return (
        <div id={attrId} className="dao-tasklist-item overflow-hidden">
            <div
                className={classNames(
                    'group flex items-center gap-x-4 gap-y-2 cursor-pointer px-5 py-2',
                    item.isOpen ? 'bg-gray-f6f6f9' : 'hover:bg-gray-fafafd',
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
                    <div className="w-6 shrink-0 text-gray-7c8db5">
                        <Button variant="custom" className="item-expand !p-0">
                            <FontAwesomeIcon
                                icon={faChevronDown}
                                size="sm"
                                className={classNames(
                                    'transition-transform duration-200',
                                    item.isExpanded ? 'rotate-180' : 'rotate-0',
                                )}
                            />
                        </Button>
                    </div>
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

            <AnimatePresence>
                {item.isExpanded && (
                    <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: 'auto' }}
                        exit={{ height: 0 }}
                        transition={{ duration: 0.25 }}
                    >
                        <div className="">
                            {item.subtasks.map((subtask, index) => (
                                <ListItem key={index} item={subtask} />
                            ))}
                        </div>

                        {isManager && !item.isReady && (
                            <div className="px-11 mb-3">
                                <Button
                                    type="button"
                                    variant="custom"
                                    className="!px-0 text-gray-53596d text-sm hover:text-black"
                                    disabled={item.balance === 0}
                                    onClick={onCreateMilestoneTask}
                                >
                                    {item.balance === 0
                                        ? 'Not enough budget to add more tasks'
                                        : 'Add task...'}
                                </Button>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

export { ListItemMilestone }
