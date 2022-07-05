import React from "react";
import Editor from "@monaco-editor/react";


type TEditorPanelProps = {
    language?: string;
    value?: string;
    className?: string;
    onChange?(value: string | undefined): void;
}

const BlobEditor = (props: TEditorPanelProps) => {
    const { className, onChange, ...rest } = props;

    return (
        <Editor
            className="min-h-[500px]"
            wrapperProps={{
                className
            }}
            onChange={onChange}
            {...rest}
        />
    );
}

export default BlobEditor;
