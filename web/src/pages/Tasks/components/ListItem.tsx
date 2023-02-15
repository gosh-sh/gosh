import { useState } from 'react'
import { classNames, ETaskBounty, TDao, TTaskListItem } from 'react-gosh'
import { IGoshDaoAdapter } from 'react-gosh/dist/gosh/interfaces'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import ToastError from '../../../components/Error/ToastError'
import { Button } from '../../../components/Form'

type TTaskListItemProps = {
    item: TTaskListItem
    dao: {
        adapter: IGoshDaoAdapter
        details: TDao
    }
}

const StatusBadge = (props: { item: TTaskListItem }) => {
    const { item } = props

    if (!item.candidates.length) {
        return (
            <span className="bg-gray-d6e4ee text-xs rounded px-2">Awaiting commits</span>
        )
    }
    if (!item.confirmed) {
        return (
            <span className="bg-gray-d6e4ee text-xs rounded px-2">Awaiting decision</span>
        )
    }
    if (item.confirmed) {
        return <span className="bg-gray-d6e4ee text-xs rounded px-2">Confirmed</span>
    }
    return null
}

const TaskListItem = (props: TTaskListItemProps) => {
    const { item, dao } = props
    const navigate = useNavigate()
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
    const [isDeleting, setIsDeleting] = useState<boolean>(false)
    const [isClaiming, setIsClaiming] = useState<boolean>(false)

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

    const onTaskDelete = async () => {
        setIsSubmitting(true)
        setIsDeleting(true)
        try {
            await dao.adapter.deleteTask({ repository: item.repository, name: item.name })
            navigate(`/o/${dao.details.name}/events`)
        } catch (e: any) {
            console.error(e.message)
            toast.error(<ToastError error={e} />)
        } finally {
            setIsSubmitting(false)
            setIsDeleting(false)
        }
    }

    const onTaskClaim = async () => {
        setIsSubmitting(true)
        setIsClaiming(true)
        try {
            await Promise.all([
                (async () => {
                    await dao.adapter.receiveTaskBounty({
                        repository: item.repository,
                        name: item.name,
                        type: ETaskBounty.ASSING,
                    })
                })(),
                (async () => {
                    await dao.adapter.receiveTaskBounty({
                        repository: item.repository,
                        name: item.name,
                        type: ETaskBounty.REVIEW,
                    })
                })(),
                (async () => {
                    await dao.adapter.receiveTaskBounty({
                        repository: item.repository,
                        name: item.name,
                        type: ETaskBounty.MANAGER,
                    })
                })(),
            ])
            toast.success('Claim rewards request sent. Check you wallet balance')
        } catch (e: any) {
            console.error(e.message)
            toast.error(<ToastError error={e} />)
        } finally {
            setIsSubmitting(false)
            setIsClaiming(false)
        }
    }

    return (
        <div className="px-5 py-6">
            <div className="flex gap-3 items-center justify-between">
                <div className="grow text-xl font-medium">
                    {item.name}
                    <span className="mx-2 align-super">
                        <StatusBadge item={item} />
                    </span>
                    {item.tags.map((tag, index) => (
                        <span
                            key={index}
                            className={classNames(
                                'mx-1 border border-gray-e6edff rounded px-2',
                                'text-xs text-gray-7c8db5 align-super',
                            )}
                        >
                            {tag}
                        </span>
                    ))}
                </div>
                <div>
                    <span className="text-xl font-medium">{getTaskCost()}</span>
                </div>
            </div>
            <div className="mb-6">
                <span className="text-gray-7c8db5 text-sm">
                    Repository: {item.repository}
                </span>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-x-5 gap-y-2">
                {!item.confirmed && (
                    <Button
                        className={classNames(
                            '!bg-gray-fafafd border border-gray-e6edff text-black',
                            'hover:!text-black/50',
                        )}
                        onClick={onTaskDelete}
                        disabled={isSubmitting}
                        isLoading={isDeleting}
                    >
                        Delete
                    </Button>
                )}
                {item.confirmed && (
                    <Button
                        onClick={onTaskClaim}
                        disabled={isSubmitting}
                        isLoading={isClaiming}
                    >
                        Claim reward
                    </Button>
                )}
            </div>
        </div>
    )
}

export { TaskListItem }
