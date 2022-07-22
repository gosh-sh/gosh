import React from "react";
import Editor from "@monaco-editor/react";
import ReactMarkdown from "react-markdown";
import { classNames } from "../../utils";
import { Buffer } from "buffer";


type TBlobPreviewProps = {
    language?: string;
    value?: string | Buffer;
    className?: string;
}

const BlobPreview = (props: TBlobPreviewProps) => {
    const { language, value, className } = props;

    if (Buffer.isBuffer(value)) return (
        <p className="text-gray-606060 p-3 text-sm">Binary data not shown</p>
    );
    if (language === 'markdown') return (
        <div className={classNames('markdown-body px-4 py-4', className)}>
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
                editor.onDidContentSizeChange(() => {
                    const node = editor.getDomNode();
                    if (node) node.style.height = `${editor.getContentHeight()}px`;
                })
            }}
        />
    );
}

export default BlobPreview;
