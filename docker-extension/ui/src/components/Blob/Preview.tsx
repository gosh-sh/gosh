import React from "react";
import Editor from "@monaco-editor/react";
import ReactMarkdown from "react-markdown";
import classnames from "classnames/bind";

const cnb = classnames.bind({});


type TBlobPreviewProps = {
    language?: string;
    value?: string;
    className?: string;
}

const BlobPreview = (props: TBlobPreviewProps) => {
    const { language, value, className } = props;

    if (language === 'markdown') return (
        <div className={cnb('markdown-body px-4 py-4', className)}>
            <ReactMarkdown>{value || ''}</ReactMarkdown>
        </div>
    );
    return (
        <Editor
            wrapperProps={{
                className
            }}
            language={language}
            value={value}
            options={{
                readOnly: true,
                renderLineHighlight: 'none',
                contextmenu: false,
                automaticLayout: true,
                scrollBeyondLastLine: false,
                minimap: {
                    enabled: false
                },
                scrollbar: {
                    vertical: 'hidden',
                    verticalScrollbarSize: 0,
                    handleMouseWheel: false
                },
            }}
            onMount={(editor) => {
                // Set diff editor dom element calculated real height
                editor._domElement.style.height = `${editor.getContentHeight()}px`;
            }}
        />
    );
}

export default BlobPreview;
