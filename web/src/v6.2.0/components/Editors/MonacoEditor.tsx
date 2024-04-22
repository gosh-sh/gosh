import Editor from '@monaco-editor/react'
import classNames from 'classnames'

export type TMonacoEditorPanelProps = {
  language?: string
  value?: string
  className?: string
  disabled?: boolean
  editorClassName?: string
  onChange?(value: string | undefined): void
}

const MonacoEditor = (props: TMonacoEditorPanelProps) => {
  const { className, disabled, editorClassName, ...rest } = props

  return (
    <Editor
      className={classNames('min-h-[500px]', editorClassName)}
      wrapperProps={{
        className,
      }}
      options={{
        readOnly: disabled,
      }}
      {...rest}
    />
  )
}

export { MonacoEditor }
