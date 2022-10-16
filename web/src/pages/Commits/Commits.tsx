import { Link, useNavigate, useOutletContext, useParams } from 'react-router-dom'
import BranchSelect from '../../components/BranchSelect'
import CopyClipboard from '../../components/CopyClipboard'
import Spinner from '../../components/Spinner'
import { getCommitTime, useBranches, useCommitList } from 'react-gosh'
import { shortString } from 'react-gosh'
import { TRepoLayoutOutletContext } from '../RepoLayout'

const CommitsPage = () => {
    const navigate = useNavigate()
    const { daoName, repoName, branchName = 'main' } = useParams()
    const { repo } = useOutletContext<TRepoLayoutOutletContext>()
    const { branches, branch } = useBranches(repo, branchName)
    const { isFetching, isEmpty, items, hasMore, getMore } = useCommitList(
        daoName!,
        repo,
        branchName,
    )

    const renderCommitter = (committer: string) => {
        const [username, email] = committer.split(' ')
        return (
            <CopyClipboard
                label={shortString(username)}
                componentProps={{
                    text: email,
                }}
            />
        )
    }

    return (
        <div className="bordered-block px-7 py-8">
            <BranchSelect
                branch={branch}
                branches={branches}
                onChange={(selected) => {
                    if (selected) {
                        navigate(`/o/${daoName}/r/${repoName}/commits/${selected.name}`)
                    }
                }}
            />

            <div className="mt-5 divide-y divide-gray-c4c4c4">
                {isFetching && isEmpty && (
                    <div className="text-sm text-gray-606060">
                        <Spinner className="mr-3" />
                        Loading commits...
                    </div>
                )}

                {!isFetching && isEmpty && (
                    <div className="text-sm text-gray-606060 text-center">
                        There are no commits yet
                    </div>
                )}

                {items.map((commit, index) => (
                    <div
                        key={index}
                        className="flex flex-wrap py-3 justify-between items-center gap-y-3"
                    >
                        <div>
                            <Link
                                className="hover:underline"
                                to={`/o/${daoName}/r/${repoName}/commits/${branchName}/${commit.name}`}
                            >
                                {commit.title}
                            </Link>
                            <div className="mt-2 flex flex-wrap gap-x-4 text-gray-050a15/75 text-xs">
                                <div className="flex items-center">
                                    <span className="mr-2 text-gray-050a15/65">
                                        Commit by
                                    </span>
                                    {renderCommitter(commit.committer || '')}
                                </div>
                                <div>
                                    <span className="mr-2 text-gray-050a15/65">at</span>
                                    {getCommitTime(
                                        commit.committer || '',
                                    ).toLocaleString()}
                                </div>
                            </div>
                        </div>

                        <div className="flex border border-gray-0a1124/65 rounded items-center text-gray-0a1124/65">
                            <Link
                                className="px-2 py-1 font-medium font-mono text-xs hover:underline hover:text-gray-0a1124"
                                to={`/o/${daoName}/r/${repoName}/commits/${branchName}/${commit.name}`}
                            >
                                {shortString(commit.name || '', 7, 0, '')}
                            </Link>
                            <CopyClipboard
                                componentProps={{
                                    text: commit.name || '',
                                }}
                                iconContainerClassName="px-2 border-l border-gray-0a1124 hover:text-gray-0a1124"
                                iconProps={{
                                    size: 'sm',
                                }}
                            />
                        </div>
                    </div>
                ))}
            </div>

            {hasMore && (
                <div className="text-center mt-3">
                    <button
                        className="btn btn--body font-medium px-4 py-2 w-full sm:w-auto"
                        type="button"
                        disabled={isFetching}
                        onClick={getMore}
                    >
                        {isFetching && <Spinner className="mr-2" />}
                        Load more
                    </button>
                </div>
            )}
        </div>
    )
}

export default CommitsPage
