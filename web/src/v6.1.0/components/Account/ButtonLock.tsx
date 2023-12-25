import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Button } from '../../../components/Form'
import { faChevronUp, faLock } from '@fortawesome/free-solid-svg-icons'

type TButtonLockProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  isLocked: boolean
}

const ButtonLock = (props: TButtonLockProps) => {
  const { isLocked, ...rest } = props
  return (
    <Button
      type="button"
      variant="custom"
      className="text-gray-7c8db5 outline-none !px-0"
      {...rest}
    >
      {isLocked ? 'Show' : 'Hide'}
      <FontAwesomeIcon
        icon={isLocked ? faLock : faChevronUp}
        size="sm"
        className="ml-2"
      />
    </Button>
  )
}

export { ButtonLock }
