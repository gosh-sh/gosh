import classNames from 'classnames'
import Spinner from '../../Spinner'
import { forwardRef } from 'react'

export type TButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  isLoading?: boolean
  variant?: 'default' | 'custom' | 'outline-danger' | 'outline-secondary'
  size?: 'default' | 'sm' | 'lg' | 'xl'
  testId?: string
}

const styles: { [key: string]: string[] } = {
  base: [
    'text-center whitespace-nowrap transition-all',
    'border border-transparent rounded-lg',
    'disabled:pointer-events-none',
  ],
  default: [
    'bg-black text-white hover:text-white/75',
    'disabled:text-gray-7c8db5/50 disabled:bg-gray-fafafd',
  ],
  custom: [],
  'outline-danger': [
    'bg-white text-red-ff3b30 !border-red-ff3b30',
    'hover:bg-red-ff3b30 hover:text-white disabled:opacity-50',
  ],
  'outline-secondary': [
    'bg-gray-fafafd text-gray-53596d',
    '!border-gray-e6edff',
    'hover:text-black',
    'disabled:text-gray-e6edff',
  ],
}

const sizes: { [key: string]: string[] } = {
  default: ['text-sm py-2 px-4'],
  sm: ['text-xs py-1 px-2'],
  lg: ['text-sm px-8 py-2'],
  xl: ['text-sm px-8 py-2.5'],
}

const Button = forwardRef<HTMLButtonElement, TButtonProps>((props: TButtonProps, ref) => {
  const {
    isLoading,
    className,
    children,
    disabled,
    variant = 'default',
    size = 'default',
    testId,
    ...rest
  } = props

  return (
    <button
      className={classNames(
        ...styles.base,
        ...styles[variant],
        ...sizes[size],
        className,
      )}
      {...rest}
      ref={ref}
      disabled={disabled || isLoading}
      test-id={testId}
    >
      {isLoading && <Spinner className={classNames(children ? 'mr-2' : null)} />}
      {children}
    </button>
  )
})

export { Button }
