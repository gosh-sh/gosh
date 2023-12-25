import { FontAwesomeIcon, FontAwesomeIconProps } from '@fortawesome/react-fontawesome'
import { faSpinner } from '@fortawesome/free-solid-svg-icons'
import classNames from 'classnames'

type TSpinnerProps = Omit<FontAwesomeIconProps, 'icon'>

const Spinner = (props: TSpinnerProps) => {
  const { className, ...rest } = props
  return (
    <FontAwesomeIcon
      className={classNames('spinner', className)}
      {...rest}
      icon={faSpinner}
      spin
      speed={'100s'}
    />
  )
}

export default Spinner
