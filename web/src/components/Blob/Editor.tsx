import Editor from '@monaco-editor/react'

type TEditorPanelProps = {
    language?: string
    value?: string
    className?: string
    disabled?: boolean
    onChange?(value: string | undefined): void
}

const BlobEditor = (props: TEditorPanelProps) => {
    const { className, disabled, ...rest } = props

    return (
        <Editor
            className="min-h-[500px]"
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
