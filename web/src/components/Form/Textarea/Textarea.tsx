import { forwardRef } from 'react'
import classNames from 'classnames'
import TextareaAutosize, { TextareaAutosizeProps } from 'react-textarea-autosize'

type TTextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> &
  TextareaAutosizeProps & {
    hasError?: boolean
    autoResize?: boolean
    inputClassName?: string
  }

const Textarea = forwardRef<HTMLTextAreaElement, TTextareaProps>((props, ref) => {
  const { className, hasError, autoResize = true, inputClassName, ...rest } = props

  return (
    <div
      className={classNames(
        'flex flex-nowrap items-stretch overflow-hidden',
        'border border-border-gray-e6edff rounded-lg',
        'focus-within:border-gray-7c8db5 relative',
        hasError ? 'border-rose-600' : null,
        className,
      )}
    >
      <TextareaAutosize
        ref={ref}
        className={classNames(
          'block grow outline-none bg-transparent px-4 py-2',
          'disabled:text-gray-7c8db5 text-sm',
          autoResize ? 'resize-none' : null,
          inputClassName,
        )}
        {...rest}
      />
    </div>
  )
})

export { Textarea }
