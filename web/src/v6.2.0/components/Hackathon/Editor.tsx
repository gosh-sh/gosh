import classNames from 'classnames'
import SunEditor from 'suneditor-react'
import { SunEditorReactProps } from 'suneditor-react/dist/types/SunEditorReactProps'

type TEditorProps = React.HTMLAttributes<HTMLDivElement> & SunEditorReactProps

const Editor = (props: TEditorProps) => {
    const { className, ...rest } = props

    return (
        <div className={classNames(className)}>
            <SunEditor
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

export { Editor }
