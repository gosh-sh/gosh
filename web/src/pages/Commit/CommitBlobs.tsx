import Spinner from '../../components/Spinner'
import BlobDiffPreview from '../../components/Blob/DiffPreview'

type TCommitBlobsType = {
    className?: string
    blobs: {
        isFetching: boolean
        items: {
            treepath: string
            commit: string
            current: string | Buffer
            previous: string | Buffer
            showDiff: boolean
            isFetching: boolean
        }[]
        onLoadDiff(index: number): void
    }
}

const CommitBlobs = (props: TCommitBlobsType) => {
    const { className, blobs } = props
    const { isFetching, items, onLoadDiff } = blobs

    return (
        <div className={className}>
            {isFetching && (
                <div className="text-gray-606060 text-sm">
                    <Spinner className="mr-3" />
                    Loading commit diff...
                </div>
            )}

            {items.map(({ treepath, showDiff, current, previous, isFetching }, index) => (
                <div key={index} className="my-5 border rounded overflow-hidden">
                    <div className="bg-gray-100 border-b px-3 py-1.5 text-sm font-semibold">
                        {treepath}
                    </div>
                    {showDiff ? (
                        <BlobDiffPreview modified={current} original={previous} />
                    ) : (
                        <button
                            className="!block btn btn--body !text-sm mx-auto px-3 py-1.5 my-4"
                            disabled={isFetching}
                            onClick={() => onLoadDiff(index)}
                        >
                            {isFetching && <Spinner className="mr-2" size="sm" />}
                            Load diff
                        </button>
                    )}
                </div>
            ))}
        </div>
    )
}

export default CommitBlobs
