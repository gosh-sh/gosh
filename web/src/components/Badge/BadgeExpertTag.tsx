import classNames from 'classnames'
import randomColor from 'randomcolor'
import React from 'react'

type TBadgeExpertTagProps = React.HTMLAttributes<HTMLDivElement> & {
  seed: string
  content: any
}

const BadgeExpertTag = (props: TBadgeExpertTagProps) => {
  const { seed, content, className, style } = props

  return (
    <div
      className={classNames(
        'px-2 py-0.5 rounded-[2.25rem] overflow-hidden text-xs text-white',
        className,
      )}
      style={{
        color: randomColor({
          seed,
          luminosity: 'dark',
        }),
        backgroundColor: randomColor({
          seed,
          luminosity: 'light',
          format: 'rgba',
          alpha: 0.35,
        }),
        ...style,
      }}
    >
      {content}
    </div>
  )
}

export { BadgeExpertTag }
