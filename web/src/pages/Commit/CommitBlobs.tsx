import { useEffect, useState } from 'react'
import Spinner from '../../components/Spinner'
import BlobDiffPreview from '../../components/Blob/DiffPreview'
import { IGoshRepositoryAdapter } from 'react-gosh/dist/gosh/interfaces'

type TCommitBlobsType = {
    className?: string
    repo: IGoshRepositoryAdapter
    commit: string
}

const CommitBlobs = (props: TCommitBlobsType) => {
    const { className, repo, commit } = props
    const [isFetched, setIsFetched] = useState<boolean>(false)
    const [blobs, setBlobs] = useState<any[]>([])

    const onLoadDiff = async (index: number) => {
        setBlobs((curr) =>
            curr.map((item, i) => {
                if (i === index) return { ...item, isFetching: true }
                else return item
            }),
        )
        const { commit, treepath } = blobs[index]
        const { previous, current } = await repo.getCommitBlob(treepath, commit)
        setBlobs((state) =>
            state.map((item, i) => {
                if (i === index) {
                    return {
                        ...item,
                        current,
                        previous,
                        isFetching: false,
                        showDiff: true,
                    }
                } else return item
            }),
        )
    }

    useEffect(() => {
        const getCommitBlobs = async () => {
            setIsFetched(false)
            const blobs = await repo.getCommitBlobs(commit)
            const state = await Promise.all(
                blobs.sort().map(async (treepath, i) => {
                    const diff =
                        i < 5
                            ? await repo.getCommitBlob(treepath, commit)
                            : { previous: '', current: '' }
                    return {
                        treepath,
                        commit,
                        ...diff,
                        showDiff: i < 5,
                        isFetching: false,
                    }
                }),
            )
            setBlobs(state)
            setIsFetched(true)
        }

        getCommitBlobs()
    }, [repo, commit])

    return (
        <div className={className}>
            {!isFetched && (
                <div className="text-gray-606060 text-sm">
                    <Spinner className="mr-3" />
                    Loading commit diff...
                </div>
            )}

            {isFetched &&
                blobs.map((blob, index) => (
                    <div key={index} className="my-5 border rounded overflow-hidden">
                        <div className="bg-gray-100 border-b px-3 py-1.5 text-sm font-semibold">
                            {blob.treepath}
                        </div>
                        {blob.showDiff ? (
                            <BlobDiffPreview
                                modified={blob.current}
                                original={blob.previous}
                            />
                        ) : (
                            <button
                                className="!block btn btn--body !text-sm mx-auto px-3 py-1.5 my-4"
                                disabled={blob.isFetching}
                                onClick={() => onLoadDiff(index)}
                            >
                                {blob.isFetching && (
                                    <Spinner className="mr-2" size="sm" />
                                )}
                                Load diff
                            </button>
                        )}
                    </div>
                ))}
        </div>
    )
}

export default CommitBlobs
