import {
    IconDefinition,
    faExclamationTriangle,
    faTimes,
} from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import classNames from 'classnames'

type TAlertProps = React.PropsWithChildren<any> & {
    variant: 'danger'
    dismiss?: boolean
    onDismiss?(): any
}

const iconMap: Record<string, IconDefinition> = {
    danger: faExclamationTriangle,
}

const variantMap: Record<string, string> = {
    danger: 'bg-red-dd3a3a text-white',
}

const Alert = (props: TAlertProps) => {
    const { className, variant, dismiss = false, onDismiss, children } = props
    return (
        <div
            className={classNames(
                'flex flex-nowrap items-center gap-x-4',
                'py-3 px-5 text-sm rounded-xl',
                variantMap[variant],
                className,
            )}
        >
            <div>
                <FontAwesomeIcon icon={iconMap[variant]} size="lg" />
            </div>
            <div className="grow">{children}</div>
            {dismiss && (
                <div className="self-start">
                    <button onClick={onDismiss}>
                        <FontAwesomeIcon icon={faTimes} size="lg" />
                    </button>
                </div>
            )}
        </div>
    )
}

export default Alert
