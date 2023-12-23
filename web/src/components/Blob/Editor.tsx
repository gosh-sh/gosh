import Editor from '@monaco-editor/react'
import classNames from 'classnames'

type TEditorPanelProps = {
  language?: string
  value?: string
  className?: string
  disabled?: boolean
  editorClassName?: string
  onChange?(value: string | undefined): void
}

const BlobEditor = (props: TEditorPanelProps) => {
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

export default BlobEditor
