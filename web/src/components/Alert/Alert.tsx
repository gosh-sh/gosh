import {
  IconDefinition,
  faExclamationTriangle,
  faTimes,
} from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import classNames from 'classnames'
import { Button } from '../Form'

type TAlertProps = React.HTMLAttributes<HTMLDivElement> & {
  variant: 'danger' | 'warning'
  dismiss?: boolean
  onDismiss?(): any
}

const iconMap: Record<string, IconDefinition> = {
  danger: faExclamationTriangle,
  warning: faExclamationTriangle,
}

const variantMap: Record<string, string> = {
  danger: 'bg-red-ff3b30/5 text-red-ff3b30',
  warning: 'bg-yellow-faedcc/90 text-yellow-600',
}

const Alert = (props: TAlertProps) => {
  const { className, variant, dismiss = false, onDismiss, children } = props
  return (
    <div
      className={classNames(
        'flex flex-nowrap items-center gap-x-4',
        'py-3 px-5 text-sm rounded-xl shadow-sm',
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
          <Button
            variant="custom"
            className="!p-1 text-red-ff624d40 hover:text-red-ff3b30"
            onClick={onDismiss}
          >
            <FontAwesomeIcon icon={faTimes} size="lg" />
          </Button>
        </div>
      )}
    </div>
  )
}

export default Alert
