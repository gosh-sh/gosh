import { useState } from 'react'
import { classNames, ETaskBounty, TDao, TTaskListItem } from 'react-gosh'
import { IGoshRepositoryAdapter } from 'react-gosh/dist/gosh/interfaces'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import ToastError from '../../../components/Error/ToastError'
import { Button } from '../../../components/Form'

type TTaskListItemProps = {
    item: TTaskListItem
    dao: TDao
    repository: IGoshRepositoryAdapter
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
    const { item, dao, repository } = props
    const navigate = useNavigate()
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
    const [isConfirming, setIsConfirming] = useState<boolean>(false)
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
            await repository.deleteTask({ name: item.name })
            navigate(`/o/${dao.name}/events`)
        } catch (e: any) {
            console.error(e.message)
            toast.error(<ToastError error={e} />)
        } finally {
            setIsSubmitting(false)
            setIsConfirming(false)
        }
    }

    const onTaskConfirm = async () => {
        setIsSubmitting(true)
        setIsConfirming(true)

        try {
            await repository.confirmTask({ name: item.name, index: 0 })
            navigate(`/o/${dao.name}/events`)
        } catch (e: any) {
            console.error(e.message)
            toast.error(<ToastError error={e} />)
        } finally {
            setIsSubmitting(false)
            setIsConfirming(false)
        }
    }

    const onTaskClaim = async () => {
        setIsSubmitting(true)
        setIsClaiming(true)

        try {
            await Promise.all([
                (async () => {
                    await repository.receiveTaskBounty(item.name, ETaskBounty.ASSING)
                })(),
                (async () => {
                    await repository.receiveTaskBounty(item.name, ETaskBounty.REVIEW)
                })(),
                (async () => {
                    await repository.receiveTaskBounty(item.name, ETaskBounty.MANAGER)
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
            <div className="mb-6 flex gap-3 items-center justify-between">
                <div className="grow text-xl font-medium">
                    {item.name}
                    <span className="align-super ml-2">
                        <StatusBadge item={item} />
                    </span>
                </div>
                <div>
                    <span className="text-xl font-medium">{getTaskCost()}</span>
                </div>
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
                {!item.confirmed && !!item.candidates.length && (
                    <Button
                        className="!bg-green-34c759"
                        onClick={onTaskConfirm}
                        disabled={isSubmitting}
                        isLoading={isConfirming}
                    >
                        Confirm and create proposal
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
