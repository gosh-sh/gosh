import { Link, useNavigate, useOutletContext, useParams } from 'react-router-dom'
import CopyClipboard from '../../components/CopyClipboard'
import Spinner from '../../components/Spinner'
import { getCommitTime, useBranches, useCommitList } from 'react-gosh'
import { shortString } from 'react-gosh'
import { TRepoLayoutOutletContext } from '../RepoLayout'
import { BranchSelect } from '../../components/Branches'
import { Commiter } from '../../components/Commit'
import Loader from '../../components/Loader'

const CommitsPage = () => {
  const navigate = useNavigate()
  const { daoName, repoName, branchName = 'main' } = useParams()
  const { repository } = useOutletContext<TRepoLayoutOutletContext>()
  const { branches, branch } = useBranches(repository.adapter, branchName)
  const { isFetching, isEmpty, items, hasMore, getMore } = useCommitList(
    daoName!,
    repository.adapter,
    branchName,
    10,
  )

  return (
    <>
      <BranchSelect
        branch={branch}
        branches={branches}
        onChange={(selected) => {
          if (selected) {
            navigate(`/o/${daoName}/r/${repoName}/commits/${selected.name}`)
          }
        }}
      />

      <div className="mt-5 divide-y divide-gray-e6edff">
        {isFetching && isEmpty && <Loader className="text-sm">Loading commits...</Loader>}

        {!isFetching && isEmpty && (
          <div className="text-sm text-gray-7c8db5 text-center">
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
              <div className="mt-2 flex flex-wrap gap-x-4 text-gray-7c8db5 text-xs">
                <div className="flex items-center">
                  <span className="mr-2 text-gray-7c8db5">Commit by</span>
                  <Commiter committer={commit.committer} />
                </div>
                <div>
                  <span className="mr-2 text-gray-7c8db5">at</span>
                  {getCommitTime(commit.committer || '').toLocaleString()}
                </div>
              </div>
            </div>

            <div className="flex border border-gray-e6edff rounded items-center text-gray-7c8db5">
              <Link
                className="px-2 py-1 font-medium font-mono text-xs hover:underline hover:text-black"
                to={`/o/${daoName}/r/${repoName}/commits/${branchName}/${commit.name}`}
              >
                {shortString(commit.name || '', 7, 0, '')}
              </Link>
              <CopyClipboard
                componentProps={{
                  text: commit.name || '',
                }}
                iconContainerClassName="px-2 border-l border-gray-e6edff hover:text-black"
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
    </>
  )
}

export default CommitsPage
