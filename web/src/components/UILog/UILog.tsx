import { ReactNode } from 'react'
import { classNames } from 'react-gosh'

type TUILogProps = {
  children: ReactNode
  className?: string
}

const UILog = (props: TUILogProps) => {
  const { children, className } = props

  return (
    <div
      className={classNames(
        'text-sm text-gray-7c8db5 bg-gray-fafafd p-3',
        'border border-gray-e6edff rounded-lg',
        className,
      )}
    >
      <code className="flex flex-col gap-2">{children}</code>
    </div>
  )
}

export { UILog }
