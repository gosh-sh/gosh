import { Tooltip } from 'react-tooltip'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useDao, useDaoTaskList, useMilestone } from '../../hooks/dao.hooks'
import CopyClipboard from '../../../components/CopyClipboard'
import { shortString } from '../../../utils'
import { Button } from '../../../components/Form'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTimes } from '@fortawesome/free-solid-svg-icons'
import Skeleton from '../../../components/Skeleton'
import { useErrorBoundary, withErrorBoundary } from 'react-error-boundary'
import Alert from '../../../components/Alert'
import { TaskStatusBadge } from '../../components/Task'
import { lockToStr } from '../../components/Task/helpers'
import { Link } from 'react-router-dom'
import { ListItem, ListItemHeader, MilestoneManage, SubtaskPage } from './components'
import { useBodyScrollLock } from '../../../hooks/common.hooks'
import { MemberIcon } from '../../../components/Dao'
import { MilestoneTaskCreateModal } from '../../components/Modal'
import { useSetRecoilState } from 'recoil'
import { appModalStateAtom } from '../../../store/app.state'
import { useUser } from '../../hooks/user.hooks'
import { AnimatePresence, motion } from 'framer-motion'
import { TMilestoneTaskDetails } from '../../types/dao.types'

const MilestonePageInner = (props: { address: string }) => {
    const { address } = props
    const setModal = useSetRecoilState(appModalStateAtom)
    const { user } = useUser()
    const dao = useDao()
    const taskList = useDaoTaskList()
    const { task, error } = useMilestone(address, { initialize: true })
    const { showBoundary } = useErrorBoundary()
    const ref = useRef<HTMLDivElement>(null)
    useBodyScrollLock({
        applyWhen: !!task?.isOpen,
        deps: [task?.isOpen],
        mobileOnly: true,
    })
    const [subtaskOpened, setSubtaskOpened] = useState<string>()

    const isManager = user.profile === task?.team?.managers[0].profile

    const onItemClose = useCallback(() => {
        window.history.replaceState(null, document.title, `/o/${dao.details.name}/tasks`)
        taskList.closeItems()
    }, [dao.details.name])

    const onCreateMilestoneTask = () => {
        setModal({
            static: true,
            isOpen: true,
            element: (
                <MilestoneTaskCreateModal
                    milename={task!.name}
                    reponame={task!.repository.name}
                    budget={task!.balance}
                />
            ),
        })
    }

    useEffect(() => {
        if (!!task?.isDeleted) {
            onItemClose()
        }
    }, [task?.isDeleted])

    useEffect(() => {
        if (error) {
            showBoundary(error)
        }
    }, [error])

    useEffect(() => {
        const urlsearch = new URLSearchParams(document.location.search)
        const subtaskaddr = urlsearch.get('subtask')
        if (subtaskaddr) {
            setSubtaskOpened(subtaskaddr)
            taskList.openItem(subtaskaddr)
        } else {
            setSubtaskOpened(undefined)
        }
    }, [document.location.search])

    useEffect(() => {
        const onClick = ({ target }: any) => {
            // If no ref or click inide task block, do nothing
            if (!ref.current || (ref.current && ref.current.contains(target))) {
                return
            }

            // Click outside task block, but need to check click on task list item
            const items = document.getElementsByClassName('dao-tasklist-item')
            const itemClicked = Array.from(items).some((item) => item.contains(target))
            if (!itemClicked) {
                onItemClose()
            }
        }

        document.addEventListener('click', onClick)
        return () => {
            document.removeEventListener('click', onClick)
        }
    }, [onItemClose])

    if (!task) {
        return (
            <Skeleton className="py-2" skeleton={{ height: 114 }}>
                <rect x="0" y="10" rx="6" ry="6" width="100%" height="30" />
                <rect x="0" y="60" rx="6" ry="6" width="100%" height="14" />
                <rect x="0" y="80" rx="6" ry="6" width="100%" height="14" />
                <rect x="0" y="100" rx="6" ry="6" width="100%" height="14" />
            </Skeleton>
        )
    }

    return (
        <div ref={ref}>
            <div className="flex flex-wrap items-center gap-2 border-b border-b-gray-e8eeed pt-2 pb-4 relative">
                <div className="basis-full lg:basis-auto grow">
                    <h3 className="text-xl font-medium">{task.name}</h3>
                </div>
                <div>
                    <div className="flex items-center gap-x-6">
                        <CopyClipboard
                            className="text-sm text-gray-7c8db5"
                            label={
                                <span
                                    data-tooltip-id="common-tip"
                                    data-tooltip-content="Event address"
                                >
                                    {shortString(task.address)}
                                </span>
                            }
                            componentProps={{
                                text: task.address,
                            }}
                        />
                    </div>
                </div>
                <div className="absolute lg:relative right-0 top-0">
                    <Button
                        variant="custom"
                        className="text-gray-7c8db5 hover:text-black"
                        onClick={onItemClose}
                    >
                        <FontAwesomeIcon icon={faTimes} size="lg" />
                    </Button>
                </div>
            </div>

            <div className="relative">
                <div className="pt-8 row flex-wrap">
                    <div className="col !basis-full md:!basis-0">
                        <div className="flex flex-col gap-4">
                            <div className="flex items-center gap-6">
                                <div className="basis-5/12 xl:basis-2/12 text-xs text-gray-53596d">
                                    Status
                                </div>
                                <TaskStatusBadge item={task} />
                            </div>
                            <div className="flex items-center gap-6">
                                <div className="basis-5/12 xl:basis-2/12 text-xs text-gray-53596d">
                                    Repository
                                </div>
                                <Link
                                    to={`/o/${dao.details.name}/r/${task.repository.name}`}
                                    className="text-blue-2b89ff text-sm"
                                >
                                    {task.repository.name}
                                </Link>
                            </div>
                            <div className="flex items-center gap-6">
                                <div className="basis-5/12 xl:basis-2/12 text-xs text-gray-53596d">
                                    Manager
                                </div>
                                <div className="text-sm">
                                    <MemberIcon type="user" className="mr-2" />
                                    {task.team?.managers[0].username}
                                </div>
                            </div>
                            <div className="flex items-center gap-6">
                                <div className="basis-5/12 xl:basis-2/12 text-xs text-gray-53596d">
                                    Budget
                                </div>
                                <div className="text-sm">
                                    {task.reward.toLocaleString()}
                                </div>
                            </div>
                            <div className="flex items-center gap-6">
                                <div className="basis-5/12 xl:basis-2/12 text-xs text-gray-53596d">
                                    Vesting
                                </div>
                                <div className="text-sm">
                                    {lockToStr(task.vestingEnd)}
                                </div>
                            </div>
                            <div className="flex items-center gap-6">
                                <div className="basis-5/12 xl:basis-2/12 text-xs text-gray-53596d">
                                    Tags
                                </div>
                                <div className="text-sm">
                                    {task.tags.map((item) => `#${item}`).join('  ')}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="col !basis-full md:!basis-[18rem] lg:!basis-[20.4375rem] !grow-0">
                        <MilestoneManage task={task as TMilestoneTaskDetails} />
                    </div>
                </div>

                <div className="mt-8 border border-gray-e6edff rounded-xl overflow-hidden">
                    <div className="divide-y divide-gray-e6edff">
                        <ListItemHeader />
                        {!task.subtasks.length && (
                            <div className="text-sm text-gray-7c8db5 text-center p-4">
                                There are no tasks
                            </div>
                        )}
                        {task.subtasks.map((subtask, index) => (
                            <ListItem key={index} item={subtask} />
                        ))}
                    </div>

                    {isManager && !task.isReady && (
                        <div className="px-5 mb-2">
                            <Button
                                type="button"
                                variant="custom"
                                className="!px-0 text-gray-53596d text-sm hover:text-black"
                                disabled={task.balance === 0}
                                onClick={onCreateMilestoneTask}
                            >
                                {task.balance === 0
                                    ? 'Not enough budget to add more tasks'
                                    : 'Add task...'}
                            </Button>
                        </div>
                    )}
                </div>

                <AnimatePresence>
                    {!!subtaskOpened && (
                        <motion.div
                            className="absolute top-0 w-full h-full bg-white"
                            initial={{ translateX: '100%' }}
                            animate={{ translateX: 0 }}
                            exit={{ translateX: '100%' }}
                            transition={{ duration: 0.25 }}
                        >
                            <SubtaskPage
                                address={subtaskOpened}
                                milestone={task as TMilestoneTaskDetails}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <Tooltip id="common-tip" clickable />
        </div>
    )
}

const MilestonePage = withErrorBoundary(MilestonePageInner, {
    fallbackRender: ({ error }) => (
        <Alert variant="danger">
            <h3 className="font-medium">Fetch milestone error</h3>
            <div>{error.message}</div>
        </Alert>
    ),
})

export default MilestonePage
