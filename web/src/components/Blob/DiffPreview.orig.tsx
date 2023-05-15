import { useEffect, useState, useId } from 'react'
import { renderToString } from 'react-dom/server'
import { Buffer } from 'buffer'
import * as Diff from 'diff'
import * as Diff2Html from 'diff2html'
import { classNames } from 'react-gosh'
import Spinner from '../Spinner'

type TBlobDiffPreviewProps = {
    className?: string
    filename?: string
    original?: string | Buffer
    modified?: string | Buffer
    isDiffLoaded?: boolean
    isDiffFetching?: boolean

    getDiff(): void
}

const BlobDiffPreview = (props: TBlobDiffPreviewProps) => {
    const {
        className,
        filename = 'unknown',
        original = '',
        modified = '',
        isDiffLoaded = false,
        isDiffFetching = false,
        getDiff,
    } = props
    const uniqueId = useId()
    const [isDiffShort, setIsDiffShort] = useState<boolean>(true)

    const getDiffButton = (
        <button
            id={`${uniqueId}get-diff`}
            className="!block text-sm mx-auto px-3 py-1.5 my-4 text-black font-medium underline underline-offset-4 decoration-dashed"
            disabled={isDiffFetching}
        >
            {isDiffFetching && <Spinner className="mr-2" size="sm" />}
            Load diff
        </button>
    )

    const toggleDiffButton = (
        <button
            id={`${uniqueId}toggle-diff`}
            className="font-body text-xs underline underline-offset-2 decoration-1 decoration-dashed"
        >
            {isDiffShort ? 'Expand' : 'Collapse'}
        </button>
    )

    const createDiffCodeBlock = () => {
        const isBuffer = Buffer.isBuffer(original) || Buffer.isBuffer(modified)

        const _original = isBuffer || !isDiffLoaded ? '' : original
        const _modified = isBuffer || !isDiffLoaded ? '' : modified

        let genericEmptyDiff = 'File without changes'
        if (!isDiffLoaded) genericEmptyDiff = renderToString(getDiffButton)
        else if (isBuffer) genericEmptyDiff = 'Binary data not shown'

        const patch = Diff.createPatch(
            filename,
            _original,
            _modified,
            undefined,
            undefined,
            {
                context: isDiffShort ? 0 : 20000,
            },
        )
        return Diff2Html.html(patch, {
            drawFileList: false,
            rawTemplates: {
                'tag-file-added': '',
                'tag-file-changed': '',
                'tag-file-deleted': '',
                'tag-file-renamed': '',
                'generic-file-path': `
                    <div class="d2h-file-name-wrapper py-1.5 text-sm overflow-hidden">
                        {{>fileIcon}}
                        <span class="d2h-file-name text-sm">{{fileDiffName}}</span>
                        {{>fileTag}}
                    </div>
                    ${isDiffLoaded ? renderToString(toggleDiffButton) : ''}
                `,
                'generic-empty-diff': `
                <tr>
                    <td class="{{CSSLineClass.INFO}}">
                        <div class="{{contentClass}}">
                            ${genericEmptyDiff}
                        </div>
                    </td>
                </tr>
                `,
            },
        })
    }

    useEffect(() => {
        const toggleDiff = () => {
            setIsDiffShort(!isDiffShort)
        }

        const getDiffButtonElement = document.getElementById(`${uniqueId}get-diff`)
        getDiffButtonElement?.addEventListener('click', getDiff)

        const toggleDiffButtonElement = document.getElementById(`${uniqueId}toggle-diff`)
        toggleDiffButtonElement?.addEventListener('click', toggleDiff)

        return () => {
            getDiffButtonElement?.removeEventListener('click', getDiff)
            toggleDiffButtonElement?.removeEventListener('click', toggleDiff)
        }
    }, [getDiff, uniqueId, isDiffShort])

    return (
        <div
            className={classNames('relative text-sm', className)}
            dangerouslySetInnerHTML={{
                __html: createDiffCodeBlock(),
            }}
        />
    )
}

export default BlobDiffPreview
