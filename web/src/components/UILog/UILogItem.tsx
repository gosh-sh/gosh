import { faCheck, faTimes } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { ReactNode } from 'react'
import { classNames } from 'react-gosh'
import Spinner from '../Spinner'

type TUILogItemProps = {
  result?: boolean
  children: ReactNode
}

const UILogItem = (props: TUILogItemProps) => {
  const { children, result } = props

  return (
    <div>
      <span className="mr-3">
        {result === undefined && <Spinner size="sm" />}
        {result !== undefined && (
          <FontAwesomeIcon
            icon={result ? faCheck : faTimes}
            fixedWidth
            className={classNames(result ? 'text-green-900' : 'text-rose-600')}
          />
        )}
      </span>
      {children}
    </div>
  )
}

export { UILogItem }
