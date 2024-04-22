import classNames from 'classnames'
import SunEditorReact from 'suneditor-react'
import { SunEditorReactProps } from 'suneditor-react/dist/types/SunEditorReactProps'

export type TSunEditorProps = React.HTMLAttributes<HTMLDivElement> & SunEditorReactProps

const SunEditor = (props: TSunEditorProps) => {
  const { className, ...rest } = props

  return (
    <div className={classNames(className)}>
      <SunEditorReact
        height="30rem"
        setOptions={{
          buttonList: [
            ['undo', 'redo'],
            ['formatBlock'],
            ['bold', 'underline', 'italic'],
            ['list', 'table', 'link', 'image'],
            ['removeFormat'],
          ],
          imageFileInput: true,
          imageUrlInput: false,
          imageUploadSizeLimit: 1024 * 1024, // 1MB
        }}
        {...rest}
      />
    </div>
  )
}

export { SunEditor }
