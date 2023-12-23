import { faArrowLeft } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import classNames from 'classnames'

type TPreviousStepProps = {
  onClick(): void | Promise<void>
}

const PreviousStep = (props: TPreviousStepProps) => {
  const { onClick } = props

  return (
    <div>
      <button
        type="button"
        onClick={onClick}
        className={classNames(
          'rounded-full border w-10 h-10 text-gray-200',
          'hover:text-gray-400 hover:bg-gray-50',
        )}
      >
        <FontAwesomeIcon icon={faArrowLeft} />
      </button>
    </div>
  )
}

export default PreviousStep
