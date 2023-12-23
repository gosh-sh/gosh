import { useState } from 'react'
import classNames from 'classnames'

type TSliderProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: React.ReactNode
}

const Slider = (props: TSliderProps) => {
  const { label, className, type = 'range', onChange, ...rest } = props
  const [value, setValue] = useState<any>(rest.value || 0)

  return (
    <div className={classNames('slider-custom', className)}>
      <div className="whitespace-nowrap w-1/4">
        {value}
        {label}
      </div>
      <input
        {...rest}
        type={type}
        onChange={(e) => {
          setValue(e.target.value)
          if (onChange) {
            onChange(e)
          }
        }}
      />
    </div>
  )
}

export { Slider }
