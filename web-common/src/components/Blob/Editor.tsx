import Editor from '@monaco-editor/react';

type TEditorPanelProps = {
    language?: string;
    value?: string;
    containerClassName?: string;
    className?: string;
    onChange?(value: string | undefined): void;
};

const BlobEditor = (props: TEditorPanelProps) => {
    const { containerClassName, className, onChange, ...rest } = props;

    return (
        <Editor
            className={containerClassName}
            wrapperProps={{
                className,
            }}
            onChange={onChange}
            {...rest}
        />
    );
};

export default BlobEditor;
