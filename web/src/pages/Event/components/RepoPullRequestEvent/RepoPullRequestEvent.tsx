import { getCommitTime, TSmvEvent, TTaskDetails, usePullRequestCommit } from 'react-gosh'
import BlobDiffPreview from '../../../../components/Blob/DiffPreview'
import CopyClipboard from '../../../../components/CopyClipboard'
import { shortString } from 'react-gosh'
import Loader from '../../../../components/Loader'
import { Commiter } from '../../../../components/Commit'
import { useBlobComments } from '../../../../hooks/codecomment.hooks'
import { useOutletContext } from 'react-router-dom'
import { TDaoLayoutOutletContext } from '../../../../v1/pages/DaoLayout'
import { useEffect, useState } from 'react'

type TRepoPullRequestEventProps = {
    className?: string
    daoName: string
    event: TSmvEvent
}

const RepoPullRequestEvent = (props: TRepoPullRequestEventProps) => {
    const { className, daoName, event } = props
    const { data } = event
    const { dao } = useOutletContext<TDaoLayoutOutletContext>()
    const [task, setTask] = useState<TTaskDetails | null>(null)
    const { isFetching, commit, blobs } = usePullRequestCommit(
        daoName!,
        data.repoName,
        data.commit,
    )
    const { resetThreads } = useBlobComments({
        dao: dao.adapter,
        filename: '',
    })

    useEffect(() => {
        const _getTask = async () => {
            if (!data.task) {
                return
            }
            try {
                const _task = await dao.adapter.getTask({ address: data.task.task })
                setTask(_task)
            } catch (e: any) {
                console.error(e.message)
                setTask(null)
            }
        }

        if (dao.details.version >= '2.0.0') {
            _getTask()
        }
    }, [data.task, dao.details.version])

    useEffect(() => {
        return () => {
            resetThreads()
        }
    }, [])

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
                        <Commiter committer={commit.committer} />
                    </div>
                </>
            )}
            {task && (
                <div className="flex gap-3 text-gray-7c8db5 text-sm">
                    <div>Task:</div>
                    <div>{task.name}</div>
                </div>
            )}

            <h4 className="mt-10 mb-3 text-lg font-medium">Pull request diff</h4>
            {blobs.isFetching && <Loader>Loading commit diff...</Loader>}

            {blobs.items.map(
                ({ item, current, previous, showDiff, isFetching }, index) => (
                    <div key={index} className="my-5 relative">
                        <BlobDiffPreview
                            commentsOn={dao.details.version >= '5.0.0'}
                            filename={item.treepath}
                            modified={current}
                            original={previous}
                            commit={commit!}
                            commentsObject={event.address}
                            snapshotAddress={item.address}
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
