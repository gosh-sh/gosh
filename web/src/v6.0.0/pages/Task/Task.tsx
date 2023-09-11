import { Tooltip } from 'react-tooltip'
import { useCallback, useEffect, useRef } from 'react'
import { useDao, useDaoTaskList, useTask } from '../../hooks/dao.hooks'
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
import { TaskManage, TaskTeam } from './components'
import { useBodyScrollLock } from '../../../hooks/common.hooks'

const TaskPageInner = (props: { address: string }) => {
    const { address } = props
    const dao = useDao()
    const taskList = useDaoTaskList()
    const { task, error } = useTask(address, { initialize: true })
    const { showBoundary } = useErrorBoundary()
    const ref = useRef<HTMLDivElement>(null)
    useBodyScrollLock({
        applyWhen: !!task?.isOpen,
        deps: [task?.isOpen],
        mobileOnly: true,
    })

    const onItemClose = useCallback(() => {
        window.history.replaceState(null, document.title, `/o/${dao.details.name}/tasks`)
        taskList.closeItems()
    }, [dao.details.name])

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
        const onClick = ({ target }: any) => {
            // If no ref or click inide event block, do nothing
            if (!ref.current || (ref.current && ref.current.contains(target))) {
                return
            }

            // Click outside event block, but need to check click on event list item
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

            <div className="mt-8 row flex-wrap">
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
                                Reward
                            </div>
                            <div className="text-sm">{task.reward.toLocaleString()}</div>
                        </div>
                        <div className="flex items-center gap-6">
                            <div className="basis-5/12 xl:basis-2/12 text-xs text-gray-53596d">
                                Vesting
                            </div>
                            <div className="text-sm">{lockToStr(task.vestingEnd)}</div>
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

                    {task.team && (
                        <>
                            <hr className="bg-gray-e6edff my-4" />

                            <h3 className="mb-3">Team</h3>
                            <TaskTeam task={task} />
                        </>
                    )}
                </div>

                <div className="col !basis-full md:!basis-[18rem] lg:!basis-[20.4375rem] !grow-0">
                    <TaskManage task={task} />
                </div>
            </div>
            <Tooltip id="common-tip" clickable />
        </div>
    )
}

const TaskPage = withErrorBoundary(TaskPageInner, {
    fallbackRender: ({ error }) => (
        <Alert variant="danger">
            <h3 className="font-medium">Fetch task error</h3>
            <div>{error.message}</div>
        </Alert>
    ),
})

export default TaskPage
