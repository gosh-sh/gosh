import classNames from 'classnames'
import { TDaoEventDetails } from '../../types/dao.types'

type TEventStatusBadgeProps = React.HTMLAttributes<HTMLDivElement> & {
    event: TDaoEventDetails
}

const styles = {
    base: 'inline-block rounded-lg py-1 px-2 text-xs overflow-hidden whitespace-nowrap',
    progress: 'bg-gray-d6e4ee',
    accepted: 'bg-green-2fbf5340',
    rejected: 'bg-red-ff624d40',
}

const getBadgeData = (event: TDaoEventDetails) => {
    const { time, status } = event

    if (status.completed) {
        return {
            style: status.accepted ? styles.accepted : styles.rejected,
            content: status.accepted ? 'Accepted' : 'Rejected',
        }
    }

    return {
        style: styles.progress,
        content: time.finish === 0 ? 'Review required' : 'In progress',
    }
}

const DaoEventStatusBadge = (props: TEventStatusBadgeProps) => {
    const { event, className } = props

    const { style, content } = getBadgeData(event)

    return <div className={classNames(styles.base, style, className)}>{content}</div>
}

export { DaoEventStatusBadge }
