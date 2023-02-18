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
        <tr className="hover:bg-gray-fafafd cursor-pointer">
            <td className="px-5 py-2">{item.name}</td>
            <td className="px-5 py-2 text-sm">{item.repository}</td>
            <td className="px-5 py-2">{getTaskCost()}</td>
            <td className="px-5 py-2">
                <StatusBadge item={item} />
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
