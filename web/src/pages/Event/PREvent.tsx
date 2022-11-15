import Spinner from '../../components/Spinner'
import { getCommitTime, TSmvEvent, usePullRequestCommit } from 'react-gosh'
import BlobDiffPreview from '../../components/Blob/DiffPreview'
import CopyClipboard from '../../components/CopyClipboard'
import { shortString } from 'react-gosh'
import Committer from '../../components/Commit/Committer'

type TCommitBlobsType = {
    className?: string
    daoName: string
    event: TSmvEvent
}

const PREvent = (props: TCommitBlobsType) => {
    const { className, daoName, event } = props
    const { data, status } = event
    const { isFetching, commit, blobs } = usePullRequestCommit(
        daoName!,
        data.repoName,
        data.commit,
    )

    return (
        <div className={className}>
            {status.completed && status.accepted && (
                <div className="bg-green-700 text-white mt-6 px-4 py-3 rounded">
                    PR proposal was accepted by SMV
                </div>
            )}

            <h4 className="mt-10 mb-3 text-lg font-semibold">PR details</h4>
            {isFetching && (
                <div className="text-gray-606060 text-sm">
                    <Spinner className="mr-3" />
                    Loading commit diff...
                </div>
            )}

            {!isFetching && commit && (
                <>
                    <div>{commit.title}</div>
                    <pre className="mb-2 text-gray-050a15/65 text-sm">
                        {commit.message}
                    </pre>
                    <div className="flex flex-wrap border-t gap-x-6 py-1 text-gray-050a15/75 text-xs">
                        <div>
                            {data.repoName}:{data.branchName}
                        </div>
                        <div className="flex items-center">
                            <span className="mr-2 text-gray-050a15/65">Commit by</span>
                            <Committer committer={commit.committer} />
                        </div>
                        <div>
                            <span className="mr-2 text-gray-050a15/65">at</span>
                            {getCommitTime(commit.committer || '').toLocaleString()}
                        </div>
                        <div className="grow flex items-center justify-start sm:justify-end">
                            <span className="mr-2 text-gray-050a15/65">commit</span>
                            <CopyClipboard
                                label={shortString(data.commit, 10, 10)}
                                componentProps={{
                                    text: commit.name,
                                }}
                            />
                        </div>
                    </div>
                </>
            )}

            <h4 className="mt-10 mb-3 text-lg font-semibold">PR diff</h4>
            {blobs.isFetching && (
                <div className="text-gray-606060 text-sm">
                    <Spinner className="mr-3" />
                    Loading commit diff...
                </div>
            )}

            {blobs.items.map(
                ({ item, current, previous, showDiff, isFetching }, index) => (
                    <div key={index} className="my-5 border rounded overflow-hidden">
                        <div className="bg-gray-100 border-b px-3 py-1.5 text-sm font-semibold">
                            {item.treepath}
                        </div>
                        {showDiff ? (
                            <BlobDiffPreview modified={current} original={previous} />
                        ) : (
                            <button
                                className="!block btn btn--body !text-sm mx-auto px-3 py-1.5 my-4"
                                disabled={isFetching}
                                onClick={() => blobs.getDiff(index)}
                            >
                                {isFetching && <Spinner className="mr-2" size="sm" />}
                                Load diff
                            </button>
                        )}
                    </div>
                ),
            )}
        </div>
    )
}

export default PREvent
