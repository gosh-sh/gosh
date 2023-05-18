import { useState, useId, useMemo } from 'react'
import { Buffer } from 'buffer'
import * as Diff from 'diff'
import * as Diff2Html from 'diff2html'
import Spinner from '../../Spinner'
import { Button } from '../../Form'
import { CodeComments } from '../Comments'
import LinesBlock from './LinesBlock'

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
    const [mouseDown, setMouseDown] = useState<boolean>(false)

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

    const onDiffToggle = () => {
        setIsDiffShort(!isDiffShort)
    }

    const isBuffer = useMemo(() => {
        return Buffer.isBuffer(original) || Buffer.isBuffer(modified)
    }, [original, modified])

    const diff = useMemo(() => {
        if (isBuffer) {
            return []
        }

        const patch = Diff.createPatch(
            filename,
            original as string,
            modified as string,
            undefined,
            undefined,
            {
                context: isDiffShort ? 3 : 20000,
            },
        )
        const _diff = Diff2Html.parse(patch)
        const _blocks = []
        for (const item of _diff) {
            _blocks.push(...item.blocks)
        }
        console.debug('Diff', _diff)
        console.debug('Blocks', _blocks)
        return _blocks
    }, [filename, original, modified, isDiffShort])

    return (
        <div className="overflow-clip border border-gray-e6edff rounded-xl">
            <div className="flex items-center justify-between px-3 py-1 border-b border-b-gray-e6edff bg-gray-fafafd">
                <div className="text-xs">{filename}</div>
                <div>
                    <Button
                        variant="custom"
                        className="text-xs underline underline-offset-2 decoration-1 decoration-dashed !px-0 !py-1"
                        onClick={onDiffToggle}
                    >
                        {isDiffShort ? 'Expand' : 'Collapse'}
                    </Button>
                </div>
            </div>
            <div className="flex items-start">
                <div className="grow text-xs">
                    <table className="w-full" onMouseLeave={() => setMouseDown(false)}>
                        <tbody>
                            {diff.map((block, i) => (
                                <LinesBlock
                                    key={i}
                                    filename={filename}
                                    block={block}
                                    mouseDown={mouseDown}
                                    setMouseDown={setMouseDown}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="shrink-0 w-72 bg-white p-2">
                    <CodeComments filename={filename} />
                </div>
            </div>
        </div>
    )
}

export default BlobDiffPreview
