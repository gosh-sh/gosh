import { getCommitTime, TSmvEvent, usePullRequestCommit } from 'react-gosh'
import BlobDiffPreview from '../../../../components/Blob/DiffPreview'
import CopyClipboard from '../../../../components/CopyClipboard'
import { shortString } from 'react-gosh'
import Committer from '../../../../components/Commit/Committer'
import Loader from '../../../../components/Loader'

type TRepoPullRequestEventProps = {
    className?: string
    daoName: string
    event: TSmvEvent
}

const RepoPullRequestEvent = (props: TRepoPullRequestEventProps) => {
    const { className, daoName, event } = props
    const { data } = event
    const { isFetching, commit, blobs } = usePullRequestCommit(
        daoName!,
        data.repoName,
        data.commit,
    )

    return (
        <div className={className}>
            <div className="flex gap-3 text-gray-7c8db5 text-sm">
                <div>Repository:</div>
                <div>{data.repoName}</div>
            </div>
            <div className="flex gap-3 text-gray-7c8db5 text-sm">
                <div>Branch:</div>
                <div>{data.branchName}</div>
            </div>
            {!isFetching && commit && (
                <>
                    <div className="flex gap-3 text-gray-7c8db5 text-sm">
                        <div>Commit:</div>
                        <CopyClipboard
                            label={shortString(commit.name, 7, 0, '')}
                            componentProps={{
                                text: commit.name,
                            }}
                        />
                    </div>
                    <div className="flex gap-3 text-gray-7c8db5 text-sm">
                        <div>Commit at:</div>
                        <div>{getCommitTime(commit.committer).toLocaleString()}</div>
                    </div>
                    <div className="flex gap-3 text-gray-7c8db5 text-sm">
                        <div>Commit by:</div>
                        <Committer committer={commit.committer} />
                    </div>
                </>
            )}

            <h4 className="mt-10 mb-3 text-lg font-medium">Pull request diff</h4>
            {blobs.isFetching && <Loader>Loading commit diff...</Loader>}

            {blobs.items.map(
                ({ item, current, previous, showDiff, isFetching }, index) => (
                    <div key={index} className="my-5">
                        <BlobDiffPreview
                            filename={item.treepath}
                            modified={current}
                            original={previous}
                            isDiffLoaded={showDiff}
                            isDiffFetching={isFetching}
                            getDiff={() => blobs.getDiff(index)}
                        />
                    </div>
                ),
            )}
        </div>
    )
}

export { RepoPullRequestEvent }
