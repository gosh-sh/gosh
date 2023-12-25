import classNames from 'classnames'
import React from 'react'

type TBadgeTagProps = React.HTMLAttributes<HTMLDivElement> & {
  content: any
}

const BadgeTag = (props: TBadgeTagProps) => {
  const { content, className, style } = props

  return (
    <div
      className={classNames(
        'px-2 py-0.5 bg-gray-f6f6f9 rounded-md text-sm text-gray-53596d',
        className,
      )}
      style={style}
    >
      {content}
    </div>
  )
}

export { BadgeTag }
