import { useEffect, useState } from 'react'
import { Link, useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { useRecoilValue } from 'recoil'
import BranchSelect from '../../components/BranchSelect'
import CopyClipboard from '../../components/CopyClipboard'
import Spinner from '../../components/Spinner'
import { getCommit, getCommitTime, ZERO_COMMIT } from 'react-gosh'
import { useGoshRepoBranches } from '../../hooks/gosh.hooks'
import { goshCurrBranchSelector } from '../../store/gosh.state'
import { TGoshCommit } from 'react-gosh'
import { shortString } from 'react-gosh'
import { TRepoLayoutOutletContext } from '../RepoLayout'
import { IGoshRepository } from 'react-gosh/dist/gosh/interfaces'

const CommitsPage = () => {
    const { repo } = useOutletContext<TRepoLayoutOutletContext>()
    const { daoName, repoName, branchName = 'main' } = useParams()
    const { branches, updateBranch } = useGoshRepoBranches(repo)
    const branch = useRecoilValue(goshCurrBranchSelector(branchName))
    const navigate = useNavigate()
    const [commits, setCommits] = useState<{
        list: TGoshCommit[]
        isFetching: boolean
        next?: string
    }>({
        list: [],
        isFetching: true,
    })

    const renderCommitter = (committer: string) => {
        const [pubkey] = committer.split(' ')
        return (
            <CopyClipboard
                label={shortString(pubkey)}
                componentProps={{
                    text: pubkey,
                }}
            />
        )
    }

    const getCommits = async (repo: IGoshRepository, next?: string) => {
        setCommits((curr) => ({ ...curr, isFetching: true }))

        const list: TGoshCommit[] = []
        let count = 0
        while (count < 5) {
            if (!next) break

            const commitData = await getCommit(repo, next)
            if (commitData.name !== ZERO_COMMIT) list.push(commitData)

            next = commitData.parents[0] || ''
            count += 1
        }
        setCommits((curr) => ({
            list: [...curr.list, ...list],
            isFetching: false,
            next,
        }))
    }

    useEffect(() => {
        const initCommits = async () => {
            setCommits({ list: [], isFetching: true })
            getCommits(repo, branch?.commitAddr)
        }

        if (repo && branch?.commitAddr) initCommits()
    }, [repo, branch?.commitAddr])

    useEffect(() => {
        updateBranch(branchName)
    }, [branchName, updateBranch])

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
                {commits.isFetching && !commits.list.length && (
                    <div className="text-sm text-gray-606060">
                        <Spinner className="mr-3" />
                        Loading commits...
                    </div>
                )}

                {!commits.isFetching && !commits.list.length && (
                    <div className="text-sm text-gray-606060 text-center">
                        There are no commits yet
                    </div>
                )}

                {commits.list.map((commit, index) => (
                    <div
                        key={index}
                        className="flex flex-wrap py-3 justify-between items-center gap-y-3"
                    >
                        <div>
                            <Link
                                className="hover:underline"
                                to={`/o/${daoName}/r/${repoName}/commits/${branchName}/${commit.name}`}
                            >
                                {commit.content.title}
                            </Link>
                            <div className="mt-2 flex flex-wrap gap-x-4 text-gray-050a15/75 text-xs">
                                <div className="flex items-center">
                                    <span className="mr-2 text-gray-050a15/65">
                                        Commit by
                                    </span>
                                    {renderCommitter(commit.content.committer || '')}
                                </div>
                                <div>
                                    <span className="mr-2 text-gray-050a15/65">at</span>
                                    {getCommitTime(
                                        commit.content.committer || '',
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

            {commits.next && (
                <div className="text-center mt-3">
                    <button
                        className="btn btn--body font-medium px-4 py-2 w-full sm:w-auto"
                        type="button"
                        disabled={commits.isFetching}
                        onClick={() => getCommits(repo, commits.next)}
                    >
                        {commits.isFetching && <Spinner className="mr-2" />}
                        Load more
                    </button>
                </div>
            )}
        </div>
    )
}

export default CommitsPage
