import classNames from 'classnames'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCircleCheck, faSpinner } from '@fortawesome/free-solid-svg-icons'
import { faCircle } from '@fortawesome/free-regular-svg-icons'

const statusStyle: { [type: string]: string } = {
    base: 'inline-flex flex-nowrap items-center gap-3 py-2.5 px-5 rounded-[3.75rem]',
    disabled: 'border border-gray-e6edff bg-white text-gray-53596d',
    awaiting: 'border border-gray-e6edff bg-white text-gray-53596d',
    pending: 'bg-yellow-eecf29/10 text-yellow-eecf29',
    completed: 'bg-green-34c759/10 text-green-34c759',
}

const statusIcon: { [type: string]: any } = {
    disabled: faCircle,
    awaiting: faCircle,
    pending: faSpinner,
    completed: faCircleCheck,
}

const StatusBadge = (props: {
    type: 'disabled' | 'awaiting' | 'pending' | 'completed'
}) => {
    const { type } = props

    return (
        <div className={classNames(statusStyle.base, statusStyle[type])}>
            <FontAwesomeIcon icon={statusIcon[type]} spin={type === 'pending'} />
            <div className="text-sm font-medium first-letter:uppercase">
                {type === 'disabled' ? 'awaiting' : type}
            </div>
        </div>
    )
}

export default StatusBadge
