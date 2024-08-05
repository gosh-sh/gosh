import classNames from 'classnames'
import React from 'react'

type TBadgeProps = React.HTMLAttributes<HTMLDivElement> & {
  content: any
}

const Badge = (props: TBadgeProps) => {
  const { content, className, style } = props

  return (
    <div
      className={classNames(
        'px-2 py-0.5 rounded-[2.25rem] overflow-hidden text-xs text-white',
        className,
      )}
      style={style}
    >
      {content}
    </div>
  )
}

export { Badge }
