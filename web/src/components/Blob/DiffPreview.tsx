import React from "react";
import { DiffEditor } from "@monaco-editor/react";
import { Buffer } from "buffer";


type TBlobDiffPreviewProps = {
    originalLanguage?: string;
    original?: string | Buffer;
    modifiedLanguage?: string;
    modified?: string | Buffer;
    className?: string;
}

const BlobDiffPreview = (props: TBlobDiffPreviewProps) => {
    const { original, modified, originalLanguage, modifiedLanguage, className } = props;

    if (Buffer.isBuffer(modified) || Buffer.isBuffer(original)) return (
        <p className="text-gray-606060 p-3 text-sm">Binary data not shown</p>
    );
    return (
        <DiffEditor
            wrapperProps={{
                className
            }}
            original={original}
            originalLanguage={originalLanguage}
            modified={modified}
            modifiedLanguage={modifiedLanguage}
            options={{
                enableSplitViewResizing: false,
                renderSideBySide: false,
                readOnly: true,
                renderLineHighlight: 'none',
                contextmenu: false,
                automaticLayout: true,
                // renderOverviewRuler: false,
                scrollBeyondLastLine: false,
                // scrollbar: {
                //     vertical: 'hidden',
                //     verticalScrollbarSize: 0,
                //     handleMouseWheel: false
                // },
            }}
            onMount={(editor) => {
                editor.onDidUpdateDiff(() => {
                    // Set diff editor dom element calculated real height
                    const originalHeight = editor.getOriginalEditor().getContentHeight();
                    const modifiedHeight = editor.getModifiedEditor().getContentHeight();
                    // editor._domElement.style.height = `${originalHeight + modifiedHeight}px`;

                    let calc = originalHeight + modifiedHeight;
                    const max = Math.max(originalHeight, modifiedHeight);
                    if (max > 500) calc = 500;

                    const node = editor.getContainerDomNode();
                    if(node) node.style.height = `${calc}px`;
                });
            }}
        />
    );
}

export default BlobDiffPreview;
