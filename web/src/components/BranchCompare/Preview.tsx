import { useMonaco } from '@monaco-editor/react'
import { faArrowRight } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { classNames, getCodeLanguageFromFilename } from 'react-gosh'
import { TBranch } from 'react-gosh/dist/types/repo.types'
import BlobDiffPreview from '../Blob/DiffPreview'
import Spinner from '../Spinner'

type TBranchComparePreviewProps = {
    className?: string
    srcBranch?: TBranch
    dstBranch?: TBranch
    progress: {
        isFetching: boolean
        isEmpty: boolean
        items: {
            treepath: string
            original: string | Buffer
            modified: string | Buffer
            showDiff: boolean
        }[]
        getDiff(i: number): void
    }
}

const BranchComparePreview = (props: TBranchComparePreviewProps) => {
    const { className, srcBranch, dstBranch, progress } = props
    const { isEmpty, isFetching, items, getDiff } = progress

    const monaco = useMonaco()

    return (
        <div className={classNames(className)}>
            {isFetching && (
                <div className="text-sm text-gray-606060">
                    <Spinner className="mr-3" />
                    Loading diff...
                </div>
            )}

            {isEmpty && (
                <div className="text-sm text-gray-606060 text-center">
                    There is nothing to merge
                </div>
            )}

            {!isFetching && !isEmpty && (
                <>
                    <div className="text-lg">
                        Merge branch
                        <span className="font-semibold mx-2">{srcBranch?.name}</span>
                        <FontAwesomeIcon icon={faArrowRight} size="sm" />
                        <span className="font-semibold ml-2">{dstBranch?.name}</span>
                    </div>

                    {items.map(({ treepath, original, modified, showDiff }, index) => {
                        const language = getCodeLanguageFromFilename(monaco, treepath)
                        return (
                            <div
                                key={index}
                                className="my-5 border rounded overflow-hidden"
                            >
                                <div className="bg-gray-100 border-b px-3 py-1.5 text-sm font-semibold">
                                    {treepath}
                                </div>
                                {showDiff ? (
                                    <BlobDiffPreview
                                        original={original}
                                        modified={modified}
                                        modifiedLanguage={language}
                                    />
                                ) : (
                                    <button
                                        className="!block btn btn--body !text-sm mx-auto px-3 py-1.5 my-2"
                                        onClick={() => getDiff(index)}
                                    >
                                        Load diff
                                    </button>
                                )}
                            </div>
                        )
                    })}
                </>
            )}
        </div>
    )
}

export { BranchComparePreview }
