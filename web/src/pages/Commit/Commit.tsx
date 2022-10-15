import { Link, useParams } from 'react-router-dom'
import { getCommitTime, useCommit } from 'react-gosh'
import CopyClipboard from '../../components/CopyClipboard'
import { shortString } from 'react-gosh'
import Spinner from '../../components/Spinner'
import CommitBlobs from './CommitBlobs'

const CommitPage = () => {
    const { daoName, repoName, branchName, commitName } = useParams()
    const { isFetching, commit, blobs } = useCommit(daoName!, repoName!, commitName!, 0)

    const renderCommitter = (committer: string) => {
        const [username, email] = committer.split(' ')
        return (
            <CopyClipboard
                label={username}
                componentProps={{
                    text: email,
                }}
            />
        )
    }

    return (
        <div className="bordered-block px-7 py-8">
            {isFetching && (
                <div className="text-gray-606060 text-sm">
                    <Spinner className="mr-3" />
                    Loading commit...
                </div>
            )}

            {!isFetching && commit && (
                <>
                    <div>
                        <div className="font-medium py-2">{commit.title}</div>

                        {commit.message && (
                            <pre className="mb-3 text-gray-050a15/65 text-sm">
                                {commit.message}
                            </pre>
                        )}

                        <div className="flex flex-wrap border-t gap-x-6 py-1 text-gray-050a15/75 text-xs">
                            <div className="flex items-center">
                                <span className="mr-2 text-gray-050a15/65">
                                    Commit by
                                </span>
                                {renderCommitter(commit.committer)}
                            </div>
                            <div>
                                <span className="mr-2 text-gray-050a15/65">at</span>
                                {getCommitTime(commit.committer).toLocaleString()}
                            </div>
                            <div className="grow flex items-center justify-start sm:justify-end">
                                <span className="mr-2 text-gray-050a15/65">commit</span>
                                <CopyClipboard
                                    label={shortString(commit.name, 10, 10)}
                                    componentProps={{
                                        text: commit.name,
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    {commit.branch !== branchName && (
                        <div className="mt-4">
                            <p className="text-sm">
                                This commit was created in branch <b>{commit.branch}</b>
                            </p>
                            <p className="text-sm">
                                To see the commit diff follow this
                                <Link
                                    to={`/o/${daoName}/r/${repoName}/commits/${commit.branch}/${commit.name}`}
                                    className="ml-1 underline"
                                >
                                    link
                                </Link>
                            </p>
                        </div>
                    )}

                    {commit.branch === branchName && (
                        <CommitBlobs blobs={blobs} className="mt-4" />
                    )}
                </>
            )}
        </div>
    )
}

export default CommitPage
